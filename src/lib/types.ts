
export interface RevenueEntry {
  id: string;
  date: Date;
  amount: number;
  description: string;
}

export interface ExpenseEntry {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description:string;
}

export interface EmployeeDocument {
  id: string; // This will be the ID within the employee's documents array
  name: string;
  description?: string;
  uploadedAt: Date;
  fileName?: string;
  fileType?: string;
  fileSize?: number; // Store size in bytes
}

export interface Employee {
  id: string; // This will be the Firestore document ID
  name: string;
  email?: string;
  jobTitle?: string;
  startDate?: Date | null; // Can be null if not set
  employmentType?: 'Full-time' | 'Part-time' | 'Contract';
  actualSalary?: number | null; // Monthly salary
  documents: EmployeeDocument[]; // Documents will be an array within the employee object in Firestore
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyName: string; // Name of the company sending the invoice
  companyAddress?: string; // Address of the company sending the invoice
  employeeId?: string; // Can be linked to an employee
  customerName: string; // Name of the company/client being invoiced
  customerAddress?: string;
  invoiceDate: Date;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
  subTotal: number;
  taxRate: number; // e.g., 0.1 for 10%
  taxAmount: number;
  grandTotal: number;
  notes?: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: Date; // Date of presence
}
