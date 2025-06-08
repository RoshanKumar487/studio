
// src/pages/api/employees/[employeeId]/documents/[documentId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Employee } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;
  const { employeeId, documentId } = req.query;

  if (typeof employeeId !== 'string' || typeof documentId !== 'string') {
    return res.status(400).json({ message: 'Invalid employee or document ID format (query param).' });
  }
  
  if (!uri) {
    const criticalMessage = `CRITICAL: MONGODB_URI is not configured. Document deletion for employee ${employeeId} doc ${documentId} is disabled.`;
    console.error("**************************************************************************************");
    console.error(criticalMessage);
    console.error(`Attempted operation: ${req.method} on ${req.url}`);
    console.error("**************************************************************************************");
    return res.status(503).json({ 
        message: "Service Unavailable: Database is not configured. Please set the MONGODB_URI environment variable.",
        errorContext: `Operation: ${req.method} on ${req.url}` 
    });
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

    if (req.method === 'DELETE') {
      const updateResult = await employeesCollection.updateOne(
        { _id: empObjectId },
        { 
          $pull: { documents: { id: documentId } }, 
          $set: { updatedAt: new Date() }
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ message: 'Employee not found to delete document from.' });
      }
      
      const updatedEmployeeDoc = await employeesCollection.findOne({ _id: empObjectId });
       if (!updatedEmployeeDoc) {
          return res.status(404).json({ message: 'Updated employee not found after deleting document.'});
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
      res.setHeader('Allow', ['DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed on this route`);
    }
  } catch (error) {
    console.error(`API Error (employees/${employeeId}/documents/${documentId}):`, error);
    res.status(500).json({ message: 'Internal Server Error.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
