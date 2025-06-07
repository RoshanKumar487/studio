
// src/pages/api/invoices/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { Invoice, InvoiceLineItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const getNextInvoiceNumberFromExisting = (existingInvoices: Invoice[], year: number): string => {
    const yearInvoices = existingInvoices.filter(inv => inv.invoiceNumber.startsWith(`INV-${year}`));
    const nextNum = yearInvoices.length + 1;
    return `INV-${year}-${String(nextNum).padStart(4, '0')}`;
};

// Mock data if MongoDB URI is not set
let staticInvoices: Invoice[] = [
    { 
        id: 'static-inv-1', invoiceNumber: 'INV-2024-0001', companyName: 'Mock Company', customerName: 'Mock Customer A', 
        invoiceDate: new Date(2024, 5, 10), dueDate: new Date(2024, 6, 10),
        lineItems: [{ id: uuidv4(), description: 'Mock Service 1', quantity: 1, unitPrice: 100, total: 100, customColumnValue: 'Mock custom data' }],
        customColumnHeader: 'Details',
        subTotal: 100, taxRate: 0.1, taxAmount: 10, grandTotal: 110, status: 'Draft'
    },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const warningMessage = "MONGODB_URI is not configured. Invoice data operations will be mocked. Please set MONGODB_URI in your .env.local file and restart the server for real data.";
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessage}`);
    console.warn("**************************************************************************************");

    if (req.method === 'GET') {
      return res.status(200).json(staticInvoices.map(inv => ({
          ...inv,
          invoiceDate: inv.invoiceDate.toISOString(),
          dueDate: inv.dueDate.toISOString(),
          lineItems: inv.lineItems.map(li => ({...li}))
      })));
    }
    if (req.method === 'POST') {
      const { companyName, customerName, invoiceDate, dueDate, lineItems, customColumnHeader, taxRate, status, employeeId, serviceProviderName, notes, companyAddress, customerAddress } = req.body as Omit<Invoice, 'id' | 'invoiceNumber' | 'subTotal' | 'taxAmount' | 'grandTotal'>;
      
      if (!companyName || !customerName || !invoiceDate || !dueDate || !lineItems || taxRate == null) {
        return res.status(400).json({ message: 'Missing required fields for mock invoice.' });
      }

      const currentYear = new Date(invoiceDate).getFullYear();
      const newInvoiceNumber = getNextInvoiceNumberFromExisting(staticInvoices, currentYear);

      const parsedLineItems: InvoiceLineItem[] = lineItems.map(item => ({
        ...item,
        id: item.id || uuidv4(),
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        customColumnValue: item.customColumnValue || undefined,
      }));
      const subTotal = parsedLineItems.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = subTotal * (Number(taxRate) || 0);
      const grandTotal = subTotal + taxAmount;

      const newMockInvoice: Invoice = {
        id: `static-inv-${Date.now()}`,
        invoiceNumber: newInvoiceNumber,
        companyName, companyAddress, customerName, customerAddress, notes,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        lineItems: parsedLineItems,
        customColumnHeader: customColumnHeader || undefined,
        taxRate: Number(taxRate),
        status: status || 'Draft',
        employeeId, serviceProviderName,
        subTotal, taxAmount, grandTotal,
      };
      staticInvoices.push(newMockInvoice); 
      return res.status(201).json({
          ...newMockInvoice,
          invoiceDate: newMockInvoice.invoiceDate.toISOString(),
          dueDate: newMockInvoice.dueDate.toISOString(),
      });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB config` });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    const db = client.db("flowHQApp");
    const invoicesCollection = db.collection<Omit<Invoice, 'id'> & { _id?: ObjectId }>('invoices');

    if (req.method === 'GET') {
      const dbInvoices = await invoicesCollection.find({}).sort({ invoiceDate: -1 }).toArray();
      const resultInvoices: Invoice[] = dbInvoices.map(inv => ({
        ...inv,
        id: inv._id!.toString(),
        invoiceDate: new Date(inv.invoiceDate),
        dueDate: new Date(inv.dueDate),
        lineItems: inv.lineItems.map(li => ({...li, id: li.id || uuidv4(), customColumnValue: li.customColumnValue || undefined})), 
        customColumnHeader: inv.customColumnHeader || undefined,
      }));
      res.status(200).json(resultInvoices);
    } else if (req.method === 'POST') {
      const { companyName, customerName, invoiceDate, dueDate, lineItems, customColumnHeader, taxRate, status, employeeId, serviceProviderName, notes, companyAddress, customerAddress } = req.body as Omit<Invoice, 'id' | 'subTotal' | 'taxAmount' | 'grandTotal'>;

      if (!companyName || !customerName || !invoiceDate || !dueDate || !lineItems || taxRate == null ) {
          return res.status(400).json({ message: 'Missing required fields for invoice.' });
      }
      
      const currentYear = new Date(invoiceDate).getFullYear();
      const existingDbInvoices = await invoicesCollection.find({ invoiceNumber: { $regex: `^INV-${currentYear}` } }).project({invoiceNumber: 1}).toArray();
      const nextInvNumStr = getNextInvoiceNumberFromExisting(existingDbInvoices.map(i => i as unknown as Invoice) , currentYear);


      const parsedLineItems: InvoiceLineItem[] = lineItems.map(item => ({
        ...item,
        id: item.id || uuidv4(), 
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        customColumnValue: item.customColumnValue || undefined,
      }));
      const subTotal = parsedLineItems.reduce((sum, item) => sum + item.total, 0);
      const numericTaxRate = Number(taxRate) || 0;
      const taxAmount = subTotal * numericTaxRate;
      const grandTotal = subTotal + taxAmount;

      const newInvoiceData = {
        invoiceNumber: nextInvNumStr,
        companyName, companyAddress, customerName, customerAddress, notes,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        lineItems: parsedLineItems,
        customColumnHeader: customColumnHeader || undefined,
        taxRate: numericTaxRate,
        subTotal, taxAmount, grandTotal,
        status: status || 'Draft',
        employeeId: employeeId || undefined,
        serviceProviderName: serviceProviderName || undefined,
        createdAt: new Date(),
      };

      const result = await invoicesCollection.insertOne(newInvoiceData);
      const createdInvoice: Invoice = {
        ...newInvoiceData,
        id: result.insertedId.toString(),
      };
      res.status(201).json(createdInvoice);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error (invoices/index.ts):', error);
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
