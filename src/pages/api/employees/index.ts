
// src/pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const warningMessage = "MONGODB_URI is not configured. Employee data operations will be limited/mocked. Please set MONGODB_URI in your .env.local file and restart the server for real data.";
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessage}`);
    console.warn("**************************************************************************************");

    if (req.method === 'GET') {
      const mockEmployees: Employee[] = []; 
      return res.status(200).json(mockEmployees);
    }
    if (req.method === 'POST') {
      return res.status(500).json({ message: "MongoDB URI is not configured. Cannot create new employee." });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB config` });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    const db = client.db("bizViewApp"); 
    const employeesCollection = db.collection<Omit<Employee, 'id'> & { _id?: ObjectId }>('employees');

    if (req.method === 'GET') {
      const employeesFromDb = await employeesCollection.find({}).sort({ name: 1 }).toArray();
      const employees = employeesFromDb.map(emp => ({ 
        ...emp, 
        id: emp._id!.toString(), 
        documents: emp.documents || [],
        startDate: emp.startDate ? new Date(emp.startDate) : null,
      }));
      res.status(200).json(employees);
    } else if (req.method === 'POST') {
      const { name, email, jobTitle, startDate, employmentType } = req.body as Omit<Employee, 'id' | 'documents'>;
      if (!name) {
        return res.status(400).json({ message: 'Employee name is required.' });
      }
      const newEmployeeData = {
        name,
        email: email || undefined, 
        jobTitle: jobTitle || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        employmentType: employmentType || undefined,
        documents: [] as EmployeeDocument[], 
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await employeesCollection.insertOne(newEmployeeData);
      const createdEmployee = { 
        ...newEmployeeData, 
        id: result.insertedId.toString(),
        startDate: newEmployeeData.startDate || null, // ensure it's null if undefined for client
      };
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
