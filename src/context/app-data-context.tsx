
"use client";

import type { RevenueEntry, ExpenseEntry, Employee, EmployeeDocument, Invoice } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface AppDataContextType {
  revenueEntries: RevenueEntry[];
  expenseEntries: ExpenseEntry[];
  employees: Employee[];
  invoices: Invoice[];
  
  addRevenueEntry: (entry: Omit<RevenueEntry, 'id' | 'date'> & { date: string | Date }) => void;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id' | 'date'> & { date: string | Date }) => void;
  
  addEmployee: (employeeData: Omit<Employee, 'id' | 'documents'>) => Promise<Employee | null>;
  addEmployeeDocument: (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>) => Promise<Employee | null>;
  deleteEmployeeDocument: (employeeId: string, documentId: string) => Promise<Employee | null>;
  getEmployeeById: (employeeId: string) => Promise<Employee | undefined>; 
  
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

const initialRevenue: RevenueEntry[] = [
  { id: uuidv4(), date: new Date(2024, 6, 1), amount: 1200, description: "Web design project" },
  { id: uuidv4(), date: new Date(2024, 6, 5), amount: 750, description: "Consulting services" },
];
const initialExpenses: ExpenseEntry[] = [
  { id: uuidv4(), date: new Date(2024, 6, 2), amount: 150, category: "Software", description: "Subscription for design tool" },
  { id: uuidv4(), date: new Date(2024, 6, 7), amount: 80, category: "Marketing", description: "Online ads" },
  { id: uuidv4(), date: new Date(2024, 6, 10), amount: 250, category: "Utilities", description: "Office electricity bill" },
  { id: uuidv4(), date: new Date(2024, 6, 12), amount: 65, category: "Office Supplies", description: "Stationery purchase" },
];

const initialInvoices: Invoice[] = [];

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>(initialRevenue);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>(initialExpenses);
  const [employees, setEmployees] = useState<Employee[]>([]); 
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await fetch('/api/employees');
        if (!response.ok) {
          let errorMessage = `Failed to fetch employees`;
          try {
            const errorData = await response.json();
            if (errorData && errorData.message) {
              errorMessage += `: ${errorData.message}`;
            }
          } catch (e) { /* ignore, use base message */ }
          errorMessage += ` (Status: ${response.status})`;
          throw new Error(errorMessage);
        }
        const data: Employee[] = await response.json();
        const employeesWithEnsuredFields = data.map(emp => ({
            ...emp,
            documents: Array.isArray(emp.documents) ? emp.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
            startDate: emp.startDate ? new Date(emp.startDate) : null,
            actualSalary: emp.actualSalary === undefined ? null : emp.actualSalary,
        }));
        setEmployees(employeesWithEnsuredFields.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching employees from API:", error);
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

  const addEmployee = useCallback(async (employeeData: Omit<Employee, 'id' | 'documents'>): Promise<Employee | null> => {
    setLoadingEmployees(true);
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });
      if (!response.ok) {
        let errorMessage = `Failed to add employee`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.message) errorMessage += `: ${errorData.message}`;
        } catch (e) { /* ignore */ }
        errorMessage += ` (Status: ${response.status})`;
        throw new Error(errorMessage);
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
    } catch (error) {
      console.error("Error adding employee via API:", error);
      throw error; 
    } finally {
      setLoadingEmployees(false);
    }
  }, []);
  
  const getEmployeeById = useCallback(async (employeeId: string): Promise<Employee | undefined> => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (!response.ok) {
        if (response.status === 404) return undefined; 
        let errorMessage = `Failed to fetch employee ${employeeId}`;
         try {
          const errorData = await response.json();
          if (errorData && errorData.message) errorMessage += `: ${errorData.message}`;
        } catch (e) { /* Failed to parse JSON */ }
        errorMessage += ` (Status: ${response.status})`;
        throw new Error(errorMessage);
      }
      const employee: Employee = await response.json();
      const processedEmployee = {
          ...employee,
          documents: Array.isArray(employee.documents) ? employee.documents.map(doc => ({...doc, uploadedAt: new Date(doc.uploadedAt)})) : [],
          startDate: employee.startDate ? new Date(employee.startDate) : null,
          actualSalary: employee.actualSalary === undefined ? null : employee.actualSalary,
      };
      return processedEmployee;
    } catch (error) {
      console.error(`Error fetching employee ${employeeId} from API:`, error);
      throw error;
    }
  }, []);


  const addEmployeeDocument = useCallback(async (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>): Promise<Employee | null> => {
    const newDocumentBase: Partial<EmployeeDocument> = {
      ...documentData,
      id: uuidv4(), 
      uploadedAt: new Date() 
    };
    
    setLoadingEmployees(true);
    try {
      const currentEmployeeResponse = await fetch(`/api/employees/${employeeId}`);
      if (!currentEmployeeResponse.ok) {
        let errorMessage = `Failed to fetch employee before adding document`;
        try { const errorData = await currentEmployeeResponse.json(); if (errorData && errorData.message) errorMessage += `: ${errorData.message}`; } catch (e) {}
        errorMessage += ` (Status: ${currentEmployeeResponse.status})`;
        throw new Error(errorMessage);
      }
      const currentEmployee: Employee = await currentEmployeeResponse.json();
      const existingDocuments = Array.isArray(currentEmployee.documents) ? currentEmployee.documents : [];
      
      const updatedDocuments = [...existingDocuments, newDocumentBase as EmployeeDocument]
                                .sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: updatedDocuments }), 
      });

      if (!response.ok) {
        let errorMessage = `Failed to add employee document`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) errorMessage += `: ${errorData.message}`;
        } catch (e) { /* Failed to parse JSON */ }
        errorMessage += ` (Status: ${response.status})`;
        throw new Error(errorMessage);
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
    } catch (error) {
      console.error("Error adding employee document via API:", error);
      throw error;
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const deleteEmployeeDocument = useCallback(async (employeeId: string, documentId: string): Promise<Employee | null> => {
    setLoadingEmployees(true);
    try {
      const currentEmployeeResponse = await fetch(`/api/employees/${employeeId}`);
      if (!currentEmployeeResponse.ok) {
         let errorMessage = `Failed to fetch employee before deleting document`;
        try { const errorData = await currentEmployeeResponse.json(); if (errorData && errorData.message) errorMessage += `: ${errorData.message}`; } catch (e) {}
        errorMessage += ` (Status: ${currentEmployeeResponse.status})`;
        throw new Error(errorMessage);
      }
      const currentEmployee: Employee = await currentEmployeeResponse.json();
      const existingDocuments = Array.isArray(currentEmployee.documents) ? currentEmployee.documents : [];
      const updatedDocuments = existingDocuments.filter(doc => doc.id !== documentId);

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: updatedDocuments }),
      });
      if (!response.ok) {
        let errorMessage = `Failed to delete employee document`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) errorMessage += `: ${errorData.message}`;
        } catch (e) { /* Failed to parse JSON */ }
        errorMessage += ` (Status: ${response.status})`;
        throw new Error(errorMessage);
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
    } catch (error) {
      console.error("Error deleting employee document via API:", error);
      throw error;
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

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
      employeeId: invoiceData.employeeId || undefined,
      serviceProviderName: invoiceData.serviceProviderName || undefined,
    };
    setInvoices(prev => [...prev, newInvoice].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()));
    return newInvoice;
  }, [getNextInvoiceNumber]); 

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
