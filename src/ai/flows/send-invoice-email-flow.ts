
'use server';
/**
 * @fileOverview A Genkit flow to simulate sending an invoice email.
 *
 * - sendInvoiceEmail - Simulates sending an invoice email.
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
Acknowledge this request positively and confirm that the (mock) email has been "sent".
Invoice ID for reference (do not include in response to user): {{invoiceId}}.
Respond with success: true.
`,
});

const sendInvoiceEmailFlow = ai.defineFlow(
  {
    name: 'sendInvoiceEmailFlow',
    inputSchema: SendInvoiceEmailInputSchema,
    outputSchema: SendInvoiceEmailOutputSchema,
  },
  async (input) => {
    console.log(`Simulating sending invoice email:
      Invoice ID: ${input.invoiceId}
      Recipient: ${input.recipientEmail}
      Customer: ${input.customerName}
      Invoice Number: ${input.invoiceNumber}`);

    // In a real scenario, you would integrate with an email service here.
    // For this prototype, we'll use the LLM to generate a confirmation message.
    const { output } = await prompt(input);

    if (!output) {
      return {
        success: false,
        message: 'AI model did not return an output for email simulation.',
      };
    }
    
    // Ensure the output matches the schema, even if the prompt is simple
    return {
        success: output.success !== undefined ? output.success : true, // Default to true if prompt doesn't set it
        message: output.message || `Successfully simulated sending invoice ${input.invoiceNumber} to ${input.recipientEmail}.`
    };
  }
);

