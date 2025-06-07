
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppData } from '@/context/app-data-context';
import type { Invoice, Employee } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { AppLogo } from '@/components/shared/app-logo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { getInvoiceById, getEmployeeById, updateInvoiceStatus } = useAppData();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [serviceEmployee, setServiceEmployee] = useState<Employee | null | undefined>(undefined);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);

  const invoiceId = typeof params.invoiceId === 'string' ? params.invoiceId : '';

  useEffect(() => {
    if (invoiceId) {
      const fetchedInvoice = getInvoiceById(invoiceId);
      setInvoice(fetchedInvoice);
    }
  }, [invoiceId, getInvoiceById]);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (invoice && invoice.employeeId) {
        setIsLoadingEmployee(true);
        setServiceEmployee(undefined);
        try {
          const emp = await getEmployeeById(invoice.employeeId);
          setServiceEmployee(emp || null);
        } catch (error) {
          console.error("Failed to fetch service employee:", error);
          setServiceEmployee(null);
          toast({
            title: "Error",
            description: "Could not load details for the service employee.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingEmployee(false);
        }
      } else {
        setServiceEmployee(null);
        setIsLoadingEmployee(false);
      }
    };

    if (invoice !== undefined) {
        fetchEmployee();
    }
  }, [invoice, getEmployeeById, toast]);

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (newStatus: Invoice['status']) => {
    if (invoice) {
        await updateInvoiceStatus(invoice.id, newStatus);
        const updatedInvoice = getInvoiceById(invoice.id);
        setInvoice(updatedInvoice || null);
        toast({
            title: "Invoice Status Updated",
            description: `Invoice ${invoice.invoiceNumber} status changed to ${newStatus}.`,
        });
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (invoice === undefined) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary mr-2" /> Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Invoice Not Found</h1>
        <p>The invoice you are looking for does not exist or could not be loaded.</p>
        <Button onClick={() => router.push('/invoicing')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
      </div>
    );
  }

  const displayServiceProvider = () => {
    if (isLoadingEmployee && invoice.employeeId) {
      return <><Loader2 className="inline h-4 w-4 animate-spin" /> Loading...</>;
    }
    if (serviceEmployee) {
      return serviceEmployee.name;
    }
    if (invoice.serviceProviderName) {
      return invoice.serviceProviderName;
    }
    if (invoice.employeeId && serviceEmployee === null) {
        return <span className="text-muted-foreground italic">Employee not found</span>;
    }
    return <span className="text-muted-foreground italic">N/A</span>;
  };


  return (
    <div className="max-w-4xl mx-auto p-4 print:p-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="outline" onClick={() => router.push('/invoicing')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <div className="flex gap-2 flex-wrap">
            <Select value={invoice.status} onValueChange={(value: Invoice['status']) => handleStatusChange(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
            </Select>
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
            </Button>
        </div>
      </div>

      <Card className="shadow-lg print:shadow-none print:border-none">
        <CardHeader className="border-b print:border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <AppLogo size="default" />
              <p className="text-lg font-semibold mt-1">{invoice.companyName}</p>
              {invoice.companyAddress && <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.companyAddress}</p>}
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-primary font-headline tracking-tight mb-1">{invoice.invoiceNumber}</h1>
              <p className="text-muted-foreground">Status: <span className={`font-semibold ${
                  invoice.status === 'Paid' ? 'text-green-600' :
                  invoice.status === 'Overdue' ? 'text-red-600' :
                  'text-foreground'
              }`}>{invoice.status}</span></p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-1 text-muted-foreground">BILL TO</h3>
              <p className="font-medium text-lg">{invoice.customerName}</p>
              {invoice.customerAddress && <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.customerAddress}</p>}
            </div>
            <div className="text-right space-y-1">
              <p><span className="font-semibold text-muted-foreground">Invoice Date: </span> {format(invoice.invoiceDate, "PPP")}</p>
              <p><span className="font-semibold text-muted-foreground">Due Date: </span> {format(invoice.dueDate, "PPP")}</p>
              {(invoice.employeeId || invoice.serviceProviderName) && (
                <p><span className="font-semibold text-muted-foreground">Service By: </span> {displayServiceProvider()}</p>
              )}
            </div>
          </div>

          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">DESCRIPTION</TableHead>
                  <TableHead className="text-center">QTY</TableHead>
                  <TableHead className="text-right">UNIT PRICE</TableHead>
                  {invoice.customColumnHeader && (
                    <TableHead className="text-left">{invoice.customColumnHeader}</TableHead>
                  )}
                  <TableHead className="text-right">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    {invoice.customColumnHeader && (
                      <TableCell className="text-left">{item.customColumnValue || ''}</TableCell>
                    )}
                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-4">
            <div className="w-full md:w-2/5 lg:w-1/3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(invoice.subTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({ (invoice.taxRate * 100).toFixed(invoice.taxRate * 100 % 1 === 0 ? 0 : 1) }%):</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Grand Total:</span>
                <span className="text-primary">{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>
          
          {invoice.notes && (
            <div className="pt-6 border-t mt-4">
              <h4 className="font-semibold mb-1 text-muted-foreground">NOTES/TERMS</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-center py-6 border-t print:border-t mt-6">
            <p className="text-sm text-muted-foreground">
                Thank you for your business!
            </p>
            <p className="text-xs text-muted-foreground mt-2">
                Powered by <span className="font-semibold text-primary">FlowHQ</span>
            </p>
        </CardFooter>
      </Card>
      
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:border-b { border-bottom-width: 1px !important; border-color: hsl(var(--border)) !important; }
          .print\\:border-t { border-top-width: 1px !important; border-color: hsl(var(--border)) !important; }
          .print\\:hidden { display: none !important; }
          /* Ensure text colors are maintained for printing */
          .text-primary { color: hsl(var(--primary)) !important; }
          .text-green-600 { color: #16a34a !important; } /* Tailwind green-600 */
          .text-red-600 { color: #dc2626 !important; } /* Tailwind red-600 */
        }
        .whitespace-pre-line {
          white-space: pre-line;
        }
      `}</style>
    </div>
  );
}
