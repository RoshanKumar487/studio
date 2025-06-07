
// src/pages/api/invoices/[invoiceId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Invoice } from '@/lib/types';

// Use the staticInvoices from the index API for mocking if needed.
// This is a simplified approach; in a real app, you might share mock data logic.
let staticInvoicesList: Invoice[] = [ // A copy for local manipulation
    { 
        id: 'static-inv-1', invoiceNumber: 'INV-2024-0001', companyName: 'Mock Company', customerName: 'Mock Customer A', 
        invoiceDate: new Date(2024, 5, 10), dueDate: new Date(2024, 6, 10),
        lineItems: [{ id: 'li-1', description: 'Mock Service 1', quantity: 1, unitPrice: 100, total: 100 }],
        subTotal: 100, taxRate: 0.1, taxAmount: 10, grandTotal: 110, status: 'Draft'
    },
];


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;
  const { invoiceId } = req.query;

  if (typeof invoiceId !== 'string') {
    return res.status(400).json({ message: 'Invalid invoice ID format.' });
  }

  if (!uri) {
    const warningMessage = `MONGODB_URI is not configured. Operations for invoice ${invoiceId} will be mocked.`;
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessage}`);
    console.warn("**************************************************************************************");

    const staticInvoice = staticInvoicesList.find(inv => inv.id === invoiceId);

    if (req.method === 'GET') {
      if (staticInvoice) {
        return res.status(200).json({
            ...staticInvoice,
            invoiceDate: staticInvoice.invoiceDate.toISOString(),
            dueDate: staticInvoice.dueDate.toISOString(),
        });
      }
      return res.status(404).json({ message: `Invoice ${invoiceId} not found (mocked).` });
    }
    if (req.method === 'PUT') {
      if (staticInvoice) {
        const { status } = req.body as Partial<Pick<Invoice, 'status'>>;
        if (status && ['Draft', 'Sent', 'Paid', 'Overdue'].includes(status)) {
          staticInvoice.status = status;
           staticInvoicesList = staticInvoicesList.map(inv => inv.id === invoiceId ? staticInvoice : inv);
          return res.status(200).json({
              ...staticInvoice,
              invoiceDate: staticInvoice.invoiceDate.toISOString(),
              dueDate: staticInvoice.dueDate.toISOString(),
          });
        }
        return res.status(400).json({ message: 'Invalid status for mock update.' });
      }
      return res.status(404).json({ message: `Invoice ${invoiceId} not found for mock update.` });
    }
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB config for invoice ${invoiceId}` });
  }

  // Database connected logic
  if (!ObjectId.isValid(invoiceId)) {
    return res.status(400).json({ message: 'Invalid invoice ID format for database query.' });
  }

  let client: MongoClient | null = null;
  try {
    const objectId = new ObjectId(invoiceId);
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    const db = client.db("flowHQApp");
    const invoicesCollection = db.collection<Omit<Invoice, 'id'> & { _id?: ObjectId }>('invoices');

    if (req.method === 'GET') {
      const invoice = await invoicesCollection.findOne({ _id: objectId });
      if (invoice) {
        res.status(200).json({ 
          ...invoice, 
          id: invoice._id!.toString(),
          invoiceDate: new Date(invoice.invoiceDate),
          dueDate: new Date(invoice.dueDate),
        } as Invoice);
      } else {
        res.status(404).json({ message: 'Invoice not found' });
      }
    } else if (req.method === 'PUT') {
      const { status } = req.body as Partial<Pick<Invoice, 'status'>>;
      if (!status || !['Draft', 'Sent', 'Paid', 'Overdue'].includes(status)) {
        return res.status(400).json({ message: 'A valid status (Draft, Sent, Paid, Overdue) is required.' });
      }

      const updateResult = await invoicesCollection.updateOne(
        { _id: objectId },
        { $set: { status: status, updatedAt: new Date() } }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ message: 'Invoice not found for update.' });
      }
      const updatedInvoiceDoc = await invoicesCollection.findOne({ _id: objectId });
       if (!updatedInvoiceDoc) {
          return res.status(404).json({ message: 'Updated invoice not found after update operation.'});
      }
      res.status(200).json({
          ...updatedInvoiceDoc,
          id: updatedInvoiceDoc._id!.toString(),
          invoiceDate: new Date(updatedInvoiceDoc.invoiceDate),
          dueDate: new Date(updatedInvoiceDoc.dueDate),
      } as Invoice);
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`API Error for invoice ${invoiceId}:`, error);
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
