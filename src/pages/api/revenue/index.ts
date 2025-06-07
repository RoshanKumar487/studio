
// src/pages/api/revenue/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { RevenueEntry } from '@/lib/types';

// Mock data if MongoDB URI is not set
const staticRevenue: RevenueEntry[] = [
  { id: 'static-rev-1', date: new Date(2024, 6, 1), amount: 1200, description: "Web design project (Mock)" },
  { id: 'static-rev-2', date: new Date(2024, 6, 5), amount: 750, description: "Consulting services (Mock)" },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const warningMessage = "MONGODB_URI is not configured. Revenue data operations will be mocked. Please set MONGODB_URI in your .env.local file and restart the server for real data.";
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessage}`);
    console.warn("**************************************************************************************");

    if (req.method === 'GET') {
      return res.status(200).json(staticRevenue.map(r => ({...r, date: r.date.toISOString() })));
    }
    if (req.method === 'POST') {
      const { date, amount, description } = req.body as Omit<RevenueEntry, 'id'>;
      if (!date || amount == null || !description) {
        return res.status(400).json({ message: 'Missing required fields for mock revenue entry.' });
      }
      const newMockRevenue: RevenueEntry = {
        id: `static-rev-${Date.now()}`,
        date: new Date(date),
        amount: Number(amount),
        description,
      };
      return res.status(201).json({...newMockRevenue, date: newMockRevenue.date.toISOString() });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB config` });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    const db = client.db("flowHQApp"); 
    const revenueCollection = db.collection<Omit<RevenueEntry, 'id'> & { _id?: ObjectId }>('revenueEntries');

    if (req.method === 'GET') {
      const entriesFromDb = await revenueCollection.find({}).sort({ date: -1 }).toArray();
      const entriesResult: RevenueEntry[] = entriesFromDb.map(entry => ({ 
        ...entry, 
        id: entry._id!.toString(),
        date: new Date(entry.date), // Ensure date is a Date object
      }));
      res.status(200).json(entriesResult);
    } else if (req.method === 'POST') {
      const { date, amount, description } = req.body as Omit<RevenueEntry, 'id'>;
      if (!date || amount == null || !description) {
        return res.status(400).json({ message: 'Date, amount, and description are required.' });
      }
      const newEntryData = {
        date: new Date(date),
        amount: Number(amount),
        description,
        createdAt: new Date(),
      };
      const result = await revenueCollection.insertOne(newEntryData);
      const createdEntry: RevenueEntry = { 
        ...newEntryData, 
        id: result.insertedId.toString(),
      };
      res.status(201).json(createdEntry);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error (revenue/index.ts):', error);
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
