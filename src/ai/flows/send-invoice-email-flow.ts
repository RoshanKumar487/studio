
'use server';
/**
 * @fileOverview A Genkit flow to simulate sending an invoice email and generate email content.
 *
 * - sendInvoiceEmail - Simulates sending an invoice email and generates content.
 * - SendInvoiceEmailInput - The input type for the sendInvoiceEmail function.
 * - SendInvoiceEmailOutput - The return type for the sendInvoiceEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SendInvoiceEmailInputSchema = z.object({
  invoiceId: z.string().describe('The ID of the invoice to be sent.'),
  recipientEmail: z.string().email().describe('The email address of the recipient.'),
  customerName: z.string().describe('The name of the customer receiving the invoice.'),
  invoiceNumber: z.string().describe('The invoice number.'),
});
export type SendInvoiceEmailInput = z.infer<typeof SendInvoiceEmailInputSchema>;

const SendInvoiceEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email sending simulation was successful.'),
  message: z.string().describe('A message indicating the outcome of the simulation.'),
  emailSubject: z.string().describe('The generated subject line for the email.'),
  emailBody: z.string().describe('The generated body content for the email.'),
});
export type SendInvoiceEmailOutput = z.infer<typeof SendInvoiceEmailOutputSchema>;

export async function sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<SendInvoiceEmailOutput> {
  return sendInvoiceEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sendInvoiceEmailPrompt',
  input: { schema: SendInvoiceEmailInputSchema },
  output: { schema: SendInvoiceEmailOutputSchema },
  prompt: `You are an invoicing assistant. A request has been made to send invoice {{invoiceNumber}} for customer "{{customerName}}" to the email address: {{recipientEmail}}.
  It is assumed that the actual invoice PDF named "Invoice {{invoiceNumber}}.pdf" will be attached to this email.
  
Generate a professional email subject and body for this invoice.
The company sending the invoice is "FlowHQ".

Subject Line:
- Should clearly state it's an invoice.
- Include the invoice number: {{invoiceNumber}}.
- Include the sender company name: FlowHQ.
Example: "Invoice {{invoiceNumber}} from FlowHQ for {{customerName}}"

Email Body:
- Start with a polite greeting to "{{customerName}}".
- Clearly state that their invoice {{invoiceNumber}} from FlowHQ is attached (or available via a link if you prefer that phrasing, but mention the attachment concept).
- You can include a brief thank you for their business.
- End with a professional closing (e.g., "Sincerely," or "Best regards,").
- Sign off with "The FlowHQ Team" or "FlowHQ".

Respond with:
- success: true
- message: A confirmation message like "Email for invoice {{invoiceNumber}} to {{customerName}} prepared and simulated as sent, with Invoice {{invoiceNumber}}.pdf notionally attached."
- emailSubject: The generated subject line.
- emailBody: The generated email body.

Invoice ID for internal reference (do not include in the user-facing email content): {{invoiceId}}.
`,
});

const sendInvoiceEmailFlow = ai.defineFlow(
  {
    name: 'sendInvoiceEmailFlow',
    inputSchema: SendInvoiceEmailInputSchema,
    outputSchema: SendInvoiceEmailOutputSchema,
  },
  async (input) => {
    console.log(`Simulating sending invoice email and generating content:
      Invoice ID: ${input.invoiceId}
      Recipient: ${input.recipientEmail}
      Customer: ${input.customerName}
      Invoice Number: ${input.invoiceNumber}`);

    const { output } = await prompt(input);

    if (!output) {
      return {
        success: false,
        message: 'AI model did not return an output for email simulation.',
        emailSubject: 'Error: Could not generate subject',
        emailBody: 'Error: Could not generate email body.',
      };
    }
    
    return {
        success: output.success !== undefined ? output.success : true,
        message: output.message || `Successfully simulated sending invoice ${input.invoiceNumber} (with PDF attachment) to ${input.recipientEmail}.`,
        emailSubject: output.emailSubject || `Invoice ${input.invoiceNumber} from FlowHQ`,
        emailBody: output.emailBody || `Dear ${input.customerName},\n\nPlease find your invoice ${input.invoiceNumber} attached.\n\nThank you for your business,\nFlowHQ Team`,
    };
  }
);
