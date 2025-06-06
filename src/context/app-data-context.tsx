
"use client";

import type { RevenueEntry, ExpenseEntry, Appointment, Employee, EmployeeDocument, TimesheetEntry, Invoice, InvoiceLineItem } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import { addDays } from 'date-fns';

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
  
  addEmployee: (employeeData: Omit<Employee, 'id' | 'documents'>) => Employee;
  addEmployeeDocument: (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>) => void;
  getEmployeeById: (employeeId: string) => Employee | undefined;

  addTimesheetEntry: (entry: Omit<TimesheetEntry, 'id'>) => void;
  getTimesheetsByEmployee: (employeeId: string) => TimesheetEntry[];
  
  addInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'subTotal' | 'taxAmount' | 'grandTotal'>) => Invoice;
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status']) => void;
  getInvoiceById: (invoiceId: string) => Invoice | undefined;
  getNextInvoiceNumber: () => string;

  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Sample initial data
const initialEmployees: Employee[] = [
  { id: uuidv4(), name: "Alice Wonderland", email: "alice@example.com", documents: [] },
  { id: uuidv4(), name: "Bob The Builder", email: "bob@example.com", documents: [] },
];

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
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>(initialTimesheetEntries);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

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

  const addEmployee = useCallback((employeeData: Omit<Employee, 'id' | 'documents'>) => {
    const newEmployee: Employee = {
      ...employeeData,
      id: uuidv4(),
      documents: [],
    };
    setEmployees(prev => [...prev, newEmployee]);
    return newEmployee;
  }, []);

  const addEmployeeDocument = useCallback((employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, documents: [...emp.documents, { ...documentData, id: uuidv4(), uploadedAt: new Date() }] }
          : emp
      )
    );
  }, []);
  
  const getEmployeeById = useCallback((employeeId: string) => {
    return employees.find(emp => emp.id === employeeId);
  }, [employees]);

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
    const subTotal = invoiceData.lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subTotal * invoiceData.taxRate;
    const grandTotal = subTotal + taxAmount;
    
    const newInvoice: Invoice = {
      ...invoiceData,
      id: uuidv4(),
      invoiceNumber: getNextInvoiceNumber(),
      subTotal,
      taxAmount,
      grandTotal,
    };
    setInvoices(prev => [...prev, newInvoice].sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime()));
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
      appointments, 
      employees,
      timesheetEntries,
      invoices,
      addRevenueEntry, 
      addExpenseEntry,
      addAppointment,
      addEmployee,
      addEmployeeDocument,
      getEmployeeById,
      addTimesheetEntry,
      getTimesheetsByEmployee,
      addInvoice,
      updateInvoiceStatus,
      getInvoiceById,
      getNextInvoiceNumber,
      totalRevenue,
      totalExpenses,
      netProfit
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
