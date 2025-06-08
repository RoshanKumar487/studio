
// src/pages/api/revenue/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { RevenueEntry } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const criticalMessage = "CRITICAL: MONGODB_URI is not configured. Revenue data operations are disabled.";
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
    const revenueCollection = db.collection<Omit<RevenueEntry, 'id'> & { _id?: ObjectId }>('revenueEntries');

    if (req.method === 'GET') {
      const entriesFromDb = await revenueCollection.find({}).sort({ date: -1 }).toArray();
      const entriesResult: RevenueEntry[] = entriesFromDb.map(entry => ({ 
        ...entry, 
        id: entry._id!.toString(),
        date: new Date(entry.date),
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
