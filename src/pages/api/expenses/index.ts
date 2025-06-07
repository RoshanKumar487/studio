
// src/pages/api/expenses/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { ExpenseEntry } from '@/lib/types';

// Mock data if MongoDB URI is not set
const staticExpenses: ExpenseEntry[] = [
  { id: 'static-exp-1', date: new Date(2024, 6, 2), amount: 150, category: "Software", description: "Design tool (Mock)", submittedBy: "Admin", documentFileName: "receipt.pdf" },
  { id: 'static-exp-2', date: new Date(2024, 6, 7), amount: 80, category: "Marketing", description: "Online ads (Mock)", submittedBy: "User X" },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const warningMessage = "MONGODB_URI is not configured. Expense data operations will be mocked. Please set MONGODB_URI in your .env.local file and restart the server for real data.";
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessage}`);
    console.warn("**************************************************************************************");

    if (req.method === 'GET') {
      return res.status(200).json(staticExpenses.map(e => ({
        ...e, 
        date: e.date.toISOString(),
        documentFileSize: e.documentFileSize || undefined, // ensure optional fields are handled
        documentFileType: e.documentFileType || undefined,
    })));
    }
    if (req.method === 'POST') {
      const { date, amount, category, description, submittedBy, documentFileName, documentFileType, documentFileSize } = req.body as Omit<ExpenseEntry, 'id'>;
      if (!date || amount == null || !category || !description) {
        return res.status(400).json({ message: 'Missing required fields for mock expense entry.' });
      }
      const newMockExpense: ExpenseEntry = {
        id: `static-exp-${Date.now()}`,
        date: new Date(date),
        amount: Number(amount),
        category,
        description,
        submittedBy: submittedBy || undefined,
        documentFileName: documentFileName || undefined,
        documentFileType: documentFileType || undefined,
        documentFileSize: documentFileSize || undefined,
      };
      // staticExpenses.push(newMockExpense); // Persist for mock session if desired
      return res.status(201).json({...newMockExpense, date: newMockExpense.date.toISOString()});
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB config` });
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
