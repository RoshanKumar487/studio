
"use client";

import type { RevenueEntry, ExpenseEntry, Employee, EmployeeDocument, Invoice } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";

interface AppDataContextType {
  revenueEntries: RevenueEntry[];
  expenseEntries: ExpenseEntry[];
  employees: Employee[];
  invoices: Invoice[];
  
  addRevenueEntry: (entry: Omit<RevenueEntry, 'id' | 'date'> & { date: string | Date }) => Promise<void>;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id' | 'date'> & { date: string | Date }) => Promise<void>;
  
  addEmployee: (employeeData: Omit<Employee, 'id' | 'documents'>) => Promise<Employee | null>;
  addEmployeeDocument: (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>) => Promise<Employee | null>;
  deleteEmployeeDocument: (employeeId: string, documentId: string) => Promise<Employee | null>;
  getEmployeeById: (employeeId: string) => Promise<Employee | undefined>; 
  
  addInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'subTotal' | 'taxAmount' | 'grandTotal'>) => Promise<Invoice | null>;
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status']) => Promise<void>;
  getInvoiceById: (invoiceId: string) => Invoice | undefined; // Stays local after fetch
  getNextInvoiceNumber: () => string; // Stays client-side for now

  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  
  loadingEmployees: boolean;
  loadingRevenue: boolean;
  loadingExpenses: boolean;
  loadingInvoices: boolean;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]); 
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [loadingRevenue, setLoadingRevenue] = useState<boolean>(true);
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(true);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(true);

  // Fetch all data on initial load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingEmployees(true);
        const empResponse = await fetch('/api/employees');
        if (!empResponse.ok) throw new Error(`Failed to fetch employees (Status: ${empResponse.status})`);
        const empData: Employee[] = await empResponse.json();
        setEmployees(empData.map(emp => ({
            ...emp,
            documents: Array.isArray(emp.documents) ? emp.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
            startDate: emp.startDate ? new Date(emp.startDate) : null,
            actualSalary: emp.actualSalary === undefined ? null : emp.actualSalary,
        })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast({ title: "Error", description: "Could not load employee data.", variant: "destructive"});
      } finally {
        setLoadingEmployees(false);
      }

      try {
        setLoadingRevenue(true);
        const revResponse = await fetch('/api/revenue');
        if (!revResponse.ok) throw new Error(`Failed to fetch revenue (Status: ${revResponse.status})`);
        const revData: RevenueEntry[] = await revResponse.json();
        setRevenueEntries(revData.map(r => ({...r, date: new Date(r.date)})));
      } catch (error) {
        console.error("Error fetching revenue:", error);
        toast({ title: "Error", description: "Could not load revenue data.", variant: "destructive"});
      } finally {
        setLoadingRevenue(false);
      }

      try {
        setLoadingExpenses(true);
        const expResponse = await fetch('/api/expenses');
        if (!expResponse.ok) throw new Error(`Failed to fetch expenses (Status: ${expResponse.status})`);
        const expData: ExpenseEntry[] = await expResponse.json();
        setExpenseEntries(expData.map(e => ({...e, date: new Date(e.date)})));
      } catch (error) {
        console.error("Error fetching expenses:", error);
        toast({ title: "Error", description: "Could not load expense data.", variant: "destructive"});
      } finally {
        setLoadingExpenses(false);
      }

      try {
        setLoadingInvoices(true);
        const invResponse = await fetch('/api/invoices');
        if (!invResponse.ok) throw new Error(`Failed to fetch invoices (Status: ${invResponse.status})`);
        const invData: Invoice[] = await invResponse.json();
        setInvoices(invData.map(i => ({
            ...i, 
            invoiceDate: new Date(i.invoiceDate), 
            dueDate: new Date(i.dueDate)
        })));
      } catch (error) {
        console.error("Error fetching invoices:", error);
        toast({ title: "Error", description: "Could not load invoice data.", variant: "destructive"});
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchData();
  }, [toast]);


  const addRevenueEntry = useCallback(async (entry: Omit<RevenueEntry, 'id' | 'date'> & { date: string | Date }) => {
    setLoadingRevenue(true);
    try {
      const response = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          date: typeof entry.date === 'string' ? entry.date : entry.date.toISOString(),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to add revenue entry (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to add revenue entry (Status: ${response.status})`);
      }
      const newEntry: RevenueEntry = await response.json();
      setRevenueEntries(prev => [...prev, {...newEntry, date: new Date(newEntry.date)}].sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (error: any) {
      console.error("Error adding revenue entry:", error);
      toast({ title: "Error", description: error.message || "Could not add revenue entry.", variant: "destructive"});
    } finally {
      setLoadingRevenue(false);
    }
  }, [toast]);

  const addExpenseEntry = useCallback(async (entry: Omit<ExpenseEntry, 'id' | 'date'> & { date: string | Date }) => {
    setLoadingExpenses(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          date: typeof entry.date === 'string' ? entry.date : entry.date.toISOString(),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to add expense entry (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to add expense entry (Status: ${response.status})`);
      }
      const newEntry: ExpenseEntry = await response.json();
      setExpenseEntries(prev => [...prev, {...newEntry, date: new Date(newEntry.date)}].sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (error: any) {
      console.error("Error adding expense entry:", error);
      toast({ title: "Error", description: error.message || "Could not add expense entry.", variant: "destructive"});
    } finally {
      setLoadingExpenses(false);
    }
  }, [toast]);

  const addEmployee = useCallback(async (employeeData: Omit<Employee, 'id' | 'documents'>): Promise<Employee | null> => {
    setLoadingEmployees(true);
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to add employee (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to add employee (Status: ${response.status})`);
      }
      const newEmployee: Employee = await response.json();
      const processedEmployee = {
        ...newEmployee,
        documents: Array.isArray(newEmployee.documents) ? newEmployee.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
        startDate: newEmployee.startDate ? new Date(newEmployee.startDate) : null,
        actualSalary: newEmployee.actualSalary === undefined ? null : newEmployee.actualSalary,
      };
      setEmployees(prev => [...prev, processedEmployee].sort((a, b) => a.name.localeCompare(b.name)));
      return processedEmployee;
    } catch (error: any) {
      console.error("Error adding employee via API:", error);
      toast({ title: "Error Adding Employee", description: error.message || "Failed to add employee.", variant: "destructive" });
      return null;
    } finally {
      setLoadingEmployees(false);
    }
  }, [toast]);
  
  const getEmployeeById = useCallback(async (employeeId: string): Promise<Employee | undefined> => {
    // This function can remain largely the same, relying on the API.
    // However, ensure local state might be up-to-date if frequent calls are an issue.
    // For now, it directly calls the API as before.
    setLoadingEmployees(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (!response.ok) {
        if (response.status === 404) return undefined; 
        const errorData = await response.json().catch(() => ({message: `Failed to fetch employee ${employeeId} (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to fetch employee ${employeeId} (Status: ${response.status})`);
      }
      const employee: Employee = await response.json();
      return { // Process dates
        ...employee,
        documents: Array.isArray(employee.documents) ? employee.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
        startDate: employee.startDate ? new Date(employee.startDate) : null,
        actualSalary: employee.actualSalary === undefined ? null : employee.actualSalary,
      };
    } catch (error: any) {
      console.error(`Error fetching employee ${employeeId} from API:`, error);
      toast({ title: "Error", description: error.message || `Could not load data for employee ${employeeId}.`, variant: "destructive"});
      return undefined;
    } finally {
      setLoadingEmployees(false);
    }
  }, [toast]);

  const addEmployeeDocument = useCallback(async (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>): Promise<Employee | null> => {
    setLoadingEmployees(true); // Indicate loading for this specific employee or general employee list
    try {
      const response = await fetch(`/api/employees/${employeeId}/documents`, { // Assuming a dedicated documents API or using PUT on employee
          method: 'POST', // Or PUT to employee with full document list
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to add document (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to add document (Status: ${response.status})`);
      }
      const updatedEmployee: Employee = await response.json(); // API should return the updated employee
      const processedEmployee = {
        ...updatedEmployee,
        documents: Array.isArray(updatedEmployee.documents) ? updatedEmployee.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
        startDate: updatedEmployee.startDate ? new Date(updatedEmployee.startDate) : null,
      };
      setEmployees(prev => prev.map(emp => emp.id === employeeId ? processedEmployee : emp).sort((a,b) => a.name.localeCompare(b.name)));
      return processedEmployee;
    } catch (error: any) {
      console.error("Error adding employee document via API:", error);
      toast({ title: "Error Adding Document", description: error.message || "Failed to add document.", variant: "destructive" });
      return null;
    } finally {
      setLoadingEmployees(false);
    }
  }, [toast]);

  const deleteEmployeeDocument = useCallback(async (employeeId: string, documentId: string): Promise<Employee | null> => {
    setLoadingEmployees(true);
    try {
       // Similar to add, but DELETE method or adjust PUT to remove
      const response = await fetch(`/api/employees/${employeeId}/documents/${documentId}`, {
          method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to delete document (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to delete document (Status: ${response.status})`);
      }
      const updatedEmployee: Employee = await response.json();
      const processedEmployee = {
        ...updatedEmployee,
        documents: Array.isArray(updatedEmployee.documents) ? updatedEmployee.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
        startDate: updatedEmployee.startDate ? new Date(updatedEmployee.startDate) : null,
      };
      setEmployees(prev => prev.map(emp => emp.id === employeeId ? processedEmployee : emp).sort((a,b) => a.name.localeCompare(b.name)));
      return processedEmployee;
    } catch (error: any) {
      console.error("Error deleting employee document via API:", error);
      toast({ title: "Error Deleting Document", description: error.message || "Failed to delete document.", variant: "destructive" });
      return null;
    } finally {
      setLoadingEmployees(false);
    }
  }, [toast]);
  
  // getNextInvoiceNumber remains client-side as per previous logic for now
  const getNextInvoiceNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const yearInvoices = invoices.filter(inv => inv.invoiceNumber.startsWith(`INV-${year}`));
    const nextNum = yearInvoices.length + 1;
    return `INV-${year}-${String(nextNum).padStart(4, '0')}`;
  }, [invoices]);

  const addInvoice = useCallback(async (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'subTotal' | 'taxAmount' | 'grandTotal'>): Promise<Invoice | null> => {
    setLoadingInvoices(true);
    const payload = {
      ...invoiceData,
      invoiceDate: typeof invoiceData.invoiceDate === 'string' ? invoiceData.invoiceDate : invoiceData.invoiceDate.toISOString(),
      dueDate: typeof invoiceData.dueDate === 'string' ? invoiceData.dueDate : invoiceData.dueDate.toISOString(),
      invoiceNumber: getNextInvoiceNumber() // Client-generated for now
    };
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to add invoice (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to add invoice (Status: ${response.status})`);
      }
      const newInvoice: Invoice = await response.json();
      const processedInvoice = {
        ...newInvoice,
        invoiceDate: new Date(newInvoice.invoiceDate),
        dueDate: new Date(newInvoice.dueDate),
      };
      setInvoices(prev => [...prev, processedInvoice].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()));
      return processedInvoice;
    } catch (error: any) {
      console.error("Error adding invoice:", error);
      toast({ title: "Error Adding Invoice", description: error.message || "Could not add invoice.", variant: "destructive"});
      return null;
    } finally {
      setLoadingInvoices(false);
    }
  }, [toast, getNextInvoiceNumber]); 

  const updateInvoiceStatus = useCallback(async (invoiceId: string, status: Invoice['status']) => {
    setLoadingInvoices(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to update invoice status (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to update invoice status (Status: ${response.status})`);
      }
      const updatedInvoice: Invoice = await response.json();
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv.id === invoiceId 
            ? { ...updatedInvoice, invoiceDate: new Date(updatedInvoice.invoiceDate), dueDate: new Date(updatedInvoice.dueDate) }
            : inv
        )
      );
    } catch (error: any) {
        console.error("Error updating invoice status:", error);
        toast({ title: "Error Updating Invoice", description: error.message || "Could not update invoice status.", variant: "destructive"});
    } finally {
      setLoadingInvoices(false);
    }
  }, [toast]);

  const getInvoiceById = useCallback((invoiceId: string) => {
    // This will return from local state, which should be populated by the initial fetch.
    return invoices.find(inv => inv.id === invoiceId);
  }, [invoices]);


  const totalRevenue = useMemo(() => revenueEntries.reduce((sum, entry) => sum + entry.amount, 0), [revenueEntries]);
  const totalExpenses = useMemo(() => expenseEntries.reduce((sum, entry) => sum + entry.amount, 0), [expenseEntries]);
  const netProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

  return (
    <AppDataContext.Provider value={{ 
      revenueEntries, 
      expenseEntries, 
      employees, 
      invoices,
      addRevenueEntry, 
      addExpenseEntry,
      addEmployee, 
      addEmployeeDocument, 
      deleteEmployeeDocument, 
      getEmployeeById, 
      addInvoice,
      updateInvoiceStatus,
      getInvoiceById,
      getNextInvoiceNumber,
      totalRevenue,
      totalExpenses,
      netProfit,
      loadingEmployees,
      loadingRevenue,
      loadingExpenses,
      loadingInvoices,
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

