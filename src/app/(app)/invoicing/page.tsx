
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm, useFieldArray, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppData } from '@/context/app-data-context';
import type { Invoice, InvoiceLineItem, Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/shared/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, PlusCircle, Trash2, Eye, Sparkles, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from 'date-fns';
import { processInvoiceQuery, type ProcessInvoiceQueryInput, type ProcessInvoiceQueryOutput } from '@/ai/flows/process-invoice-query-flow';


const lineItemSchema = z.object({
  id: z.string().optional(), 
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.1, "Quantity must be positive"),
  unitPrice: z.coerce.number().min(0.01, "Unit price must be positive"),
  total: z.coerce.number().optional() 
});

const invoiceSchema = z.object({
  employeeId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerAddress: z.string().optional(),
  invoiceDate: z.date({ required_error: "Invoice date is required."}),
  dueDate: z.date({ required_error: "Due date is required."}),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  taxRate: z.coerce.number().min(0).max(1).default(0), 
  notes: z.string().optional(),
  status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue']).default('Draft'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function InvoicingPage() {
  const { employees, invoices, addInvoice, getNextInvoiceNumber, getInvoiceById, updateInvoiceStatus } = useAppData();
  const { toast } = useToast();
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);

  const [aiInvoiceQuery, setAiInvoiceQuery] = useState("");
  const [isAiInvoiceLoading, setIsAiInvoiceLoading] = useState(false);
  const [aiInvoiceResult, setAiInvoiceResult] = useState<ProcessInvoiceQueryOutput | null>(null);
  const [queriedInvoiceDetails, setQueriedInvoiceDetails] = useState<Invoice | null>(null);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerName: '',
      customerAddress: '',
      invoiceDate: new Date(),
      dueDate: addDays(new Date(), 30),
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
      taxRate: 0,
      notes: '',
      status: 'Draft',
      employeeId: undefined, 
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedLineItems = form.watch("lineItems");

  const onSubmit: SubmitHandler<InvoiceFormData> = (data) => {
    const processedData = {
      ...data,
      lineItems: data.lineItems.map(item => ({
        ...item,
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      })),
    };
    const newInvoice = addInvoice(processedData);
    toast({
      title: "Invoice Created",
      description: `Invoice ${newInvoice.invoiceNumber} for ${data.customerName} has been created.`,
    });
    form.reset({
      customerName: '',
      customerAddress: '',
      invoiceDate: new Date(),
      dueDate: addDays(new Date(), 30),
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
      taxRate: 0,
      notes: '',
      status: 'Draft',
      employeeId: undefined,
    });
    setIsInvoiceFormOpen(false);
  };
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const handleAiInvoiceQuery = async () => {
    if (!aiInvoiceQuery.trim()) {
      toast({ title: "Input Required", description: "Please provide a query for the AI.", variant: "destructive" });
      return;
    }
    setIsAiInvoiceLoading(true);
    setAiInvoiceResult(null);
    setQueriedInvoiceDetails(null);
    try {
      const result = await processInvoiceQuery({ query: aiInvoiceQuery });
      setAiInvoiceResult(result);

      if (result.intent === 'get_details' && result.invoiceNumber) {
        const foundInvoice = getInvoiceById(result.invoiceNumber);
        if (foundInvoice) {
          setQueriedInvoiceDetails(foundInvoice);
          toast({ title: "Invoice Found", description: `Details for ${result.invoiceNumber} displayed.` });
        } else {
          toast({ title: "Not Found", description: `Invoice ${result.invoiceNumber} not found.`, variant: "destructive" });
        }
      } else if (result.intent === 'update_status' && result.invoiceNumber && result.newStatus) {
        const foundInvoice = getInvoiceById(result.invoiceNumber);
        if (foundInvoice) {
          updateInvoiceStatus(result.invoiceNumber, result.newStatus);
          toast({ title: "Invoice Updated", description: `Status of ${result.invoiceNumber} changed to ${result.newStatus}.` });
        } else {
          toast({ title: "Not Found", description: `Invoice ${result.invoiceNumber} not found for update.`, variant: "destructive" });
        }
      } else if (result.intent === 'unknown' || !result.invoiceNumber) {
         toast({ title: "AI Query", description: result.message, variant: result.message.startsWith("Sorry") ? "default" : "destructive" });
      }
    } catch (error: any) {
      console.error("AI Invoice Query Error:", error);
      toast({ title: "Error", description: error.message || "Failed to process query using AI.", variant: "destructive" });
      setAiInvoiceResult({ intent: 'unknown', message: error.message || "An unexpected error occurred." });
    } finally {
      setIsAiInvoiceLoading(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center">
          <FileSpreadsheet className="mr-3 h-8 w-8 text-primary" /> Invoicing
        </h1>
        <Button onClick={() => setIsInvoiceFormOpen(true)}>
          <PlusCircle className="mr-2 h-5 w-5" /> Create New Invoice
        </Button>
      </div>

      {isInvoiceFormOpen && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">New Invoice ({getNextInvoiceNumber()})</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="customerName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer/Company Name</FormLabel>
                      <FormControl><Input placeholder="e.g., Acme Corp" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="employeeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Employee (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {employees.map(emp => (<SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                </div>
                <FormField control={form.control} name="customerAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Address (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., 123 Main St, Anytown, USA" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Invoice Date</FormLabel><DatePicker date={field.value} setDate={field.onChange} /><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><DatePicker date={field.value} setDate={field.onChange} /><FormMessage /></FormItem>
                  )} />
                </div>

                <CardTitle className="text-xl pt-4 font-headline">Line Items</CardTitle>
                {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end p-3 border rounded-md">
                    <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (
                      <FormItem><FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            {...field} 
                            value={isNaN(Number(field.value)) ? '' : field.value}
                            onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                      <FormItem><FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            value={isNaN(Number(field.value)) ? '' : field.value}
                            onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormItem>
                        <FormLabel>Total</FormLabel>
                        <Input 
                            type="text" 
                            readOnly 
                            disabled 
                            value={formatCurrency((Number(watchedLineItems[index]?.quantity) || 0) * (Number(watchedLineItems[index]?.unitPrice) || 0))} 
                            className="bg-muted"
                        />
                    </FormItem>
                    <Button type="button" variant="outline" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, total: 0 })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
                </Button>
                
                <div className="grid md:grid-cols-2 gap-4 pt-4">
                    <FormField control={form.control} name="taxRate" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tax Rate (e.g., 0.1 for 10%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="e.g., 0.07" 
                            {...field} 
                            value={isNaN(Number(field.value)) ? '' : field.value}
                            onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                            {['Draft', 'Sent', 'Paid', 'Overdue'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes/Terms (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Payment due within 30 days." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setIsInvoiceFormOpen(false); form.reset(); }}>Cancel</Button>
                    <Button type="submit">Create Invoice</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI Invoice Assistant</CardTitle>
          <CardDescription>Ask to see invoice details or update status. E.g., "Show INV-2024-0001" or "Mark INV-2024-0001 as Paid".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your invoice query here..."
            value={aiInvoiceQuery}
            onChange={(e) => setAiInvoiceQuery(e.target.value)}
            rows={3}
          />
          <Button onClick={handleAiInvoiceQuery} disabled={isAiInvoiceLoading}>
            {isAiInvoiceLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {isAiInvoiceLoading ? 'Processing...' : 'Process Query with AI'}
          </Button>
          {aiInvoiceResult && aiInvoiceResult.intent === 'unknown' && (
            <Alert variant="default">
              <AlertTitle>AI Response</AlertTitle>
              <AlertDescription>{aiInvoiceResult.message}</AlertDescription>
            </Alert>
          )}
          {queriedInvoiceDetails && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Details for {queriedInvoiceDetails.invoiceNumber}</CardTitle>
                <CardDescription>Status: {queriedInvoiceDetails.status}, Due: {format(queriedInvoiceDetails.dueDate, "PPP")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p><strong>Customer:</strong> {queriedInvoiceDetails.customerName}</p>
                <p><strong>Total:</strong> {formatCurrency(queriedInvoiceDetails.grandTotal)}</p>
                <Link href={`/invoicing/${queriedInvoiceDetails.id}`} className="mt-2">
                  <Button variant="outline" size="sm">View Full Invoice <Eye className="ml-2 h-4 w-4" /></Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>


      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="font-headline">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{format(invoice.invoiceDate, "PPP")}</TableCell>
                    <TableCell>{format(invoice.dueDate, "PPP")}</TableCell>
                    <TableCell>{formatCurrency(invoice.grandTotal)}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                            invoice.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200' :
                            invoice.status === 'Sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-200' :
                            invoice.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-200' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                        }`}>
                        {invoice.status}
                        </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/invoicing/${invoice.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No invoices created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
