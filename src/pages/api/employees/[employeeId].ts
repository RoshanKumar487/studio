
// src/pages/api/employees/[employeeId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;
  const { employeeId } = req.query;

  if (typeof employeeId !== 'string' || !ObjectId.isValid(employeeId)) {
    return res.status(400).json({ message: 'Invalid employee ID format.' });
  }
  
  if (!uri) {
    const warningMessageBase = `MONGODB_URI is not configured. Operations for employee ${employeeId} will be limited/mocked. Please set MONGODB_URI in your .env.local file and restart the server for real data.`;
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessageBase}`);
    console.warn("**************************************************************************************");

    if (req.method === 'GET') {
      return res.status(404).json({ message: `Employee ${employeeId} not found (MongoDB URI not configured).` });
    }
    if (req.method === 'PUT') {
      return res.status(500).json({ message: `MongoDB URI is not configured. Cannot update employee ${employeeId}.` });
    }
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed on employee ${employeeId} without DB config` });
  }

  let client: MongoClient | null = null;
  try {
    const objectId = new ObjectId(employeeId);
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    const db = client.db("bizViewApp"); 
    const employeesCollection = db.collection<Omit<Employee, 'id'> & { _id?: ObjectId }>('employees');

    if (req.method === 'GET') {
      const employee = await employeesCollection.findOne({ _id: objectId });
      if (employee) {
        res.status(200).json({ 
          ...employee, 
          id: employee._id!.toString(), 
          documents: employee.documents || [],
          startDate: employee.startDate ? new Date(employee.startDate) : null,
        });
      } else {
        res.status(404).json({ message: 'Employee not found' });
      }
    } else if (req.method === 'PUT') {
      const { documents, name, email, jobTitle, startDate, employmentType } = req.body as Partial<Pick<Employee, 'documents' | 'name' | 'email' | 'jobTitle' | 'startDate' | 'employmentType'>>;
      
      const updateFields: Record<string, any> = {};

      if (name !== undefined) updateFields.name = name;
      if (email !== undefined) updateFields.email = email; // Allows setting email to "" or null
      if (jobTitle !== undefined) updateFields.jobTitle = jobTitle;
      if (startDate !== undefined) updateFields.startDate = startDate ? new Date(startDate) : null;
      if (employmentType !== undefined) updateFields.employmentType = employmentType;

      if (documents !== undefined) {
        if (!Array.isArray(documents)) {
          return res.status(400).json({ message: 'If provided, documents must be an array.' });
        }
        updateFields.documents = documents.map((doc: EmployeeDocument) => ({
          id: doc.id || new ObjectId().toHexString(),
          name: doc.name,
          description: doc.description,
          uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
        }));
      }

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: 'No update fields provided.' });
      }
      
      updateFields.updatedAt = new Date();

      const result = await employeesCollection.updateOne(
        { _id: objectId },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Employee not found for update.' });
      }
      const updatedEmployee = await employeesCollection.findOne({ _id: objectId });
      if (!updatedEmployee) {
          return res.status(404).json({ message: 'Updated employee not found.'});
      }
      res.status(200).json({ 
        ...updatedEmployee, 
        id: updatedEmployee._id!.toString(), 
        documents: updatedEmployee.documents || [],
        startDate: updatedEmployee.startDate ? new Date(updatedEmployee.startDate) : null,
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`API Error for employee ${employeeId}:`, error);
    if (error instanceof Error && error.message.toLowerCase().includes("objectid")) {
        return res.status(400).json({ message: 'Invalid employee ID format for database query.' });
    }
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
