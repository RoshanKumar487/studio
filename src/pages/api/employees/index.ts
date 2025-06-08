
// src/pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const staticEmployees: Employee[] = [
  {
    id: `static-emp-${uuidv4()}`,
    name: 'Alice Wonderland',
    email: 'alice@example.com',
    jobTitle: 'Dream Interpreter',
    startDate: new Date(2023, 0, 15), // Month is 0-indexed, so 0 is January
    employmentType: 'Full-time',
    actualSalary: 60000,
    documents: [],
  },
  {
    id: `static-emp-${uuidv4()}`,
    name: 'Bob The Builder',
    email: 'bob@example.com',
    jobTitle: 'Lead Architect',
    startDate: new Date(2022, 5, 1), // 5 is June
    employmentType: 'Contract',
    actualSalary: 75000,
    documents: [],
  },
];


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const warningMessage = "MONGODB_URI is not configured. Employee data operations will be limited/mocked. Please set MONGODB_URI in your .env.local file and restart the server for real data.";
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessage}`);
    console.warn("**************************************************************************************");

    if (req.method === 'GET') {
      return res.status(200).json(staticEmployees.map(emp => ({
        ...emp,
        startDate: emp.startDate ? emp.startDate.toISOString() : null, // Ensure dates are ISO strings for JSON
      })));
    }
    if (req.method === 'POST') {
      // Mock adding an employee
      const { name, email, jobTitle, startDate, employmentType, actualSalary } = req.body as Omit<Employee, 'id' | 'documents'>;
      if (!name) {
        return res.status(400).json({ message: 'Employee name is required for mock creation.' });
      }
      const newMockEmployee: Employee = {
        id: `static-emp-${uuidv4()}`,
        name,
        email: email || undefined,
        jobTitle: jobTitle || undefined,
        startDate: startDate ? new Date(startDate) : null,
        employmentType: employmentType || undefined,
        actualSalary: actualSalary === undefined ? null : (typeof actualSalary === 'string' ? parseFloat(actualSalary) : actualSalary),
        documents: [] as EmployeeDocument[],
      };
      // Note: staticEmployees array is not actually mutated here for future GET requests in this simplified mock
      return res.status(201).json({
        ...newMockEmployee,
        startDate: newMockEmployee.startDate ? newMockEmployee.startDate.toISOString() : null,
      });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB config` });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
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
    console.error('API Error (employees/index.ts):', error);
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
