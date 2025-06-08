
// src/pages/api/invoices/[invoiceId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Invoice } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;
  const { invoiceId } = req.query;

  if (typeof invoiceId !== 'string') {
    return res.status(400).json({ message: 'Invalid invoice ID format (query param).' });
  }

  if (!uri) {
    const criticalMessage = `CRITICAL: MONGODB_URI is not configured. Operations for invoice ${invoiceId} are disabled.`;
    console.error("**************************************************************************************");
    console.error(criticalMessage);
    console.error(`Attempted operation: ${req.method} on ${req.url}`);
    console.error("**************************************************************************************");
    return res.status(503).json({ 
        message: "Service Unavailable: Database is not configured. Please set the MONGODB_URI environment variable.",
        errorContext: `Operation: ${req.method} on ${req.url}` 
    });
  }

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
          lineItems: invoice.lineItems.map(li => ({...li, customColumnValue: li.customColumnValue || undefined})),
          customColumnHeader: invoice.customColumnHeader || undefined,
        } as Invoice);
      } else {
        res.status(404).json({ message: 'Invoice not found' });
      }
    } else if (req.method === 'PUT') {
      const updateData = req.body as Partial<Omit<Invoice, 'id' | 'invoiceNumber'>>;
      
      const { lineItems, taxRate: newTaxRate, customColumnHeader, ...otherUpdates } = updateData;

      const updateFields: any = { ...otherUpdates };

      if (otherUpdates.invoiceDate) updateFields.invoiceDate = new Date(otherUpdates.invoiceDate);
      if (otherUpdates.dueDate) updateFields.dueDate = new Date(otherUpdates.dueDate);
      
      if (customColumnHeader === '') {
        updateFields.customColumnHeader = undefined;
      } else if (customColumnHeader !== undefined) {
        updateFields.customColumnHeader = customColumnHeader;
      }

      const currentInvoice = await invoicesCollection.findOne({ _id: objectId });
      if (!currentInvoice) {
        return res.status(404).json({ message: 'Invoice not found for update.' });
      }

      const finalLineItems = (lineItems || currentInvoice.lineItems).map((item: any) => ({
        id: item.id || uuidv4(),
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        customColumnValue: item.customColumnValue || undefined,
      }));
      updateFields.lineItems = finalLineItems;

      const subTotal = finalLineItems.reduce((sum, item) => sum + item.total, 0);
      const numericTaxRate = newTaxRate !== undefined ? Number(newTaxRate) : currentInvoice.taxRate;
      
      updateFields.subTotal = subTotal;
      updateFields.taxRate = numericTaxRate;
      updateFields.taxAmount = subTotal * numericTaxRate;
      updateFields.grandTotal = subTotal + (subTotal * numericTaxRate);
      
      updateFields.updatedAt = new Date();

      const updateResult = await invoicesCollection.updateOne(
        { _id: objectId },
        { $set: updateFields }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ message: 'Invoice not found during update operation.' });
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
          lineItems: updatedInvoiceDoc.lineItems.map(li => ({...li, customColumnValue: li.customColumnValue || undefined})),
          customColumnHeader: updatedInvoiceDoc.customColumnHeader || undefined,
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
