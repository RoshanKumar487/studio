
// src/pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const criticalMessage = "CRITICAL: MONGODB_URI is not configured. Employee data operations are disabled.";
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
    console.log("Attempting to connect to MongoDB for /api/employees...");
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    console.log("Successfully connected to MongoDB for /api/employees.");
    const db = client.db("flowHQApp"); 
    const employeesCollection = db.collection<Omit<Employee, 'id'> & { _id?: ObjectId }>('employees');

    if (req.method === 'GET') {
      const employeesFromDb = await employeesCollection.find({}).sort({ name: 1 }).toArray();
      const employeesResult: Employee[] = employeesFromDb.map(emp => ({ 
        ...emp, 
        id: emp._id!.toString(), 
        documents: emp.documents || [],
        startDate: emp.startDate ? new Date(emp.startDate) : null,
        actualSalary: emp.actualSalary === undefined ? null : emp.actualSalary,
      }));
      res.status(200).json(employeesResult);
    } else if (req.method === 'POST') {
      const { name, email, jobTitle, startDate, employmentType, actualSalary } = req.body as Omit<Employee, 'id' | 'documents'>;
      if (!name) {
        return res.status(400).json({ message: 'Employee name is required.' });
      }
      const newEmployeeData = {
        name,
        email: email || undefined, 
        jobTitle: jobTitle || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        employmentType: employmentType || undefined,
        actualSalary: actualSalary === undefined ? null : (typeof actualSalary === 'string' ? parseFloat(actualSalary) : actualSalary),
        documents: [] as EmployeeDocument[], 
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await employeesCollection.insertOne(newEmployeeData);
      const createdEmployee: Employee = { 
        ...newEmployeeData, 
        id: result.insertedId.toString(),
        startDate: newEmployeeData.startDate || null, 
        actualSalary: newEmployeeData.actualSalary,
      };
      res.status(201).json(createdEmployee);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error (employees/index.ts) during database operation or connection:', error);
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
      console.log("MongoDB connection closed for /api/employees.");
    }
  }
}
