
"use client";

import type { RevenueEntry, ExpenseEntry, Appointment, Employee, EmployeeDocument, TimesheetEntry, Invoice } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';

interface AppDataContextType {
  revenueEntries: RevenueEntry[];
  expenseEntries: ExpenseEntry[];
  appointments: Appointment[];
  employees: Employee[]; // Will now come from Firestore
  timesheetEntries: TimesheetEntry[];
  invoices: Invoice[];

  addRevenueEntry: (entry: Omit<RevenueEntry, 'id' | 'date'> & { date: string | Date }) => void;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id' | 'date'> & { date: string | Date }) => void;
  addAppointment: (entry: Omit<Appointment, 'id' | 'date'> & { date: string | Date }) => void;
  
  addEmployee: (employeeData: Omit<Employee, 'id' | 'documents'>) => Promise<Employee | null>;
  addEmployeeDocument: (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>) => Promise<void>;
  deleteEmployeeDocument: (employeeId: string, documentId: string) => Promise<void>;
  getEmployeeById: (employeeId: string) => Promise<Employee | undefined>; // Now async

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
  
  const [employees, setEmployees] = useState<Employee[]>([]); // Initial empty, will be fetched
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);

  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>(initialTimesheetEntries);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  // Fetch employees from Firestore on mount and listen for real-time updates
  useEffect(() => {
    setLoadingEmployees(true);
    const employeesCollectionRef = collection(db, "employees");
    const q = query(employeesCollectionRef, orderBy("name")); // Order by name

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedEmployees: Employee[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedEmployees.push({ 
          id: doc.id, 
          name: data.name,
          email: data.email,
          documents: (data.documents || []).map((d: any) => ({
            ...d,
            // Firestore timestamps need to be converted to JS Date objects
            uploadedAt: d.uploadedAt instanceof Timestamp ? d.uploadedAt.toDate() : new Date(d.uploadedAt) 
          })),
        });
      });
      setEmployees(fetchedEmployees);
      setLoadingEmployees(false);
    }, (error) => {
      console.error("Error fetching employees:", error);
      setLoadingEmployees(false);
      // Handle error appropriately in UI
    });

    return () => unsubscribe(); // Cleanup listener on unmount
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

  // --- Employee Functions (Firestore) ---
  const addEmployee = useCallback(async (employeeData: Omit<Employee, 'id' | 'documents'>): Promise<Employee | null> => {
    try {
      const docRef = await addDoc(collection(db, "employees"), {
        ...employeeData,
        documents: [], // Initialize with empty documents array
        createdAt: serverTimestamp() // Optional: add a server timestamp
      });
      // We don't get the full doc back immediately with serverTimestamp, 
      // but onSnapshot will update the local state.
      // For immediate use, we can construct a partial object or re-fetch.
      // For simplicity, we rely on onSnapshot for UI update.
      return { ...employeeData, id: docRef.id, documents: [] };
    } catch (error) {
      console.error("Error adding employee: ", error);
      return null;
    }
  }, []);
  
  const getEmployeeById = useCallback(async (employeeId: string): Promise<Employee | undefined> => {
    // This function could fetch from local state if already populated by onSnapshot
    // or directly fetch from Firestore if needed for a one-off.
    // For now, it uses the local state which is updated by onSnapshot.
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) return employee;

    // Fallback to direct fetch if not found (e.g., if onSnapshot hasn't updated yet)
    try {
      const docRef = doc(db, "employees", employeeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { 
          id: docSnap.id,
          name: data.name,
          email: data.email,
          documents: (data.documents || []).map((d: any) => ({
             ...d,
            uploadedAt: d.uploadedAt instanceof Timestamp ? d.uploadedAt.toDate() : new Date(d.uploadedAt)
          })),
        } as Employee;
      } else {
        console.log("No such employee document!");
        return undefined;
      }
    } catch (error) {
      console.error("Error getting employee by ID:", error);
      return undefined;
    }
  }, [employees]);


  const addEmployeeDocument = useCallback(async (employeeId: string, documentData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>): Promise<void> => {
    const employeeRef = doc(db, "employees", employeeId);
    try {
      const employeeDoc = await getDoc(employeeRef);
      if (employeeDoc.exists()) {
        const currentData = employeeDoc.data();
        const existingDocuments = (currentData?.documents || []).map((d: any) => ({
            ...d,
            uploadedAt: d.uploadedAt instanceof Timestamp ? d.uploadedAt.toDate() : new Date(d.uploadedAt)
        }));
        
        const newDocument: EmployeeDocument = {
          ...documentData,
          id: uuidv4(), // Generate a unique ID for the document within the array
          uploadedAt: new Date() // Use client-side date, or serverTimestamp for sub-field
        };

        await updateDoc(employeeRef, {
          documents: [...existingDocuments, newDocument].sort((a,b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        });
        // Local state will update via onSnapshot
      } else {
        console.error("Employee not found for adding document");
      }
    } catch (error) {
      console.error("Error adding employee document: ", error);
    }
  }, []);

  const deleteEmployeeDocument = useCallback(async (employeeId: string, documentId: string): Promise<void> => {
    const employeeRef = doc(db, "employees", employeeId);
    try {
      const employeeDoc = await getDoc(employeeRef);
      if (employeeDoc.exists()) {
        const currentData = employeeDoc.data();
        const updatedDocuments = (currentData?.documents || [])
          .map((d: any) => ({
            ...d,
            uploadedAt: d.uploadedAt instanceof Timestamp ? d.uploadedAt.toDate() : new Date(d.uploadedAt)
           }))
          .filter((doc: EmployeeDocument) => doc.id !== documentId);
        
        await updateDoc(employeeRef, {
          documents: updatedDocuments
        });
        // Local state will update via onSnapshot
      } else {
        console.error("Employee not found for deleting document");
      }
    } catch (error) {
      console.error("Error deleting employee document: ", error);
    }
  }, []);


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
  }, [getNextInvoiceNumber, invoices]); // Added invoices to dependency array for getNextInvoiceNumber

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
      employees, // From Firestore
      timesheetEntries,
      invoices,
      addRevenueEntry, 
      addExpenseEntry,
      addAppointment,
      addEmployee, // Firestore
      addEmployeeDocument, // Firestore
      deleteEmployeeDocument, // Firestore
      getEmployeeById, // Firestore
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
