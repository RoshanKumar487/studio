
// src/pages/api/employees/[employeeId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import type { Employee, EmployeeDocument } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid'; // For generating unique static IDs if needed

// Re-define staticEmployees here or import if modularized. For simplicity, redefined.
const staticEmployeesList: Employee[] = [
  {
    id: 'static-emp-alice', // Use a fixed, predictable ID for testing specific GETs
    name: 'Alice Wonderland',
    email: 'alice@example.com',
    jobTitle: 'Dream Interpreter',
    startDate: new Date(2023, 0, 15),
    employmentType: 'Full-time',
    actualSalary: 60000,
    documents: [],
  },
  {
    id: 'static-emp-bob', // Use a fixed, predictable ID
    name: 'Bob The Builder',
    email: 'bob@example.com',
    jobTitle: 'Lead Architect',
    startDate: new Date(2022, 5, 1),
    employmentType: 'Contract',
    actualSalary: 75000,
    documents: [],
  },
];


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.MONGODB_URI;
  const { employeeId } = req.query;

  if (typeof employeeId !== 'string') { // Removed ObjectId.isValid for static IDs
    return res.status(400).json({ message: 'Invalid employee ID format.' });
  }
  
  if (!uri) {
    const warningMessageBase = `MONGODB_URI is not configured. Operations for employee ${employeeId} will be limited/mocked. Please set MONGODB_URI in your .env.local file and restart the server for real data.`;
    console.warn("**************************************************************************************");
    console.warn(`WARNING: ${warningMessageBase}`);
    console.warn("**************************************************************************************");

    if (req.method === 'GET') {
      const staticEmployee = staticEmployeesList.find(emp => emp.id === employeeId);
      if (staticEmployee) {
        return res.status(200).json({
          ...staticEmployee,
          startDate: staticEmployee.startDate ? staticEmployee.startDate.toISOString() : null,
        });
      }
      return res.status(404).json({ message: `Employee ${employeeId} not found (MongoDB URI not configured or ID does not match static employees).` });
    }
    if (req.method === 'PUT') {
       const staticEmployee = staticEmployeesList.find(emp => emp.id === employeeId);
       if (staticEmployee) {
           // Mock update: just return the data that would have been updated
           const { documents, name, email, jobTitle, startDate, employmentType, actualSalary } = req.body as Partial<Employee>;
            const updatedMockEmployee = {
                ...staticEmployee, // Start with existing static data
                name: name !== undefined ? name : staticEmployee.name,
                email: email !== undefined ? email : staticEmployee.email,
                jobTitle: jobTitle !== undefined ? jobTitle : staticEmployee.jobTitle,
                startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : staticEmployee.startDate,
                employmentType: employmentType !== undefined ? employmentType : staticEmployee.employmentType,
                actualSalary: actualSalary !== undefined ? (actualSalary === null ? null : (typeof actualSalary === 'string' ? parseFloat(actualSalary) : actualSalary)) : staticEmployee.actualSalary,
                documents: documents !== undefined ? documents : staticEmployee.documents,
            };
           return res.status(200).json({
             ...updatedMockEmployee,
             startDate: updatedMockEmployee.startDate ? updatedMockEmployee.startDate.toISOString() : null,
           });
       }
      return res.status(500).json({ message: `MongoDB URI is not configured. Cannot update employee ${employeeId}.` });
    }
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed on employee ${employeeId} without DB config` });
  }

  // Database connected logic remains below
  if (!ObjectId.isValid(employeeId)) { // ObjectId check only if DB is connected
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
          id: doc.id || new ObjectId().toHexString(), // Use existing ID or generate new for docs
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
    // Removed the ObjectId specific error check here as it's now conditional
    res.status(500).json({ message: 'Internal Server Error communicating with database.' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
