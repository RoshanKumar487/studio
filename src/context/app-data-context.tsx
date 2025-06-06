"use client";

import type { RevenueEntry, ExpenseEntry, Appointment } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

interface AppDataContextType {
  revenueEntries: RevenueEntry[];
  expenseEntries: ExpenseEntry[];
  appointments: Appointment[];
  addRevenueEntry: (entry: Omit<RevenueEntry, 'id' | 'date'> & { date: string | Date }) => void;
  addExpenseEntry: (entry: Omit<ExpenseEntry, 'id' | 'date'> & { date: string | Date }) => void;
  addAppointment: (entry: Omit<Appointment, 'id' | 'date'> & { date: string | Date }) => void;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Sample initial data (can be empty arrays for a fresh start)
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


export function AppDataProvider({ children }: { children: ReactNode }) {
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>(initialRevenue);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>(initialExpenses);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

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

  const totalRevenue = revenueEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <AppDataContext.Provider value={{ 
      revenueEntries, 
      expenseEntries, 
      appointments, 
      addRevenueEntry, 
      addExpenseEntry,
      addAppointment,
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
