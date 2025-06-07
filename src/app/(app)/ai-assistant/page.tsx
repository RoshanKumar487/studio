
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2, Users, FileSpreadsheet, Eye } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAppData } from '@/context/app-data-context';
import type { Invoice, Employee } from '@/lib/types';
import { addEmployeeByText, type AddEmployeeByTextInput, type AddEmployeeByTextOutput } from '@/ai/flows/add-employee-by-text-flow';
import { processInvoiceQuery, type ProcessInvoiceQueryInput, type ProcessInvoiceQueryOutput } from '@/ai/flows/process-invoice-query-flow';
import { format, parseISO } from 'date-fns';

export default function AiAssistantPage() {
  const { toast } = useToast();
  const { addEmployee, getInvoiceById, updateInvoiceStatus } = useAppData();

  // AI Employee Assistant State
  const [aiEmployeeText, setAiEmployeeText] = useState("");
  const [isAiEmployeeLoading, setIsAiEmployeeLoading] = useState(false);
  const [aiEmployeeResult, setAiEmployeeResult] = useState<AddEmployeeByTextOutput | null>(null);

  // AI Invoice Assistant State
  const [aiInvoiceQuery, setAiInvoiceQuery] = useState("");
  const [isAiInvoiceLoading, setIsAiInvoiceLoading] = useState(false);
  const [aiInvoiceResult, setAiInvoiceResult] = useState<ProcessInvoiceQueryOutput | null>(null);
  const [queriedInvoiceDetails, setQueriedInvoiceDetails] = useState<Invoice | null>(null);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const handleAiAddEmployee = async () => {
    if (!aiEmployeeText.trim()) {
      toast({ title: "Input Required", description: "Please provide text to describe the employee.", variant: "destructive" });
      return;
    }
    setIsAiEmployeeLoading(true);
    setAiEmployeeResult(null);
    try {
      const result = await addEmployeeByText({ employeeText: aiEmployeeText });
      setAiEmployeeResult(result);
      if (result.success && result.name) {
        const employeeData: Omit<Employee, 'id' | 'documents'> = {
          name: result.name,
          email: result.email || undefined,
          jobTitle: result.jobTitle || undefined,
          startDate: result.startDate ? parseISO(result.startDate) : null,
          employmentType: result.employmentType || undefined,
        };
        await addEmployee(employeeData);
        toast({ title: "Employee Added via AI", description: `${result.name} has been successfully added.` });
        setAiEmployeeText("");
      } else {
        toast({ title: "AI Processing Issue", description: result.message || "Could not add employee from text.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("AI Add Employee Error:", error);
      toast({ title: "Error", description: error.message || "Failed to add employee using AI. Please try again.", variant: "destructive" });
      setAiEmployeeResult({success: false, message: error.message || "An unexpected error occurred."});
    } finally {
      setIsAiEmployeeLoading(false);
    }
  };

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
          // Re-fetch to confirm and display updated status if needed
          const updatedInvoice = getInvoiceById(result.invoiceNumber);
          if (updatedInvoice) setQueriedInvoiceDetails(updatedInvoice);
          toast({ title: "Invoice Updated", description: `Status of ${result.invoiceNumber} changed to ${result.newStatus}.` });
        } else {
          toast({ title: "Not Found", description: `Invoice ${result.invoiceNumber} not found for update.`, variant: "destructive" });
        }
      } else if (result.intent === 'unknown' || (result.intent !== 'get_details' && !result.invoiceNumber)) {
         toast({ title: "AI Query", description: result.message, variant: result.message.toLowerCase().startsWith("sorry") || result.message.toLowerCase().startsWith("please") ? "default" : "destructive" });
      }
       setAiInvoiceQuery(""); // Clear input after processing
    } catch (error: any) {
      console.error("AI Invoice Query Error:", error);
      toast({ title: "Error", description: error.message || "Failed to process query using AI.", variant: "destructive" });
      setAiInvoiceResult({ intent: 'unknown', message: error.message || "An unexpected error occurred." });
    } finally {
      setIsAiInvoiceLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">AI Assistant</h1>
      </div>
      <p className="text-muted-foreground">
        Leverage AI to streamline common tasks. Describe what you need, and let the assistant help you out.
      </p>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> AI Employee Assistant</CardTitle>
          <CardDescription>Describe the new employee in plain text (e.g., name, email, job title, start date, employment type). The AI will extract details and add them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., Add John Smith, email john.s@work.co, senior manager, starts next Tuesday, full-time."
            value={aiEmployeeText}
            onChange={(e) => setAiEmployeeText(e.target.value)}
            rows={4}
          />
          <Button onClick={handleAiAddEmployee} disabled={isAiEmployeeLoading} className="w-full sm:w-auto">
            {isAiEmployeeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isAiEmployeeLoading ? 'Processing...' : 'Add Employee with AI'}
          </Button>
          {aiEmployeeResult && !aiEmployeeResult.success && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>AI Error</AlertTitle>
              <AlertDescription>{aiEmployeeResult.message}</AlertDescription>
            </Alert>
          )}
           {aiEmployeeResult && aiEmployeeResult.success && aiEmployeeResult.name && (
            <Alert variant="default" className="mt-4 border-green-500 text-green-700 dark:border-green-600 dark:text-green-300">
              <AlertTitle className="text-green-700 dark:text-green-300">Success!</AlertTitle>
              <AlertDescription>{aiEmployeeResult.message || `Employee ${aiEmployeeResult.name} details processed.`}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-primary" /> AI Invoice Assistant</CardTitle>
          <CardDescription>Ask to see invoice details or update status. E.g., "Show INV-2024-0001" or "Mark INV-2024-0001 as Paid".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your invoice query here..."
            value={aiInvoiceQuery}
            onChange={(e) => setAiInvoiceQuery(e.target.value)}
            rows={4}
          />
          <Button onClick={handleAiInvoiceQuery} disabled={isAiInvoiceLoading} className="w-full sm:w-auto">
            {isAiInvoiceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isAiInvoiceLoading ? 'Processing...' : 'Process Query with AI'}
          </Button>
          {aiInvoiceResult && aiInvoiceResult.intent === 'unknown' && (
            <Alert variant="default" className="mt-4">
              <AlertTitle>AI Response</AlertTitle>
              <AlertDescription>{aiInvoiceResult.message}</AlertDescription>
            </Alert>
          )}
          {queriedInvoiceDetails && (
            <Card className="mt-4 animate-in fade-in-50 duration-300">
              <CardHeader>
                <CardTitle className="text-primary">Details for {queriedInvoiceDetails.invoiceNumber}</CardTitle>
                <CardDescription>Status: {queriedInvoiceDetails.status}, Due: {format(queriedInvoiceDetails.dueDate, "PPP")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Customer:</strong> {queriedInvoiceDetails.customerName}</p>
                <p><strong>Total:</strong> {formatCurrency(queriedInvoiceDetails.grandTotal)}</p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href={`/invoicing/${queriedInvoiceDetails.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Full Invoice
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    