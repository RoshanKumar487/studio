
"use client";

import type { RevenueEntry, ExpenseEntry, Appointment, Employee, EmployeeDocument, TimesheetEntry, Invoice } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Firebase db import is removed for employee data, but might be used elsewhere (e.g. Genkit)
// import { db } from '@/lib/firebase'; 
// import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';

interface AppDataContextType {
  revenueEntries: RevenueEntry[];
  expenseEntries: ExpenseEntry[];
  appointments: Appointment[];
  employees: Employee[];
  timesheetEntries: TimesheetEntry[];
  invoices: Invoice[];

  addRevenueEntry: (entry: Omit<RevenueEntry, 'id' | 'date'> & { date: string | Date }) => void;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id' | 'date'> & { date: string | Date }) => void;
  addAppointment: (entry: Omit<Appointment, 'id' | 'date'> & { date: string | Date }) => void;
  
  addEmployee: (employeeData: Omit<Employee, 'id' | 'documents'>) => Promise<Employee | null>;
  addEmployeeDocument: (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>) => Promise<Employee | null>;
  deleteEmployeeDocument: (employeeId: string, documentId: string) => Promise<Employee | null>;
  getEmployeeById: (employeeId: string) => Promise<Employee | undefined>; 

  addTimesheetEntry: (entry: Omit<TimesheetEntry, 'id'>) => void;
  getTimesheetsByEmployee: (employeeId: string) => TimesheetEntry[];
  
  addInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'subTotal' | 'taxAmount' | 'grandTotal'>) => Invoice;
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status']) => void;
  getInvoiceById: (invoiceId: string) => Invoice | undefined;
  getNextInvoiceNumber: () => string;

  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  loadingEmployees: boolean;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Sample initial data (will be replaced for employees)
const initialRevenue: RevenueEntry[] = [
  { id: uuidv4(), date: new Date(2024, 6, 1), amount: 1200, description: "Web design project" },
  { id: uuidv4(), date: new Date(2024, 6, 5), amount: 750, description: "Consulting services" },
];
const initialExpenses: ExpenseEntry[] = [
  { id: uuidv4(), date: new Date(2024, 6, 2), amount: 150, category: "Software", description: "Subscription for design tool" },
  { id: uuidv4(), date: new Date(2024, 6, 7), amount: 80, category: "Marketing", description: "Online ads" },
];
const initialAppointments: Appointment[] = [
   { id: uuidv4(), date: new Date(new Date().setDate(new Date().getDate() + 2)), time: "10:00", title: "Client Meeting - John Doe" },
   { id: uuidv4(), date: new Date(new Date().setDate(new Date().getDate() + 3)), time: "14:30", title: "Project Sync - Team Alpha" },
];
const initialTimesheetEntries: TimesheetEntry[] = [];
const initialInvoices: Invoice[] = [];


export function AppDataProvider({ children }: { children: ReactNode }) {
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>(initialRevenue);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>(initialExpenses);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  
  const [employees, setEmployees] = useState<Employee[]>([]); 
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);

  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>(initialTimesheetEntries);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  // Fetch employees from API on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await fetch('/api/employees');
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        const data: Employee[] = await response.json();
        setEmployees(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching employees from API:", error);
        // Handle error appropriately in UI, e.g. set an error state
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);


  const addRevenueEntry = useCallback((entry: Omit<RevenueEntry, 'id' | 'date'> & { date: string | Date }) => {
    const newEntry: RevenueEntry = { 
      ...entry, 
      id: uuidv4(), 
      date: typeof entry.date === 'string' ? new Date(entry.date) : entry.date 
    };
    setRevenueEntries(prev => [...prev, newEntry].sort((a, b) => b.date.getTime() - a.date.getTime()));
  }, []);

  const addExpenseEntry = useCallback((entry: Omit<ExpenseEntry, 'id' | 'date'> & { date: string | Date }) => {
    const newEntry: ExpenseEntry = { 
      ...entry, 
      id: uuidv4(), 
      date: typeof entry.date === 'string' ? new Date(entry.date) : entry.date 
    };
    setExpenseEntries(prev => [...prev, newEntry].sort((a, b) => b.date.getTime() - a.date.getTime()));
  }, []);

  const addAppointment = useCallback((entry: Omit<Appointment, 'id' | 'date'> & { date: string | Date }) => {
    const newAppointment: Appointment = {
      ...entry,
      id: uuidv4(),
      date: typeof entry.date === 'string' ? new Date(entry.date) : entry.date,
    };
    setAppointments(prev => [...prev, newAppointment].sort((a,b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time)));
  }, []);

  // --- Employee Functions (Now using API routes) ---
  const addEmployee = useCallback(async (employeeData: Omit<Employee, 'id' | 'documents'>): Promise<Employee | null> => {
    setLoadingEmployees(true);
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });
      if (!response.ok) {
        throw new Error('Failed to add employee');
      }
      const newEmployee: Employee = await response.json();
      setEmployees(prev => [...prev, newEmployee].sort((a, b) => a.name.localeCompare(b.name)));
      return newEmployee;
    } catch (error) {
      console.error("Error adding employee via API:", error);
      return null;
    } finally {
      setLoadingEmployees(false);
    }
  }, []);
  
  const getEmployeeById = useCallback(async (employeeId: string): Promise<Employee | undefined> => {
     // First, check local state for quicker access if already fetched
    const localEmployee = employees.find(emp => emp.id === employeeId);
    if (localEmployee) return localEmployee;

    // If not in local state, fetch from API (might be redundant if all employees are always fetched initially)
    setLoadingEmployees(true); // Might want a specific loading state for single employee
    try {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (!response.ok) {
        if (response.status === 404) return undefined; // Not found
        throw new Error(`Failed to fetch employee ${employeeId}`);
      }
      const employee: Employee = await response.json();
       // Optionally update local state if this fetch is common
       // setEmployees(prev => prev.map(e => e.id === employee.id ? employee : e)); 
      return employee;
    } catch (error) {
      console.error(`Error fetching employee ${employeeId} from API:`, error);
      return undefined;
    } finally {
       setLoadingEmployees(false); // Reset general loading state
    }
  }, [employees]);


  const addEmployeeDocument = useCallback(async (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>): Promise<Employee | null> => {
    const currentEmployee = employees.find(emp => emp.id === employeeId);
    if (!currentEmployee) {
      console.error("Employee not found locally for adding document");
      return null; // Or fetch employee first
    }

    const newDocument: EmployeeDocument = {
      ...documentData,
      id: uuidv4(), 
      uploadedAt: new Date()
    };
    
    const updatedDocuments = [...currentEmployee.documents, newDocument].sort((a,b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    
    setLoadingEmployees(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: updatedDocuments }),
      });
      if (!response.ok) {
        throw new Error('Failed to add employee document');
      }
      const updatedEmployee: Employee = await response.json();
      setEmployees(prev => prev.map(emp => emp.id === employeeId ? updatedEmployee : emp).sort((a,b) => a.name.localeCompare(b.name)));
      return updatedEmployee;
    } catch (error) {
      console.error("Error adding employee document via API:", error);
      // Optionally revert local state or handle error
      return null;
    } finally {
      setLoadingEmployees(false);
    }
  }, [employees]);

  const deleteEmployeeDocument = useCallback(async (employeeId: string, documentId: string): Promise<Employee | null> => {
    const currentEmployee = employees.find(emp => emp.id === employeeId);
    if (!currentEmployee) {
      console.error("Employee not found locally for deleting document");
      return null;
    }

    const updatedDocuments = currentEmployee.documents.filter(doc => doc.id !== documentId);

    setLoadingEmployees(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: updatedDocuments }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete employee document');
      }
      const updatedEmployee: Employee = await response.json();
      setEmployees(prev => prev.map(emp => emp.id === employeeId ? updatedEmployee : emp).sort((a,b) => a.name.localeCompare(b.name)));
      return updatedEmployee;
    } catch (error) {
      console.error("Error deleting employee document via API:", error);
      return null;
    } finally {
      setLoadingEmployees(false);
    }
  }, [employees]);


  // --- Other data functions (still in-memory) ---
  const addTimesheetEntry = useCallback((entry: Omit<TimesheetEntry, 'id'>) => {
    const newEntry: TimesheetEntry = { ...entry, id: uuidv4() };
    setTimesheetEntries(prev => [...prev, newEntry].sort((a,b) => b.date.getTime() - a.date.getTime()));
  }, []);

  const getTimesheetsByEmployee = useCallback((employeeId: string) => {
    return timesheetEntries.filter(ts => ts.employeeId === employeeId).sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [timesheetEntries]);

  const getNextInvoiceNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const nextNum = invoices.filter(inv => inv.invoiceNumber.startsWith(`INV-${year}`)).length + 1;
    return `INV-${year}-${String(nextNum).padStart(4, '0')}`;
  }, [invoices]);

  const addInvoice = useCallback((invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'subTotal' | 'taxAmount' | 'grandTotal'>) => {
    const subTotal = invoiceData.lineItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
    const taxAmount = subTotal * invoiceData.taxRate;
    const grandTotal = subTotal + taxAmount;
    
    const newInvoice: Invoice = {
      ...invoiceData,
      id: uuidv4(),
      invoiceNumber: getNextInvoiceNumber(),
      lineItems: invoiceData.lineItems.map(item => ({
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        id: uuidv4(), 
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      })),
      subTotal,
      taxAmount,
      grandTotal,
    };
    setInvoices(prev => [...prev, newInvoice].sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime()));
    return newInvoice;
  }, [getNextInvoiceNumber, invoices]); 

  const updateInvoiceStatus = useCallback((invoiceId: string, status: Invoice['status']) => {
    setInvoices(prevInvoices => 
      prevInvoices.map(inv => 
        inv.id === invoiceId 
          ? { ...inv, status }
          : inv
      )
    );
  }, []);

  const getInvoiceById = useCallback((invoiceId: string) => {
    return invoices.find(inv => inv.id === invoiceId);
  }, [invoices]);

  const totalRevenue = useMemo(() => revenueEntries.reduce((sum, entry) => sum + entry.amount, 0), [revenueEntries]);
  const totalExpenses = useMemo(() => expenseEntries.reduce((sum, entry) => sum + entry.amount, 0), [expenseEntries]);
  const netProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  return (
    <AppDataContext.Provider value={{ 
      revenueEntries, 
      expenseEntries, 
      appointments, 
      employees, 
      timesheetEntries,
      invoices,
      addRevenueEntry, 
      addExpenseEntry,
      addAppointment,
      addEmployee, 
      addEmployeeDocument, 
      deleteEmployeeDocument, 
      getEmployeeById, 
      addTimesheetEntry,
      getTimesheetsByEmployee,
      addInvoice,
      updateInvoiceStatus,
      getInvoiceById,
      getNextInvoiceNumber,
      totalRevenue,
      totalExpenses,
      netProfit,
      loadingEmployees
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
