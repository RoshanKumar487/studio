
// src/pages/api/employees/[employeeId]/documents/index.ts
// API route to add a document to an employee
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;
  const { employeeId } = req.query;

  if (typeof employeeId !== 'string') {
    return res.status(400).json({ message: 'Invalid employee ID format (query param).' });
  }

  if (!uri) {
    const warningMessage = `MONGODB_URI is not configured. Document operations for employee ${employeeId} will be mocked.`;
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessage}`);
    console.warn("**************************************************************************************");
    // Simplified mock for adding document - in a real scenario, you'd fetch the employee first
    if (req.method === 'POST') {
        const { name, description, fileName, fileType, fileSize } = req.body as Omit<EmployeeDocument, 'id' | 'uploadedAt'>;
        if (!name) return res.status(400).json({ message: "Document name is required for mock." });
        
        // This mock doesn't persist, just returns what a successful operation might look like
        const mockEmployee: Employee = { 
            id: employeeId, name: "Mock Employee", documents: [{
            id: uuidv4(), name, description, fileName, fileType, fileSize, uploadedAt: new Date()
        }]};
        return res.status(200).json(mockEmployee);
    }
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB for employee documents` });
  }
  
  if (!ObjectId.isValid(employeeId)) {
    return res.status(400).json({ message: 'Invalid employee ID format for database query.' });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } });
    await client.connect();
    const db = client.db("flowHQApp");
    const employeesCollection = db.collection<Omit<Employee, 'id'> & { _id?: ObjectId }>('employees');
    const empObjectId = new ObjectId(employeeId);

    if (req.method === 'POST') {
      const { name, description, fileName, fileType, fileSize } = req.body as Omit<EmployeeDocument, 'id' | 'uploadedAt'>;

      if (!name) {
        return res.status(400).json({ message: 'Document name is required.' });
      }

      const newDocument: EmployeeDocument = {
        id: uuidv4(), // Client-side compatible unique ID for the document within the array
        name,
        description: description || undefined,
        uploadedAt: new Date(),
        fileName: fileName || undefined,
        fileType: fileType || undefined,
        fileSize: fileSize || undefined,
      };

      const updateResult = await employeesCollection.updateOne(
        { _id: empObjectId },
        { 
          $push: { documents: { $each: [newDocument], $sort: { uploadedAt: -1 } } },
          $set: { updatedAt: new Date() }
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ message: 'Employee not found to add document.' });
      }
      
      const updatedEmployeeDoc = await employeesCollection.findOne({ _id: empObjectId });
      if (!updatedEmployeeDoc) {
          return res.status(404).json({ message: 'Updated employee not found after adding document.'});
      }
      const resultEmployee: Employee = { 
        ...updatedEmployeeDoc, 
        id: updatedEmployeeDoc._id!.toString(),
        documents: updatedEmployeeDoc.documents || [],
        startDate: updatedEmployeeDoc.startDate ? new Date(updatedEmployeeDoc.startDate) : null,
        actualSalary: updatedEmployeeDoc.actualSalary === undefined ? null : updatedEmployeeDoc.actualSalary,
      };
      return res.status(200).json(resultEmployee);

    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed on this route`);
    }
  } catch (error) {
    console.error(`API Error (employees/${employeeId}/documents):`, error);
    res.status(500).json({ message: 'Internal Server Error.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}

