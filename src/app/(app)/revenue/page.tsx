"use client";

import React, { useState, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppData } from '@/context/app-data-context';
import type { RevenueEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/shared/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const revenueSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  amount: z.coerce.number().min(0.01, "Amount must be positive."),
  description: z.string().min(1, "Description is required.").max(200, "Description too long."),
});

type RevenueFormData = z.infer<typeof revenueSchema>;

type SortKey = keyof RevenueEntry | '';
type SortDirection = 'asc' | 'desc';

export default function RevenuePage() {
  const { revenueEntries, addRevenueEntry } = useAppData();
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      description: '',
    },
  });

  const onSubmit: SubmitHandler<RevenueFormData> = (data) => {
    addRevenueEntry(data);
    toast({
      title: "Revenue Added",
      description: `Successfully added ${data.description}.`,
    });
    form.reset({ date: new Date(), amount: 0, description: '' });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedRevenueEntries = useMemo(() => {
    if (!sortKey) return revenueEntries;
    return [...revenueEntries].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (valA === undefined || valB === undefined) return 0;
      
      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (valA instanceof Date && valB instanceof Date) {
        comparison = valA.getTime() - valB.getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [revenueEntries, sortKey, sortDirection]);
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Revenue Management</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><PlusCircle className="mr-2 h-6 w-6 text-primary" /> Add New Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Project Alpha payment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full md:w-auto">Add Revenue</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Revenue History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedRevenueEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('date')} className="cursor-pointer hover:bg-muted/80">
                    <div className="flex items-center">Date <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('description')} className="cursor-pointer hover:bg-muted/80">
                     <div className="flex items-center">Description <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('amount')} className="text-right cursor-pointer hover:bg-muted/80">
                     <div className="flex items-center justify-end">Amount <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRevenueEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(entry.date, "PPP")}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No revenue entries yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
