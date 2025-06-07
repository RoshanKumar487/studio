
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { sendInvoiceEmail, type SendInvoiceEmailInput, type SendInvoiceEmailOutput } from '@/ai/flows/send-invoice-email-flow';
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
  const [isSending, setIsSending] = useState(false);
  const [emailContent, setEmailContent] = useState<{ subject: string; body: string } | null>(null);
  const [step, setStep] = useState<'enter_email' | 'preview_email' | 'sent_confirmation'>('enter_email');


  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { recipientEmail: '' },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({ recipientEmail: '' });
      setEmailContent(null);
      setStep('enter_email');
    }
  }, [isOpen, form]);

  const handleGeneratePreview: SubmitHandler<EmailFormData> = async (data) => {
     if (!invoiceData) {
      toast({ title: "Error", description: "No invoice selected.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      // Call the flow just to generate content first (it will also "simulate" sending)
      const result: SendInvoiceEmailOutput = await sendInvoiceEmail({
        invoiceId: invoiceData.id,
        recipientEmail: data.recipientEmail, // Use the entered email for content generation context
        customerName: invoiceData.customerName,
        invoiceNumber: invoiceData.invoiceNumber,
      });

      if (result.success && result.emailSubject && result.emailBody) {
        setEmailContent({ subject: result.emailSubject, body: result.emailBody });
        setStep('preview_email');
      } else {
        toast({ title: "Preview Generation Failed", description: result.message || "Could not generate email preview.", variant: "destructive" });
        setEmailContent(null);
      }
    } catch (error: any) {
      console.error("Generate Email Preview Error:", error);
      toast({ title: "Error", description: error.message || "Failed to generate email preview.", variant: "destructive" });
      setEmailContent(null);
    } finally {
      setIsSending(false);
    }
  };


  const handleSendEmail = async () => {
    if (!invoiceData || !emailContent || !form.getValues("recipientEmail")) {
      toast({ title: "Error", description: "Missing data to send email.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      // The flow was already called for preview, we could re-call it or just use the previewed content
      // For simplicity and to ensure the "send" simulation happens with the final confirmation:
      const result: SendInvoiceEmailOutput = await sendInvoiceEmail({
        invoiceId: invoiceData.id,
        recipientEmail: form.getValues("recipientEmail"),
        customerName: invoiceData.customerName,
        invoiceNumber: invoiceData.invoiceNumber,
      });

      if (result.success) {
        toast({ 
          title: "Email Sent (Simulated)", 
          description: `Subject: "${result.emailSubject}". Email to ${form.getValues("recipientEmail")} for invoice ${invoiceData.invoiceNumber} has been simulated.`
        });
        setStep('sent_confirmation'); // Optional: show a final confirmation screen
        // onOpenChange(false); // Or just close
      } else {
        toast({ title: "Email Not Sent", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Send Invoice Email Error:", error);
      toast({ title: "Error", description: error.message || "Failed to simulate sending email.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (!invoiceData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && step !== 'sent_confirmation') { // Allow viewing confirmation before closing
             onOpenChange(false);
        } else if (!open && step === 'sent_confirmation') {
             onOpenChange(false); // If already on confirmation, just close
        }
        if (open && step === 'sent_confirmation') setStep('enter_email'); // Reset if re-opened
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> 
            {step === 'enter_email' && `Send Invoice ${invoiceData.invoiceNumber}`}
            {step === 'preview_email' && `Preview Email for Invoice ${invoiceData.invoiceNumber}`}
            {step === 'sent_confirmation' && `Email Simulated for ${invoiceData.invoiceNumber}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'enter_email' && (
          <>
            <p className="text-sm text-muted-foreground">
              Enter recipient's email for invoice <span className="font-semibold">{invoiceData.invoiceNumber}</span> for <span className="font-semibold">{invoiceData.customerName}</span>.
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
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isSending}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSending}>
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Preview Email Content
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {step === 'preview_email' && emailContent && (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertTitle>Email Preview</AlertTitle>
                    <AlertDescription>This is the content that will be simulated as sent.</AlertDescription>
                </Alert>
                <FormItem>
                    <FormLabel>To:</FormLabel>
                    <Input readOnly disabled value={form.getValues("recipientEmail")} />
                </FormItem>
                <FormItem>
                    <FormLabel>Subject:</FormLabel>
                    <Input readOnly disabled value={emailContent.subject} />
                </FormItem>
                <FormItem>
                    <FormLabel>Body:</FormLabel>
                    <Textarea readOnly disabled value={emailContent.body} rows={10} className="bg-muted/50"/>
                </FormItem>
                 <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep('enter_email')} disabled={isSending}>Back</Button>
                    <Button onClick={handleSendEmail} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                        {isSending ? 'Sending...' : 'Confirm & Send (Simulate)'}
                    </Button>
                </DialogFooter>
            </div>
        )}
        
        {step === 'sent_confirmation' && emailContent && (
            <div className="space-y-4 py-2">
                <Alert variant="default" className="border-green-500">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-700">Email Sent Successfully (Simulated)!</AlertTitle>
                    <AlertDescription>
                        The following email content was notionally sent to {form.getValues("recipientEmail")}:
                    </AlertDescription>
                </Alert>
                 <div className="p-3 border rounded-md bg-muted/30 text-sm space-y-1">
                    <p><strong>Subject:</strong> {emailContent.subject}</p>
                    <p className="whitespace-pre-wrap"><strong>Body:</strong> {emailContent.body}</p>
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

// Helper Icon (replace with lucide if CheckCircle is available there or use another)
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

    