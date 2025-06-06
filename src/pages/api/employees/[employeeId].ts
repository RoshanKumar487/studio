// src/pages/api/employees/[employeeId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';

// TODO: Replace with your MongoDB connection string from .env.local
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MongoDB URI is not defined. Please set MONGODB_URI in your .env.local file.");
}

// Placeholder for MongoDB client connection
// async function connectToDatabase() { ... } // Define or import your connection helper

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!uri) {
    return res.status(500).json({ message: "MongoDB URI is not configured." });
  }

  const { employeeId } = req.query;
  if (typeof employeeId !== 'string' || !ObjectId.isValid(employeeId)) { // Basic validation for ObjectId
    return res.status(400).json({ message: 'Invalid employee ID format.' });
  }
  
  let client: MongoClient | null = null;

  try {
    // --- Mock Start (Remove when MongoDB is connected) ---
    if (req.method === 'GET') {
      // Simulate fetching a single employee
      // return res.status(200).json({ id: employeeId, name: `Mock Employee ${employeeId}`, email: `mock-${employeeId}@example.com`, documents: [] });
      // For now, to avoid 404s during transition if DB not ready
      return res.status(404).json({ message: "Employee not found (mock)" });
    }
    if (req.method === 'PUT') {
        // Simulate updating employee documents
        const updatedEmployeeData = req.body as Partial<Employee>; // e.g., just the documents array
        // In a real scenario, you'd merge this with existing data.
        // For the mock, we just return what was sent for simplicity of testing the API call.
        return res.status(200).json({ id: employeeId, ...updatedEmployeeData });
    }
    // --- Mock End ---

    // --- Real MongoDB Logic (Uncomment and adapt when ready) ---
    // client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    // await client.connect();
    // const db = client.db("your_database_name"); // TODO: Replace "your_database_name"
    // const employeesCollection = db.collection<Omit<Employee, 'id'> & { _id?: ObjectId }>('employees');
    // const objectId = new ObjectId(employeeId);

    // if (req.method === 'GET') {
    //   const employee = await employeesCollection.findOne({ _id: objectId });
    //   if (employee) {
    //     res.status(200).json({ ...employee, id: employee._id!.toString() });
    //   } else {
    //     res.status(404).json({ message: 'Employee not found' });
    //   }
    // } else if (req.method === 'PUT') {
    //   // This typically handles updates, e.g., adding/removing documents
    //   const { documents } = req.body as { documents?: EmployeeDocument[] }; // Expecting the full new array of documents
      
    //   if (!Array.isArray(documents)) {
    //     return res.status(400).json({ message: 'Documents array is required for update.' });
    //   }

    //   // Ensure document IDs and dates are correctly formatted if necessary
    //   const validatedDocuments = documents.map(doc => ({
    //       ...doc,
    //       id: doc.id || new ObjectId().toHexString(), // Ensure sub-document has an ID
    //       uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(), // Ensure date format
    //   }));

    //   const result = await employeesCollection.updateOne(
    //     { _id: objectId },
    //     { $set: { documents: validatedDocuments, updatedAt: new Date() } } // Optional: add an update timestamp
    //   );

    //   if (result.matchedCount === 0) {
    //     return res.status(404).json({ message: 'Employee not found for update.' });
    //   }
    //   // Fetch the updated employee to return it
    //   const updatedEmployee = await employeesCollection.findOne({ _id: objectId });
    //   res.status(200).json({ ...updatedEmployee, id: updatedEmployee!._id!.toString() });
    // } 
    else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`API Error for employee ${employeeId}:`, error);
    if (error instanceof Error && error.message.includes("ObjectId")) {
        return res.status(400).json({ message: 'Invalid employee ID format for MongoDB.' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    // if (client) {
    //   await client.close();
    // }
  }
}
