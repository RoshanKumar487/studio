
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

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { recipientEmail: '' },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({ recipientEmail: '' }); // Reset form when dialog opens
    }
  }, [isOpen, form]);

  const onSubmit: SubmitHandler<EmailFormData> = async (data) => {
    if (!invoiceData) {
      toast({ title: "Error", description: "No invoice selected to send.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const result: SendInvoiceEmailOutput = await sendInvoiceEmail({
        invoiceId: invoiceData.id,
        recipientEmail: data.recipientEmail,
        customerName: invoiceData.customerName,
        invoiceNumber: invoiceData.invoiceNumber,
      });

      if (result.success) {
        toast({ title: "Email Sent (Simulated)", description: result.message });
        onOpenChange(false); // Close dialog on success
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Send Invoice {invoiceData.invoiceNumber}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Enter the recipient's email address to send invoice <span className="font-semibold">{invoiceData.invoiceNumber}</span> for <span className="font-semibold">{invoiceData.customerName}</span>.
          (This will simulate sending an email.)
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSending}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {isSending ? 'Sending...' : 'Send Email'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
