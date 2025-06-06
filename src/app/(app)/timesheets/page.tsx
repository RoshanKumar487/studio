
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppData } from '@/context/app-data-context';
import type { TimesheetEntry, Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/shared/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const timesheetSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  date: z.date({ required_error: "Date is required." }),
  hours: z.coerce.number().min(0.1, "Hours must be positive.").max(24, "Hours cannot exceed 24."),
  taskDescription: z.string().min(3, "Task description is required.").max(200),
});

type TimesheetFormData = z.infer<typeof timesheetSchema>;

export default function TimesheetsPage() {
  const { employees, timesheetEntries, addTimesheetEntry, getEmployeeById } = useAppData();
  const { toast } = useToast();

  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      employeeId: '',
      date: new Date(),
      hours: 0,
      taskDescription: '',
    },
  });

  const onSubmit: SubmitHandler<TimesheetFormData> = (data) => {
    addTimesheetEntry(data);
    const employee = getEmployeeById(data.employeeId);
    toast({
      title: "Timesheet Entry Added",
      description: `Logged ${data.hours} hours for ${employee?.name || 'employee'} on ${format(data.date, "PPP")}.`,
    });
    form.reset({ employeeId: '', date: new Date(), hours: 0, taskDescription: '' });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center">
        <Clock className="mr-3 h-8 w-8 text-primary" /> Timesheet Management
      </h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><PlusCircle className="mr-2 h-6 w-6 text-primary" /> Log New Timesheet Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Worked</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 8" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="taskDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Worked on Project X feature" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full md:w-auto">Log Time</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Timesheet History</CardTitle>
        </CardHeader>
        <CardContent>
          {timesheetEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Task Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheetEntries.map((entry) => {
                  const employee = getEmployeeById(entry.employeeId);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{employee?.name || 'Unknown Employee'}</TableCell>
                      <TableCell>{format(entry.date, "PPP")}</TableCell>
                      <TableCell>{entry.hours.toFixed(1)}</TableCell>
                      <TableCell>{entry.taskDescription}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No timesheet entries yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
