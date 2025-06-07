
// src/pages/api/employees/[employeeId]/documents/[documentId].ts
// API route to delete a document from an employee
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
    const warningMessage = `MONGODB_URI is not configured. Document deletion for employee ${employeeId} doc ${documentId} will be mocked.`;
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessage}`);
    console.warn("**************************************************************************************");
    if (req.method === 'DELETE') {
        // This mock doesn't persist, just returns what a successful operation might look like
        const mockEmployee: Employee = { 
            id: employeeId, name: "Mock Employee", documents: [] // Assume document was deleted
        };
        return res.status(200).json(mockEmployee);
    }
    return res.status(405).json({ message: `Method ${req.method} Not Allowed without DB for document deletion` });
  }

  if (!ObjectId.isValid(employeeId)) {
    return res.status(400).json({ message: 'Invalid employee ID format for database query.' });
  }
  // Document ID is a UUID string, not ObjectId, so no ObjectId.isValid check for it

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
          $pull: { documents: { id: documentId } }, // Pull document by its string UUID
          $set: { updatedAt: new Date() }
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ message: 'Employee not found to delete document from.' });
      }
      if (updateResult.modifiedCount === 0) {
        // This could mean the document with that ID didn't exist in the array
        // Or simply that the array was already empty or didn't contain the document.
        // For simplicity, we'll still fetch the employee and return.
        // A more robust check might query if the document existed before $pull.
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
