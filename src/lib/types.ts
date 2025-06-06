
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

export interface Appointment {
  id: string;
  date: Date; // Represents the specific day of the appointment
  time: string; // e.g., "10:00 AM" or "14:30"
  title: string; // Could be client name or service
  description?: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  description?: string;
  uploadedAt: Date;
  fileName?: string;
  fileType?: string;
  fileSize?: number; // Store size in bytes
  // fileUrl?: string; // Future: for actual file links from cloud storage
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  documents: EmployeeDocument[];
}

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  date: Date;
  hours: number;
  taskDescription: string;
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
