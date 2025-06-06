
// src/pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("**************************************************************************************");
    console.warn("WARNING: MONGODB_URI is not configured. Employee data operations will be limited/mocked.");
    console.warn("Please set MONGODB_URI in your .env.local file and restart the server for real data.");
    console.warn("**************************************************************************************");

    if (req.method === 'GET') {
      const mockEmployees: Employee[] = []; // Return empty array
      return res.status(200).json(mockEmployees);
    }
    if (req.method === 'POST') {
      return res.status(500).json({ message: "MongoDB URI is not configured. Cannot create new employee." });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB config` });
  }

  // If URI is configured, proceed with actual database logic
  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    // Ensure you have a database named "bizViewApp" or change this to your actual database name
    const db = client.db("bizViewApp"); 
    const employeesCollection = db.collection<Omit<Employee, 'id'> & { _id?: ObjectId }>('employees');

    if (req.method === 'GET') {
      const employees = await employeesCollection.find({}).sort({ name: 1 }).toArray();
      // Ensure documents field is always an array, even if null/undefined in DB
      res.status(200).json(employees.map(emp => ({ ...emp, id: emp._id!.toString(), documents: emp.documents || [] })));
    } else if (req.method === 'POST') {
      const { name, email } = req.body as Omit<Employee, 'id' | 'documents'>;
      if (!name) {
        return res.status(400).json({ message: 'Employee name is required.' });
      }
      const newEmployeeData = {
        name,
        email: email || undefined, // Store undefined if email is empty string or not provided
        documents: [] as EmployeeDocument[], // Initialize with an empty documents array
        createdAt: new Date(),
      };
      const result = await employeesCollection.insertOne(newEmployeeData);
      // Return the full employee object including the generated _id as id
      const createdEmployee = { ...newEmployeeData, id: result.insertedId.toString() };
      res.status(201).json(createdEmployee);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error (employees/index.ts):', error);
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
