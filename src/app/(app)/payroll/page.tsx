
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAppData } from '@/context/app-data-context';
import type { Employee, TimeEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarDays, DollarSign, UserCheck, UserX, ClipboardList, Loader2, Info } from 'lucide-react';
import { format, getDaysInMonth as fnGetDaysInMonth, startOfMonth, eachDayOfInterval, endOfMonth, isSameDay } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i); // +/- 5 years
const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(0, i), 'MMMM') }));

export default function PayrollPage() {
  const { employees, loadingEmployees, timeEntries, addTimeEntry, removeTimeEntry, getDaysInMonth, getEmployeeById } = useAppData();
  const { toast } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (selectedEmployeeId) {
        const emp = await getEmployeeById(selectedEmployeeId);
        setSelectedEmployee(emp || null);
      } else {
        setSelectedEmployee(null);
      }
    };
    fetchEmployeeDetails();
  }, [selectedEmployeeId, getEmployeeById]);

  const daysInSelectedMonth = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, getDaysInMonth]);

  const employeeTimeEntriesForMonth = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return timeEntries.filter(entry => 
      entry.employeeId === selectedEmployeeId &&
      entry.date.getFullYear() === selectedYear &&
      entry.date.getMonth() === selectedMonth
    );
  }, [timeEntries, selectedEmployeeId, selectedYear, selectedMonth]);

  const presentDaysCount = useMemo(() => employeeTimeEntriesForMonth.length, [employeeTimeEntriesForMonth]);

  const handleAttendanceToggle = (day: Date) => {
    if (!selectedEmployeeId) {
      toast({ title: "No Employee Selected", description: "Please select an employee first.", variant: "destructive" });
      return;
    }
    const isCurrentlyPresent = employeeTimeEntriesForMonth.some(entry => isSameDay(entry.date, day));
    if (isCurrentlyPresent) {
      removeTimeEntry(selectedEmployeeId, day);
      toast({ title: "Attendance Updated", description: `${selectedEmployee?.name || 'Employee'} marked as absent for ${format(day, "PPP")}.` });
    } else {
      addTimeEntry(selectedEmployeeId, day);
      toast({ title: "Attendance Updated", description: `${selectedEmployee?.name || 'Employee'} marked as present for ${format(day, "PPP")}.` });
    }
  };

  const actualMonthlySalary = selectedEmployee?.actualSalary ?? 0;
  const totalDaysInMonthValue = daysInSelectedMonth.length;
  
  const calculatedSalary = useMemo(() => {
    if (!actualMonthlySalary || totalDaysInMonthValue === 0) return 0;
    return (actualMonthlySalary / totalDaysInMonthValue) * presentDaysCount;
  }, [actualMonthlySalary, totalDaysInMonthValue, presentDaysCount]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">Employee Payroll</h1>
      </div>
      <CardDescription>
        Select an employee and a period to manage attendance and calculate payroll. 
        Attendance data is currently stored client-side and will reset on page refresh.
      </CardDescription>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Selection & Setup</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="employee-select" className="text-sm font-medium">Employee</label>
            {loadingEmployees ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger id="employee-select" className="w-full">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="month-select" className="text-sm font-medium">Month</label>
            <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
              <SelectTrigger id="month-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="year-select" className="text-sm font-medium">Year</label>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger id="year-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedEmployeeId && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Select Employee</AlertTitle>
          <AlertDescription>Please select an employee to view and manage their payroll details for the chosen period.</AlertDescription>
        </Alert>
      )}

      {selectedEmployeeId && selectedEmployee && (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Attendance: {selectedEmployee.name} - {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}</CardTitle>
              <CardDescription>Click on a day to toggle attendance (Present/Absent).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                  <div key={dayName} className="text-center font-semibold text-sm text-muted-foreground p-1 md:p-2">{dayName}</div>
                ))}
                {/* Pad start for the first day of the month */}
                {Array.from({ length: daysInSelectedMonth[0]?.getDay() ?? 0 }).map((_, i) => (
                  <div key={`pad-${i}`} className="border rounded-md p-2 h-16 md:h-20" />
                ))}
                {daysInSelectedMonth.map(day => {
                  const isPresent = employeeTimeEntriesForMonth.some(entry => isSameDay(entry.date, day));
                  return (
                    <Button
                      key={day.toString()}
                      variant={isPresent ? "default" : "outline"}
                      onClick={() => handleAttendanceToggle(day)}
                      className={`h-16 md:h-20 flex flex-col items-center justify-center p-1 md:p-2 text-xs md:text-sm ${
                        isSameDay(day, new Date()) ? 'ring-2 ring-primary ring-offset-2' : ''
                      } ${isPresent ? 'bg-green-500 hover:bg-green-600 text-white' : 'hover:bg-muted/80'}`}
                    >
                      <span className="font-bold text-lg">{format(day, 'd')}</span>
                      {isPresent ? <UserCheck className="h-4 w-4 mt-1" /> : <UserX className="h-4 w-4 mt-1 text-muted-foreground" />}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Payroll Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-semibold">{selectedEmployee.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Period:</span>
                <span className="font-semibold">{format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Actual Monthly Salary:</span>
                <span className="font-semibold">{formatCurrency(actualMonthlySalary)}</span>
              </div>
               <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Days in Month:</span>
                <span className="font-semibold">{totalDaysInMonthValue}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Days Present:</span>
                <span className="font-semibold text-green-600">{presentDaysCount}</span>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
              <div className="flex justify-between items-center w-full">
                <span className="text-lg font-bold text-primary">Calculated Salary for Period:</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(calculatedSalary)}</span>
              </div>
            </CardFooter>
          </Card>
        </>
      )}
       <Alert variant="default" className="mt-6">
        <Info className="h-4 w-4"/>
        <AlertTitle>Data Persistence</AlertTitle>
        <AlertDescription>
          Employee attendance data marked on this page is stored locally in your browser for this session.
          It will be reset if you refresh the page or close the browser tab.
          For persistent time tracking, database integration for time entries would be required as a next step.
          Employee details (including salary) are fetched from the database.
        </AlertDescription>
      </Alert>
    </div>
  );
}
