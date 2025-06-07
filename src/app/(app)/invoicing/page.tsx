
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { FileSpreadsheet, PlusCircle, Trash2, Eye, Check, ChevronsUpDown, Mail, FilterX, Search, Filter, Pencil } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { SendInvoiceEmailDialog } from '@/components/shared/send-invoice-email-dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { v4 as uuidv4 } from 'uuid';


const lineItemSchema = z.object({
  id: z.string().optional(), 
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.1, "Quantity must be positive"),
  unitPrice: z.coerce.number().min(0.01, "Unit price must be positive"),
  total: z.coerce.number().optional(),
  customColumnValue: z.string().optional().or(z.literal('')),
});

const invoiceSchema = z.object({
  companyName: z.string().min(1, "Your company name is required"),
  companyAddress: z.string().optional(),
  employeeId: z.string().optional().nullable(),
  serviceProviderName: z.string().optional().nullable(), 
  customerName: z.string().min(1, "Customer name is required"),
  customerAddress: z.string().optional(),
  invoiceDate: z.date({ required_error: "Invoice date is required."}),
  dueDate: z.date({ required_error: "Due date is required."}),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  customColumnHeader: z.string().max(50, "Custom column header too long.").optional().or(z.literal('')),
  taxRate: z.coerce.number().min(0).max(1).default(0), 
  notes: z.string().optional(),
  status: z.enum(['Draft', 'Sent', 'Paid', 'Overdue']).default('Draft'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const invoiceStatuses = ['Draft', 'Sent', 'Paid', 'Overdue'] as const;

const defaultFormValues: InvoiceFormData = {
    companyName: 'FlowHQ', 
    companyAddress: '123 Business Rd, Suite 404, BizTown, ST 54321', 
    customerName: '',
    customerAddress: '',
    invoiceDate: new Date(),
    dueDate: addDays(new Date(), 30),
    lineItems: [{ description: '', quantity: 1, unitPrice: 0, total: 0, customColumnValue: '' }],
    customColumnHeader: '',
    taxRate: 0,
    notes: '',
    status: 'Draft',
    employeeId: null, 
    serviceProviderName: '',
};

export default function InvoicingPage() {
  const { employees, invoices, addInvoice, updateInvoice, getInvoiceById, getNextInvoiceNumber } = useAppData();
  const { toast } = useToast();
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<{ id: string; invoiceNumber: string; customerName: string; } | null>(null);

  const [serviceProviderComboboxOpen, setServiceProviderComboboxOpen] = useState(false);
  const [serviceProviderSearchText, setServiceProviderSearchText] = useState("");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(undefined);
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterCustomerName, setFilterCustomerName] = useState<string>("");

  const [isCustomHeaderInputVisible, setIsCustomHeaderInputVisible] = useState(false);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedLineItems = form.watch("lineItems");
  const watchedEmployeeId = form.watch("employeeId");
  const watchedServiceProviderName = form.watch("serviceProviderName");
  const watchedCustomColumnHeader = form.watch("customColumnHeader");

  useEffect(() => {
    if (watchedEmployeeId) {
      const employee = employees.find(emp => emp.id === watchedEmployeeId);
      setServiceProviderSearchText(employee?.name || "");
    } else {
      setServiceProviderSearchText(watchedServiceProviderName || "");
    }
  }, [watchedEmployeeId, watchedServiceProviderName, employees]);
  
  useEffect(() => {
    // Show input if header has value (e.g. when editing or if previously set)
    if (watchedCustomColumnHeader) {
      setIsCustomHeaderInputVisible(true);
    }
  }, [watchedCustomColumnHeader]);


  const handleOpenEditForm = (invoiceId: string) => {
    const invoiceToEdit = getInvoiceById(invoiceId);
    if (invoiceToEdit) {
      setEditingInvoiceId(invoiceId);
      form.reset({
        ...invoiceToEdit,
        invoiceDate: invoiceToEdit.invoiceDate ? new Date(invoiceToEdit.invoiceDate) : new Date(),
        dueDate: invoiceToEdit.dueDate ? new Date(invoiceToEdit.dueDate) : addDays(new Date(), 30),
        lineItems: invoiceToEdit.lineItems.map(li => ({...li, customColumnValue: li.customColumnValue || ''})),
        employeeId: invoiceToEdit.employeeId || null,
        serviceProviderName: invoiceToEdit.serviceProviderName || '',
        customColumnHeader: invoiceToEdit.customColumnHeader || '',
      });
      // Set combobox text
      if (invoiceToEdit.employeeId) {
          const emp = employees.find(e => e.id === invoiceToEdit.employeeId);
          setServiceProviderSearchText(emp?.name || invoiceToEdit.serviceProviderName || "");
      } else {
          setServiceProviderSearchText(invoiceToEdit.serviceProviderName || "");
      }
      if (invoiceToEdit.customColumnHeader) {
        setIsCustomHeaderInputVisible(true);
      } else {
        setIsCustomHeaderInputVisible(false);
      }
      setIsInvoiceFormOpen(true);
    } else {
      toast({ title: "Error", description: "Could not find invoice to edit.", variant: "destructive" });
    }
  };
  
  const resetFormAndState = () => {
    form.reset(defaultFormValues);
    setServiceProviderSearchText(""); 
    setEditingInvoiceId(null);
    setIsInvoiceFormOpen(false);
    setIsCustomHeaderInputVisible(false);
  };

  const onSubmit: SubmitHandler<InvoiceFormData> = async (data) => {
    const processedData = {
      ...data,
      employeeId: data.employeeId || undefined,
      serviceProviderName: data.employeeId ? undefined : (data.serviceProviderName || undefined),
      customColumnHeader: data.customColumnHeader?.trim() || undefined,
      lineItems: data.lineItems.map(item => ({
        ...item,
        id: item.id || uuidv4(), 
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        customColumnValue: item.customColumnValue?.trim() || undefined,
      })),
    };

    let result: Invoice | null = null;
    if (editingInvoiceId) {
      result = await updateInvoice(editingInvoiceId, processedData);
      if (result) {
        toast({ title: "Invoice Updated", description: `Invoice ${result.invoiceNumber} has been updated.`});
      }
    } else {
      result = await addInvoice(processedData);
       if (result) {
        toast({ title: "Invoice Created", description: `Invoice ${result.invoiceNumber} for ${data.customerName} has been created.`});
      }
    }

    if (result) {
      resetFormAndState();
    } else {
        toast({
            title: "Error",
            description: `Failed to ${editingInvoiceId ? 'update' : 'create'} invoice.`,
            variant: "destructive"
        });
    }
  };
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const handleServiceProviderSelect = (employee: Employee) => {
    form.setValue('employeeId', employee.id);
    form.setValue('serviceProviderName', ''); 
    setServiceProviderSearchText(employee.name); 
    setServiceProviderComboboxOpen(false);
  };

  const handleServiceProviderComboboxBlur = () => {
    const currentEmployeeId = form.getValues('employeeId');
    if (!currentEmployeeId && serviceProviderSearchText.trim()) {
      form.setValue('serviceProviderName', serviceProviderSearchText.trim());
    } else if (!serviceProviderSearchText.trim() && !currentEmployeeId) {
      form.setValue('serviceProviderName', '');
      form.setValue('employeeId', null);
    }
    const selectedEmployee = employees.find(e => e.id === currentEmployeeId);
    if (selectedEmployee && selectedEmployee.name !== serviceProviderSearchText.trim()) {
        form.setValue('employeeId', null); 
        form.setValue('serviceProviderName', serviceProviderSearchText.trim());
    }
  };
  
  const currentServiceProviderDisplay = watchedEmployeeId 
    ? employees.find(e => e.id === watchedEmployeeId)?.name 
    : watchedServiceProviderName;

  const handleOpenEmailDialog = (invoice: Invoice) => {
    setSelectedInvoiceForEmail({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
    });
  };

  const resetFilters = () => {
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
    setFilterStatus("All");
    setFilterCustomerName("");
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      let isMatch = true;
      const invoiceDateOnly = startOfDay(invoice.invoiceDate); 

      if (filterStartDate) {
        if (invoiceDateOnly < startOfDay(filterStartDate)) isMatch = false;
      }
      if (filterEndDate) {
        if (invoiceDateOnly > endOfDay(filterEndDate)) isMatch = false;
      }
      if (filterStatus !== "All" && invoice.status !== filterStatus) {
        isMatch = false;
      }
      if (filterCustomerName && !invoice.customerName.toLowerCase().includes(filterCustomerName.toLowerCase().trim())) {
        isMatch = false;
      }
      return isMatch;
    }).sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [invoices, filterStartDate, filterEndDate, filterStatus, filterCustomerName]);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center">
          <FileSpreadsheet className="mr-3 h-8 w-8 text-primary" /> Invoicing
        </h1>
        <Button onClick={() => {
          resetFormAndState(); 
          setIsInvoiceFormOpen(true);
        }}>
          <PlusCircle className="mr-2 h-5 w-5" /> Create New Invoice
        </Button>
      </div>

      <Card className="shadow-lg md:max-w-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary"/>
            Filter Invoices
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(!isFilterOpen)} aria-label="Toggle filters">
            <Search className="h-5 w-5" />
          </Button>
        </CardHeader>
        {isFilterOpen && (
          <CardContent className="space-y-4 pt-4 animate-in fade-in-0 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="filter-start-date">Start Date</Label>
                <DatePicker date={filterStartDate} setDate={setFilterStartDate} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-end-date">End Date</Label>
                <DatePicker date={filterEndDate} setDate={setFilterEndDate} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-status">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    {invoiceStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-1">
                <Label htmlFor="filter-customer">Customer Name</Label>
                <Input 
                  id="filter-customer"
                  type="text"
                  placeholder="Search by customer name..."
                  value={filterCustomerName}
                  onChange={(e) => setFilterCustomerName(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={resetFilters} variant="outline" size="sm">
              <FilterX className="mr-2 h-4 w-4" /> Reset Filters
            </Button>
          </CardContent>
        )}
      </Card>


      {isInvoiceFormOpen && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">
                {editingInvoiceId 
                    ? `Edit Invoice ${getInvoiceById(editingInvoiceId)?.invoiceNumber || ''}` 
                    : `New Invoice (${getNextInvoiceNumber()})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <CardTitle className="text-xl pt-2 font-headline">Your Company Details</CardTitle>
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Company Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Your Business LLC" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="companyAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Company Address (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., 456 Biz St, Your City, State" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Separator className="my-6" />
                <CardTitle className="text-xl font-headline">Customer & Service Details</CardTitle>
                <FormField control={form.control} name="customerName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer/Company Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Acme Corp" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="customerAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Address (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., 123 Main St, Anytown, USA" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormItem>
                  <FormLabel>Service Provider (Select existing or type new)</FormLabel>
                  <Popover open={serviceProviderComboboxOpen} onOpenChange={(open) => {
                      setServiceProviderComboboxOpen(open);
                      if(!open) handleServiceProviderComboboxBlur(); 
                  }}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={serviceProviderComboboxOpen}
                          className={cn("w-full justify-between", !currentServiceProviderDisplay && "text-muted-foreground")}
                        >
                          {currentServiceProviderDisplay || "Select or type provider..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" 
                        onCloseAutoFocus={(e) => e.preventDefault()} 
                    >
                      <Command>
                        <CommandInput
                          placeholder="Search employee or type name..."
                          value={serviceProviderSearchText}
                          onValueChange={setServiceProviderSearchText}
                        />
                        <CommandList>
                          <CommandEmpty>No employee found. Type to add manually.</CommandEmpty>
                          <CommandGroup>
                            {employees.map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={employee.name} 
                                onSelect={() => handleServiceProviderSelect(employee)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watchedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {employee.name} ({employee.jobTitle || 'N/A'})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage>{form.formState.errors.employeeId?.message || form.formState.errors.serviceProviderName?.message}</FormMessage>
                </FormItem>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Invoice Date</FormLabel><DatePicker date={field.value} setDate={field.onChange} /><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><DatePicker date={field.value} setDate={field.onChange} /><FormMessage /></FormItem>
                  )} />
                </div>

                <Separator className="my-6" />
                <CardTitle className="text-xl pt-4 font-headline">Line Items</CardTitle>
                
                {(!isCustomHeaderInputVisible && !watchedCustomColumnHeader) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomHeaderInputVisible(true)}
                    className="mb-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Column Header
                  </Button>
                ) : (
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="customColumnHeader"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-1">
                            <FormLabel>Custom Column Header</FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs h-auto py-1 px-1.5"
                              onClick={() => {
                                form.setValue("customColumnHeader", "");
                                setIsCustomHeaderInputVisible(false);
                              }}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" /> Remove Header
                            </Button>
                          </div>
                          <FormControl>
                            <Input placeholder="e.g., Notes, Part No." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {fields.map((item, index) => (
                  <div key={item.id} className={`grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr${watchedCustomColumnHeader ? '_1fr' : ''}_auto] gap-2 items-end p-3 border rounded-md`}>
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
                    {watchedCustomColumnHeader && (
                      <FormField control={form.control} name={`lineItems.${index}.customColumnValue`} render={({ field }) => (
                        <FormItem><FormLabel>{watchedCustomColumnHeader}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    )}
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
                <Button type="button" variant="outline" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, total: 0, customColumnValue: '' })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
                </Button>
                
                <Separator className="my-6" />
                <CardTitle className="text-xl pt-4 font-headline">Totals & Status</CardTitle>
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
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                            {invoiceStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetFormAndState}>Cancel</Button>
                    <Button type="submit">{editingInvoiceId ? 'Update Invoice' : 'Create Invoice'}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="font-headline">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length > 0 ? (
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
                {filteredInvoices.map((invoice) => (
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
                      <div className="flex items-center justify-end space-x-1">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                <Link href={`/invoicing/${invoice.id}`} aria-label="View invoice">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View Invoice</p></TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEditForm(invoice.id)} aria-label="Edit invoice">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit Invoice</p></TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEmailDialog(invoice)} aria-label="Email invoice">
                                <Mail className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Email Invoice</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No invoices match your current filters, or no invoices created yet.</p>
          )}
        </CardContent>
      </Card>
      <SendInvoiceEmailDialog 
        isOpen={!!selectedInvoiceForEmail} 
        onOpenChange={(isOpen) => { if (!isOpen) setSelectedInvoiceForEmail(null);}} 
        invoiceData={selectedInvoiceForEmail} 
      />
    </div>
  );
}
