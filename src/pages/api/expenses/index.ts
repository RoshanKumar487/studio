
// src/pages/api/expenses/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { ExpenseEntry } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const criticalMessage = "CRITICAL: MONGODB_URI is not configured. Expense data operations are disabled.";
    console.error("**************************************************************************************");
    console.error(criticalMessage);
    console.error(`Attempted operation: ${req.method} on ${req.url}`);
    console.error("**************************************************************************************");
    return res.status(503).json({ 
        message: "Service Unavailable: Database is not configured. Please set the MONGODB_URI environment variable.",
        errorContext: `Operation: ${req.method} on ${req.url}` 
    });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    const db = client.db("flowHQApp"); 
    const expensesCollection = db.collection<Omit<ExpenseEntry, 'id'> & { _id?: ObjectId }>('expenseEntries');

    if (req.method === 'GET') {
      const entriesFromDb = await expensesCollection.find({}).sort({ date: -1 }).toArray();
      const entriesResult: ExpenseEntry[] = entriesFromDb.map(entry => ({ 
        ...entry, 
        id: entry._id!.toString(),
        date: new Date(entry.date),
        documentFileName: entry.documentFileName || undefined,
        documentFileType: entry.documentFileType || undefined,
        documentFileSize: entry.documentFileSize || undefined,
        submittedBy: entry.submittedBy || undefined,
      }));
      res.status(200).json(entriesResult);
    } else if (req.method === 'POST') {
      const { date, amount, category, description, submittedBy, documentFileName, documentFileType, documentFileSize } = req.body as Omit<ExpenseEntry, 'id'>;
      if (!date || amount == null || !category || !description) {
        return res.status(400).json({ message: 'Date, amount, category, and description are required.' });
      }
      const newEntryData: Omit<ExpenseEntry, 'id'> & { createdAt: Date } = {
        date: new Date(date),
        amount: Number(amount),
        category,
        description,
        submittedBy: submittedBy || undefined,
        documentFileName: documentFileName || undefined,
        documentFileType: documentFileType || undefined,
        documentFileSize: documentFileSize || undefined,
        createdAt: new Date(),
      };
      const result = await expensesCollection.insertOne(newEntryData);
      const createdEntry: ExpenseEntry = { 
        ...newEntryData, 
        id: result.insertedId.toString(),
      };
      res.status(201).json(createdEntry);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error (expenses/index.ts):', error);
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
