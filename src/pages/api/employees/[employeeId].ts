
// src/pages/api/employees/[employeeId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;
  const { employeeId } = req.query;

  if (typeof employeeId !== 'string') {
    return res.status(400).json({ message: 'Invalid employee ID format (query param).' });
  }
  
  if (!uri) {
    const criticalMessage = `CRITICAL: MONGODB_URI is not configured. Operations for employee ${employeeId} are disabled.`;
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
    const objectId = new ObjectId(employeeId);
    client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }});
    await client.connect();
    const db = client.db("flowHQApp"); 
    const employeesCollection = db.collection<Omit<Employee, 'id'> & { _id?: ObjectId }>('employees');

    if (req.method === 'GET') {
      const employee = await employeesCollection.findOne({ _id: objectId });
      if (employee) {
        res.status(200).json({ 
          ...employee, 
          id: employee._id!.toString(), 
          documents: employee.documents || [],
          startDate: employee.startDate ? new Date(employee.startDate) : null,
          actualSalary: employee.actualSalary === undefined ? null : employee.actualSalary,
        } as Employee);
      } else {
        res.status(404).json({ message: 'Employee not found' });
      }
    } else if (req.method === 'PUT') {
      const { documents, name, email, jobTitle, startDate, employmentType, actualSalary } = req.body as Partial<Pick<Employee, 'documents' | 'name' | 'email' | 'jobTitle' | 'startDate' | 'employmentType' | 'actualSalary'>>;
      
      const updateFields: Record<string, any> = {};

      if (name !== undefined) updateFields.name = name;
      if (email !== undefined) updateFields.email = email; 
      if (jobTitle !== undefined) updateFields.jobTitle = jobTitle;
      if (startDate !== undefined) updateFields.startDate = startDate ? new Date(startDate) : null;
      if (employmentType !== undefined) updateFields.employmentType = employmentType;
      if (actualSalary !== undefined) updateFields.actualSalary = actualSalary === null ? null : (typeof actualSalary === 'string' ? parseFloat(actualSalary) : actualSalary) ;

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
        if (documents && Array.isArray(documents) && documents.length === 0 && !Object.keys(updateFields).some(k => k !== 'documents')) {
             updateFields.documents = []; 
        } else {
            return res.status(400).json({ message: 'No update fields provided.' });
        }
      }
      
      updateFields.updatedAt = new Date();

      const result = await employeesCollection.updateOne(
        { _id: objectId },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Employee not found for update.' });
      }
      const updatedEmployeeDoc = await employeesCollection.findOne({ _id: objectId });
      if (!updatedEmployeeDoc) {
          return res.status(404).json({ message: 'Updated employee not found.'});
      }
      const updatedEmployeeResult: Employee = { 
        ...updatedEmployeeDoc, 
        id: updatedEmployeeDoc._id!.toString(), 
        documents: updatedEmployeeDoc.documents || [],
        startDate: updatedEmployeeDoc.startDate ? new Date(updatedEmployeeDoc.startDate) : null,
        actualSalary: updatedEmployeeDoc.actualSalary === undefined ? null : updatedEmployeeDoc.actualSalary,
      };
      res.status(200).json(updatedEmployeeResult);
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`API Error for employee ${employeeId}:`, error);
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
