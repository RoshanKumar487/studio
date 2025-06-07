
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Paperclip } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { sendInvoiceEmail, type SendInvoiceEmailOutput } from '@/ai/flows/send-invoice-email-flow';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface SendInvoiceEmailDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  invoiceData: {
    id: string;
    invoiceNumber: string;
    customerName: string;
  } | null;
}

const emailSchema = z.object({
  recipientEmail: z.string().email("Invalid email address."),
});
type EmailFormData = z.infer<typeof emailSchema>;

export function SendInvoiceEmailDialog({ isOpen, onOpenChange, invoiceData }: SendInvoiceEmailDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false); // Renamed from isSending
  const [step, setStep] = useState<'enter_email' | 'preview_email' | 'sent_confirmation'>('enter_email');
  
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');


  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { recipientEmail: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ recipientEmail: '' });
      setEditableSubject('');
      setEditableBody('');
      setStep('enter_email');
    }
  }, [isOpen, form]);

  const handleGeneratePreview: SubmitHandler<EmailFormData> = async (data) => {
     if (!invoiceData) {
      toast({ title: "Error", description: "No invoice selected.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const result: SendInvoiceEmailOutput = await sendInvoiceEmail({
        invoiceId: invoiceData.id,
        recipientEmail: data.recipientEmail,
        customerName: invoiceData.customerName,
        invoiceNumber: invoiceData.invoiceNumber,
      });

      if (result.success && result.emailSubject && result.emailBody) {
        setEditableSubject(result.emailSubject);
        setEditableBody(result.emailBody);
        setStep('preview_email');
      } else {
        toast({ title: "Preview Generation Failed", description: result.message || "Could not generate email preview.", variant: "destructive" });
        setEditableSubject('');
        setEditableBody('');
      }
    } catch (error: any) {
      console.error("Generate Email Preview Error:", error);
      toast({ title: "Error", description: error.message || "Failed to generate email preview.", variant: "destructive" });
      setEditableSubject('');
      setEditableBody('');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleSendEmail = async () => {
    if (!invoiceData || !editableSubject || !editableBody || !form.getValues("recipientEmail")) {
      toast({ title: "Error", description: "Missing data to send email. Subject, body, and recipient email are required.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    
    // Simulate sending email. In a real app, this might call a different backend.
    // For this demo, we'll use the result from AI generation or user edits.
    // The AI flow already logs its attempt if called.
    
    // For this prototype, the `sendInvoiceEmail` Genkit flow is more about content generation and initial simulation logging.
    // We can re-call it to log the "final send attempt" or just proceed to confirmation with user-edited content.
    // Let's re-call to log this specific attempt.
    try {
      // Re-call the flow to log the attempt with potentially modified content,
      // though the flow itself will re-generate based on its original prompt logic.
      // This is a simplification for the prototype.
      // A more robust solution might have separate flows for generation and actual sending.
      await sendInvoiceEmail({
        invoiceId: invoiceData.id,
        recipientEmail: form.getValues("recipientEmail"),
        customerName: invoiceData.customerName,
        invoiceNumber: invoiceData.invoiceNumber,
        // We are not passing editableSubject/Body back to this specific genkit flow,
        // as its prompt is designed for generation, not for taking arbitrary content to "send".
        // The UI confirmation will use the editable fields.
      });

      toast({ 
        title: "Email Sent (Simulated)", 
        description: `Subject: "${editableSubject}". Email to ${form.getValues("recipientEmail")} for invoice ${invoiceData.invoiceNumber} (with PDF) has been simulated.`
      });
      setStep('sent_confirmation');
    } catch (error: any) {
        console.error("Error during final send simulation:", error);
        toast({ title: "Error Simulating Send", description: error.message || "Failed to simulate sending the email.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  if (!invoiceData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && step !== 'sent_confirmation') {
             onOpenChange(false);
        } else if (!open && step === 'sent_confirmation') {
             onOpenChange(false);
        }
        if (open && step === 'sent_confirmation') setStep('enter_email'); 
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> 
            {step === 'enter_email' && `Send Invoice ${invoiceData.invoiceNumber}`}
            {step === 'preview_email' && `Review & Edit Email for Invoice ${invoiceData.invoiceNumber}`}
            {step === 'sent_confirmation' && `Email Simulated for ${invoiceData.invoiceNumber}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'enter_email' && (
          <>
            <p className="text-sm text-muted-foreground">
              Enter recipient's email for invoice <span className="font-semibold">{invoiceData.invoiceNumber}</span> for <span className="font-semibold">{invoiceData.customerName}</span>. The AI will generate email content for your review.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGeneratePreview)} className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="e.g., customer@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-2">
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Preview Email Content
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {step === 'preview_email' && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertTitle>Review & Edit Email Content</AlertTitle>
                    <AlertDescription>The AI has generated the following content. You can edit it below before sending.</AlertDescription>
                </Alert>
                <div className="space-y-1">
                    <Label htmlFor="preview-to">To:</Label>
                    <Input id="preview-to" readOnly disabled value={form.getValues("recipientEmail")} className="bg-muted/50"/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="editable-subject">Subject:</Label>
                    <Input 
                      id="editable-subject" 
                      value={editableSubject} 
                      onChange={(e) => setEditableSubject(e.target.value)}
                      placeholder="Enter email subject"
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="editable-body">Body:</Label>
                    <Textarea 
                      id="editable-body" 
                      value={editableBody} 
                      onChange={(e) => setEditableBody(e.target.value)} 
                      rows={8} 
                      placeholder="Enter email body"
                    />
                </div>
                <div className="mt-3 p-2 border rounded-md bg-muted/30 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Paperclip className="h-4 w-4" />
                        <span>Attachment: Invoice {invoiceData.invoiceNumber}.pdf (Simulated)</span>
                    </div>
                </div>
                 <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setStep('enter_email')} disabled={isProcessing}>Back</Button>
                    <Button onClick={handleSendEmail} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                        {isProcessing ? 'Sending...' : 'Confirm & Send (Simulate)'}
                    </Button>
                </DialogFooter>
            </div>
        )}
        
        {step === 'sent_confirmation' && (
            <div className="space-y-4 py-2">
                <Alert variant="default" className="border-green-500 text-green-700 dark:border-green-600 dark:text-green-300">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-green-700 dark:text-green-300">Email Sent Successfully (Simulated)!</AlertTitle>
                    <AlertDescription className="text-green-600 dark:text-green-400">
                        The following email content (with Invoice {invoiceData.invoiceNumber}.pdf notionally attached) was simulated as sent to {form.getValues("recipientEmail")}:
                    </AlertDescription>
                </Alert>
                 <div className="p-3 border rounded-md bg-muted/30 text-sm space-y-1 max-h-[40vh] overflow-y-auto">
                    <p><strong>Subject:</strong> {editableSubject}</p>
                    <hr className="my-1"/>
                    <p className="whitespace-pre-wrap"><strong>Body:</strong> {editableBody}</p>
                 </div>
                <DialogFooter className="pt-2">
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </div>
        )}

      </DialogContent>
    </Dialog>
  );
}

// Helper Icon
function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
