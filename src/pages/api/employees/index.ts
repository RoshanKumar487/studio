// src/pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';

// TODO: Replace with your MongoDB connection string from .env.local
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MongoDB URI is not defined. Please set MONGODB_URI in your .env.local file.");
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// Ensure the MongoDB Node.js driver is installed: npm install mongodb
// const client = new MongoClient(uri || '', {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// Placeholder for MongoDB client connection - You'll need to manage this connection properly.
// A common pattern is to create a helper function to connect and reuse the client.
// For simplicity in this example, we're not implementing full connection management.
async function connectToDatabase() {
  if (!uri) throw new Error("MongoDB URI not defined");
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
  });
  await client.connect();
  return client.db("your_database_name"); // TODO: Replace "your_database_name"
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!uri) {
    return res.status(500).json({ message: "MongoDB URI is not configured." });
  }
  
  let client: MongoClient | null = null;

  try {
    // const db = await connectToDatabase(); // Use your actual connection helper
    // For now, let's use a mock to demonstrate the API structure if DB connection is not ready
    // Remove this mock section once your MongoDB is connected.
    // --- Mock Start ---
    if (req.method === 'GET') {
      // Simulate fetching employees
      const mockEmployees: Employee[] = [
        // { id: 'mock1', name: 'Mock Employee 1 (from API)', email: 'mock1@example.com', documents: [] },
        // { id: 'mock2', name: 'Mock Employee 2 (from API)', email: 'mock2@example.com', documents: [] },
      ];
      return res.status(200).json(mockEmployees);
    }
    if (req.method === 'POST') {
      // Simulate adding an employee
      const newEmployeeData = req.body as Omit<Employee, 'id' | 'documents'>;
      const mockNewEmployee: Employee = { 
        ...newEmployeeData, 
        id: new ObjectId().toHexString(), // Simulate MongoDB ObjectId
        documents: [] 
      };
      return res.status(201).json(mockNewEmployee);
    }
    // --- Mock End ---


    // --- Real MongoDB Logic (Uncomment and adapt when ready) ---
    // client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    // await client.connect();
    // const db = client.db("your_database_name"); // TODO: Replace "your_database_name"
    // const employeesCollection = db.collection<Omit<Employee, 'id'> & { _id?: ObjectId }>('employees');

    // if (req.method === 'GET') {
    //   const employees = await employeesCollection.find({}).sort({ name: 1 }).toArray();
    //   res.status(200).json(employees.map(emp => ({ ...emp, id: emp._id!.toString() })));
    // } else if (req.method === 'POST') {
    //   const { name, email } = req.body as Omit<Employee, 'id' | 'documents'>;
    //   if (!name) {
    //     return res.status(400).json({ message: 'Employee name is required.' });
    //   }
    //   const newEmployee = {
    //     name,
    //     email: email || undefined,
    //     documents: [],
    //     createdAt: new Date(), // Optional: add a creation timestamp
    //   };
    //   const result = await employeesCollection.insertOne(newEmployee);
    //   res.status(201).json({ ...newEmployee, id: result.insertedId.toString() });
    // } 
    else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    // if (client) {
    //   await client.close();
    // }
  }
}
