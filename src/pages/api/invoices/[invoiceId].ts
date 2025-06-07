
// src/pages/api/invoices/[invoiceId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Invoice, InvoiceLineItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// A copy for local manipulation if needed by the mock logic
let staticInvoicesList: Invoice[] = [
    {
        id: 'static-inv-1', invoiceNumber: 'INV-2024-0001', companyName: 'Mock Company', customerName: 'Mock Customer A',
        invoiceDate: new Date(2024, 5, 10), dueDate: new Date(2024, 6, 10),
        lineItems: [{ id: 'li-1', description: 'Mock Service 1', quantity: 1, unitPrice: 100, total: 100, customColumnValue: 'Some detail' }],
        customColumnHeader: 'Extra Info',
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

    const staticInvoiceIndex = staticInvoicesList.findIndex(inv => inv.id === invoiceId);
    const staticInvoice = staticInvoiceIndex !== -1 ? staticInvoicesList[staticInvoiceIndex] : null;

    if (req.method === 'GET') {
      if (staticInvoice) {
        return res.status(200).json({
            ...staticInvoice,
            invoiceDate: staticInvoice.invoiceDate.toISOString(),
            dueDate: staticInvoice.dueDate.toISOString(),
            lineItems: staticInvoice.lineItems.map(li => ({...li, customColumnValue: li.customColumnValue || ''})),
            customColumnHeader: staticInvoice.customColumnHeader || '',
        });
      }
      return res.status(404).json({ message: `Invoice ${invoiceId} not found (mocked).` });
    }
    if (req.method === 'PUT') {
      const updatePayload = req.body as Partial<Invoice>; // Can be just { status: 'Paid' } or a full update

      if (staticInvoice) { // Invoice found in the hardcoded list
        const originalInvoice = staticInvoice; // staticInvoice is already the found one
        const updatedInvoice: Invoice = {
          ...originalInvoice,
          ...updatePayload,
          id: originalInvoice.id, // Ensure ID is not overwritten by payload if not present
          invoiceNumber: updatePayload.invoiceNumber || originalInvoice.invoiceNumber, // Ensure invoiceNumber is not overwritten if not in payload
          invoiceDate: updatePayload.invoiceDate ? new Date(updatePayload.invoiceDate) : originalInvoice.invoiceDate,
          dueDate: updatePayload.dueDate ? new Date(updatePayload.dueDate) : originalInvoice.dueDate,
        };

        const finalLineItems = (updatePayload.lineItems || originalInvoice.lineItems).map(li => ({ ...li, id: li.id || uuidv4(), total: (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0) }));
        const subTotal = finalLineItems.reduce((sum, item) => sum + item.total, 0);
        const taxRate = updatePayload.taxRate !== undefined ? Number(updatePayload.taxRate) : originalInvoice.taxRate;
        updatedInvoice.lineItems = finalLineItems;
        updatedInvoice.subTotal = subTotal;
        updatedInvoice.taxRate = taxRate;
        updatedInvoice.taxAmount = subTotal * taxRate;
        updatedInvoice.grandTotal = subTotal + updatedInvoice.taxAmount;
        
        staticInvoicesList[staticInvoiceIndex] = updatedInvoice; // Update the local static list
        return res.status(200).json({
          ...updatedInvoice,
          invoiceDate: updatedInvoice.invoiceDate.toISOString(),
          dueDate: updatedInvoice.dueDate.toISOString(),
        });
      } else if (invoiceId.startsWith('static-inv-')) {
        // Invoice NOT in hardcoded list, but looks like a dynamically created mock ID.
        // This invoice was likely created by POST /api/invoices (which has its own static list).
        // For a PUT, we simulate a successful update by constructing a plausible response.
        console.warn(`Mock PUT: Invoice ${invoiceId} not in local static list of [invoiceId].ts, but recognized as mock. Simulating update.`);
        
        const simulatedBase: Invoice = {
            id: invoiceId,
            invoiceNumber: `INV-MOCK-${invoiceId.slice(-4)}`, // Generate a plausible invoice number
            companyName: 'Dynamic Mock Company',
            customerName: 'Dynamic Mock Customer',
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default due 30 days
            lineItems: [{ id: uuidv4(), description: 'Dynamic Mock Item', quantity: 1, unitPrice: 100, total: 100 }],
            taxRate: 0.1,
            status: 'Draft',
            subTotal: 100,
            taxAmount: 10,
            grandTotal: 110,
        };

        const mergedInvoice: Invoice = {
          ...simulatedBase, // Provide defaults for fields not in updatePayload
          ...updatePayload, // Apply the actual update data (e.g., new status)
          id: invoiceId, // Crucially, keep the ID from the request
          invoiceDate: updatePayload.invoiceDate ? new Date(updatePayload.invoiceDate) : simulatedBase.invoiceDate,
          dueDate: updatePayload.dueDate ? new Date(updatePayload.dueDate) : simulatedBase.dueDate,
        };

        // Recalculate totals based on potentially updated lineItems or taxRate from updatePayload
        const finalLineItems = (updatePayload.lineItems || mergedInvoice.lineItems).map(li => ({ ...li, id: li.id || uuidv4(), total: (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0) }));
        const subTotal = finalLineItems.reduce((sum, item) => sum + item.total, 0);
        const taxRate = updatePayload.taxRate !== undefined ? Number(updatePayload.taxRate) : mergedInvoice.taxRate;
        mergedInvoice.lineItems = finalLineItems;
        mergedInvoice.subTotal = subTotal;
        mergedInvoice.taxRate = taxRate;
        mergedInvoice.taxAmount = subTotal * taxRate;
        mergedInvoice.grandTotal = subTotal + mergedInvoice.taxAmount;

        return res.status(200).json({
          ...mergedInvoice,
          invoiceDate: mergedInvoice.invoiceDate.toISOString(),
          dueDate: mergedInvoice.dueDate.toISOString(),
        });
      }
      // If not in hardcoded list AND not a dynamic mock pattern, then it's truly not found
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
        // This case should ideally be caught by currentInvoice check above, but good for safety
        return res.status(404).json({ message: 'Invoice not found during update operation.' });
      }
      const updatedInvoiceDoc = await invoicesCollection.findOne({ _id: objectId });
       if (!updatedInvoiceDoc) {
          return res.status(404).json({ message: 'Updated invoice not found after update operation.'}); // Should not happen if update succeeded
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
