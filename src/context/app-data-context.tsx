
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
  updateInvoice: (invoiceId: string, invoiceData: Partial<Omit<Invoice, 'id' | 'invoiceNumber' | 'subTotal' | 'taxAmount' | 'grandTotal'>>) => Promise<Invoice | null>;
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
      // Fetch Employees
      try {
        setLoadingEmployees(true);
        const empResponse = await fetch('/api/employees');
        if (!empResponse.ok) {
          if (empResponse.status === 503) {
            console.warn("Database not configured for employees. Skipping initial employee load.");
            toast({ title: "Employee Data Unavailable", description: "Database not configured. Employee features may be limited.", variant: "default" });
            setEmployees([]);
          } else {
            throw new Error(`Failed to fetch employees (Status: ${empResponse.status})`);
          }
        } else {
          const empData: Employee[] = await empResponse.json();
          setEmployees(empData.map(emp => ({
              ...emp,
              documents: Array.isArray(emp.documents) ? emp.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
              startDate: emp.startDate ? new Date(emp.startDate) : null,
              actualSalary: emp.actualSalary === undefined ? null : emp.actualSalary,
          })).sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (error: any) {
        console.error("Error fetching employees:", error);
        toast({ title: "Error Loading Employees", description: error.message || "Could not load employee data.", variant: "destructive"});
        setEmployees([]); // Set to empty on error
      } finally {
        setLoadingEmployees(false);
      }

      // Fetch Revenue
      try {
        setLoadingRevenue(true);
        const revResponse = await fetch('/api/revenue');
        if (!revResponse.ok) {
           if (revResponse.status === 503) {
            console.warn("Database not configured for revenue. Skipping initial revenue load.");
            toast({ title: "Revenue Data Unavailable", description: "Database not configured. Revenue features may be limited.", variant: "default" });
            setRevenueEntries([]);
          } else {
            throw new Error(`Failed to fetch revenue (Status: ${revResponse.status})`);
          }
        } else {
          const revData: RevenueEntry[] = await revResponse.json();
          setRevenueEntries(revData.map(r => ({...r, date: new Date(r.date)})));
        }
      } catch (error: any) {
        console.error("Error fetching revenue:", error);
        toast({ title: "Error Loading Revenue", description: error.message || "Could not load revenue data.", variant: "destructive"});
        setRevenueEntries([]);
      } finally {
        setLoadingRevenue(false);
      }

      // Fetch Expenses
      try {
        setLoadingExpenses(true);
        const expResponse = await fetch('/api/expenses');
        if (!expResponse.ok) {
          if (expResponse.status === 503) {
            console.warn("Database not configured for expenses. Skipping initial expense load.");
            toast({ title: "Expense Data Unavailable", description: "Database not configured. Expense features may be limited.", variant: "default" });
            setExpenseEntries([]);
          } else {
            throw new Error(`Failed to fetch expenses (Status: ${expResponse.status})`);
          }
        } else {
          const expData: ExpenseEntry[] = await expResponse.json();
          setExpenseEntries(expData.map(e => ({...e, date: new Date(e.date)})));
        }
      } catch (error: any) {
        console.error("Error fetching expenses:", error);
        toast({ title: "Error Loading Expenses", description: error.message || "Could not load expense data.", variant: "destructive"});
        setExpenseEntries([]);
      } finally {
        setLoadingExpenses(false);
      }

      // Fetch Invoices
      try {
        setLoadingInvoices(true);
        const invResponse = await fetch('/api/invoices');
        if (!invResponse.ok) {
          if (invResponse.status === 503) {
            console.warn("Database not configured for invoices. Skipping initial invoice load.");
            toast({ title: "Invoice Data Unavailable", description: "Database not configured. Invoicing features may be limited.", variant: "default" });
            setInvoices([]);
          } else {
            throw new Error(`Failed to fetch invoices (Status: ${invResponse.status})`);
          }
        } else {
          const invData: Invoice[] = await invResponse.json();
          setInvoices(invData.map(i => ({
              ...i, 
              invoiceDate: new Date(i.invoiceDate), 
              dueDate: new Date(i.dueDate)
          })));
        }
      } catch (error: any) {
        console.error("Error fetching invoices:", error);
        toast({ title: "Error Loading Invoices", description: error.message || "Could not load invoice data.", variant: "destructive"});
        setInvoices([]);
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
      const payload = {
        ...entry,
        date: typeof entry.date === 'string' ? entry.date : entry.date.toISOString(),
        documentFileName: entry.documentFileName || undefined,
        documentFileType: entry.documentFileType || undefined,
        documentFileSize: entry.documentFileSize || undefined,
        submittedBy: entry.submittedBy || undefined,
      };
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    setLoadingEmployees(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (!response.ok) {
        if (response.status === 404) return undefined; 
        if (response.status === 503) {
            console.warn(`Database not configured. Cannot fetch employee ${employeeId}.`);
            toast({ title: "Employee Data Unavailable", description: "Database not configured. Cannot load specific employee.", variant: "default"});
            return undefined;
        }
        const errorData = await response.json().catch(() => ({message: `Failed to fetch employee ${employeeId} (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to fetch employee ${employeeId} (Status: ${response.status})`);
      }
      const employee: Employee = await response.json();
      return {
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
    setLoadingEmployees(true); 
    try {
      const response = await fetch(`/api/employees/${employeeId}/documents`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to add document (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to add document (Status: ${response.status})`);
      }
      const updatedEmployee: Employee = await response.json(); 
      const processedEmployee = {
        ...updatedEmployee,
        documents: Array.isArray(updatedEmployee.documents) ? updatedEmployee.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
        startDate: updatedEmployee.startDate ? new Date(updatedEmployee.startDate) : null,
        actualSalary: updatedEmployee.actualSalary === undefined ? null : updatedEmployee.actualSalary,
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
        actualSalary: updatedEmployee.actualSalary === undefined ? null : updatedEmployee.actualSalary,
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
      invoiceNumber: getNextInvoiceNumber(),
      customColumnHeader: invoiceData.customColumnHeader || undefined,
      lineItems: invoiceData.lineItems.map(li => ({...li, customColumnValue: li.customColumnValue || undefined})),
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
  }, [toast, getNextInvoiceNumber, invoices]); 

  const updateInvoice = useCallback(async (invoiceId: string, invoiceData: Partial<Omit<Invoice, 'id' | 'invoiceNumber' | 'subTotal' | 'taxAmount' | 'grandTotal'>>): Promise<Invoice | null> => {
    setLoadingInvoices(true);
    const payload = {
      ...invoiceData,
      invoiceDate: invoiceData.invoiceDate ? (typeof invoiceData.invoiceDate === 'string' ? invoiceData.invoiceDate : (invoiceData.invoiceDate as Date).toISOString()) : undefined,
      dueDate: invoiceData.dueDate ? (typeof invoiceData.dueDate === 'string' ? invoiceData.dueDate : (invoiceData.dueDate as Date).toISOString()) : undefined,
      customColumnHeader: invoiceData.customColumnHeader || undefined,
      lineItems: invoiceData.lineItems?.map(li => ({...li, customColumnValue: li.customColumnValue || undefined})),
    };
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Failed to update invoice (Status: ${response.status})`}));
        throw new Error(errorData.message || `Failed to update invoice (Status: ${response.status})`);
      }
      const updatedInvoice: Invoice = await response.json();
      const processedInvoice = {
        ...updatedInvoice,
        invoiceDate: new Date(updatedInvoice.invoiceDate),
        dueDate: new Date(updatedInvoice.dueDate),
      };
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => 
          inv.id === invoiceId 
            ? processedInvoice
            : inv
        ).sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
      );
      return processedInvoice;
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({ title: "Error Updating Invoice", description: error.message || "Could not update invoice.", variant: "destructive"});
      return null;
    } finally {
      setLoadingInvoices(false);
    }
  }, [toast]);

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
        toast({ title: "Error Updating Invoice Status", description: errorData.message || "Could not update invoice status.", variant: "destructive"});
        return; 
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
        toast({ title: "Error Updating Invoice Status", description: error.message || "Could not update invoice status.", variant: "destructive"});
    } finally {
      setLoadingInvoices(false); 
    }
  }, [toast]);

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
      employees, 
      invoices,
      addRevenueEntry, 
      addExpenseEntry,
      addEmployee, 
      addEmployeeDocument, 
      deleteEmployeeDocument, 
      getEmployeeById, 
      addInvoice,
      updateInvoice,
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
