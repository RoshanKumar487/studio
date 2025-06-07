
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2, Users, FileSpreadsheet, Eye, MessageSquareWarning } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAppData } from '@/context/app-data-context';
import type { Invoice, Employee } from '@/lib/types';

import { classifyTask, type ClassifyTaskInput, type ClassifyTaskOutput, type TaskType } from '@/ai/flows/classify-task-flow';
import { addEmployeeByText, type AddEmployeeByTextInput, type AddEmployeeByTextOutput } from '@/ai/flows/add-employee-by-text-flow';
import { processInvoiceQuery, type ProcessInvoiceQueryInput, type ProcessInvoiceQueryOutput } from '@/ai/flows/process-invoice-query-flow';
import { format, parseISO } from 'date-fns';

type AiResultType = 'employee_success' | 'employee_error' | 'invoice_display' | 'invoice_action_message' | 'unknown_query' | 'none';

export default function AiAssistantPage() {
  const { toast } = useToast();
  const { addEmployee, getInvoiceById, updateInvoiceStatus } = useAppData();

  const [aiQueryText, setAiQueryText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentResultType, setCurrentResultType] = useState<AiResultType>('none');
  const [employeeOutcome, setEmployeeOutcome] = useState<AddEmployeeByTextOutput | null>(null);
  const [invoiceOutcome, setInvoiceOutcome] = useState<ProcessInvoiceQueryOutput | null>(null);
  const [invoiceToDisplay, setInvoiceToDisplay] = useState<Invoice | null>(null);
  const [unknownQueryMessage, setUnknownQueryMessage] = useState<string | null>(null);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const resetResults = () => {
    setCurrentResultType('none');
    setEmployeeOutcome(null);
    setInvoiceOutcome(null);
    setInvoiceToDisplay(null);
    setUnknownQueryMessage(null);
  };

  const handleAiSubmit = async () => {
    if (!aiQueryText.trim()) {
      toast({ title: "Input Required", description: "Please enter your query for the AI assistant.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    resetResults();

    try {
      const classificationResult = await classifyTask({ textQuery: aiQueryText });

      if (classificationResult.taskType === 'employee_management') {
        const employeeResult = await addEmployeeByText({ employeeText: classificationResult.originalQuery });
        setEmployeeOutcome(employeeResult);
        if (employeeResult.success && employeeResult.name) {
          const employeeData: Omit<Employee, 'id' | 'documents'> = {
            name: employeeResult.name,
            email: employeeResult.email || undefined,
            jobTitle: employeeResult.jobTitle || undefined,
            startDate: employeeResult.startDate ? parseISO(employeeResult.startDate) : null,
            employmentType: employeeResult.employmentType || undefined,
          };
          await addEmployee(employeeData);
          setCurrentResultType('employee_success');
          toast({ title: "Employee Added via AI", description: `${employeeResult.name} has been successfully added.` });
          setAiQueryText(""); 
        } else {
          setCurrentResultType('employee_error');
          toast({ title: "AI Employee Processing", description: employeeResult.message || "Could not add employee from text.", variant: "destructive" });
        }
      } else if (classificationResult.taskType === 'invoice_processing') {
        const invoiceResult = await processInvoiceQuery({ query: classificationResult.originalQuery });
        setInvoiceOutcome(invoiceResult);

        if (invoiceResult.intent === 'get_details' && invoiceResult.invoiceNumber) {
          const foundInvoice = getInvoiceById(invoiceResult.invoiceNumber);
          if (foundInvoice) {
            setInvoiceToDisplay(foundInvoice);
            setCurrentResultType('invoice_display');
            toast({ title: "Invoice Found", description: `Details for ${invoiceResult.invoiceNumber} displayed.` });
          } else {
            setCurrentResultType('invoice_action_message'); // Use this to show the "not found" from invoiceOutcome
            toast({ title: "Not Found", description: `Invoice ${invoiceResult.invoiceNumber} not found.`, variant: "destructive" });
          }
        } else if (invoiceResult.intent === 'update_status' && invoiceResult.invoiceNumber && invoiceResult.newStatus) {
          const foundInvoice = getInvoiceById(invoiceResult.invoiceNumber);
          if (foundInvoice) {
            updateInvoiceStatus(invoiceResult.invoiceNumber, invoiceResult.newStatus);
            const updatedInvoice = getInvoiceById(invoiceResult.invoiceNumber);
            if (updatedInvoice) setInvoiceToDisplay(updatedInvoice); // Optionally display updated invoice
            setCurrentResultType(updatedInvoice ? 'invoice_display' : 'invoice_action_message');
            toast({ title: "Invoice Updated", description: `Status of ${invoiceResult.invoiceNumber} changed to ${invoiceResult.newStatus}.` });
          } else {
             setCurrentResultType('invoice_action_message');
            toast({ title: "Not Found", description: `Invoice ${invoiceResult.invoiceNumber} not found for update.`, variant: "destructive" });
          }
        } else { // Covers unknown intent from invoice flow, or missing details for a known intent
          setCurrentResultType('invoice_action_message');
          toast({ title: "AI Invoice Query", description: invoiceResult.message, variant: "default" });
        }
        if (invoiceResult.intent !== 'unknown') setAiQueryText("");

      } else { // 'unknown' from classificationResult
        setUnknownQueryMessage(classificationResult.message);
        setCurrentResultType('unknown_query');
        toast({ title: "AI Assistant", description: classificationResult.message, variant: "default" });
      }
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      setCurrentResultType('unknown_query'); // Generic error display
      setUnknownQueryMessage(error.message || "An unexpected error occurred. Please try again.");
      toast({ title: "Error", description: error.message || "Failed to process your request using AI.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline tracking-tight">AI Assistant</h1>
      </div>
      <p className="text-muted-foreground">
        Leverage AI to streamline common tasks. Describe what you need regarding employees or invoices, and let the assistant help you out.
      </p>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <FileSpreadsheet className="h-5 w-5 text-primary" /> 
            Unified AI Assistant
          </CardTitle>
          <CardDescription>
            Type your request below. For example:
            <ul className="list-disc list-inside text-xs mt-1">
              <li>"Add new employee John Doe, john.d@example.com, starts tomorrow as a Manager, full-time."</li>
              <li>"Show details for invoice INV-2024-0001."</li>
              <li>"Mark INV-2024-0002 as Paid."</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., Add employee..., Show invoice..., Update status of..."
            value={aiQueryText}
            onChange={(e) => setAiQueryText(e.target.value)}
            rows={4}
          />
          <Button onClick={handleAiSubmit} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isLoading ? 'Processing...' : 'Process with AI'}
          </Button>

          {/* Result Display Area */}
          {currentResultType === 'employee_error' && employeeOutcome && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>AI Employee Processing Error</AlertTitle>
              <AlertDescription>{employeeOutcome.message}</AlertDescription>
            </Alert>
          )}
           {currentResultType === 'employee_success' && employeeOutcome && (
            <Alert variant="default" className="mt-4 border-green-500 text-green-700 dark:border-green-600 dark:text-green-300">
              <AlertTitle className="text-green-700 dark:text-green-300">Employee Action Success!</AlertTitle>
              <AlertDescription>{employeeOutcome.message || `Employee ${employeeOutcome.name} details processed.`}</AlertDescription>
            </Alert>
          )}

          {currentResultType === 'invoice_display' && invoiceToDisplay && (
            <Card className="mt-4 animate-in fade-in-50 duration-300">
              <CardHeader>
                <CardTitle className="text-primary">Details for {invoiceToDisplay.invoiceNumber}</CardTitle>
                <CardDescription>Status: {invoiceToDisplay.status}, Due: {format(invoiceToDisplay.dueDate, "PPP")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Customer:</strong> {invoiceToDisplay.customerName}</p>
                <p><strong>Total:</strong> {formatCurrency(invoiceToDisplay.grandTotal)}</p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href={`/invoicing/${invoiceToDisplay.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Full Invoice
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {currentResultType === 'invoice_action_message' && invoiceOutcome && (
            <Alert variant="default" className="mt-4">
              <MessageSquareWarning className="h-5 w-5" />
              <AlertTitle>AI Invoice Assistant Response</AlertTitle>
              <AlertDescription>{invoiceOutcome.message}</AlertDescription>
            </Alert>
          )}
          {currentResultType === 'unknown_query' && unknownQueryMessage && (
             <Alert variant="default" className="mt-4">
                <MessageSquareWarning className="h-5 w-5" />
                <AlertTitle>AI Assistant</AlertTitle>
                <AlertDescription>{unknownQueryMessage}</AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
