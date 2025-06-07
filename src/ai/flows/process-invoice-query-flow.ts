
'use server';
/**
 * @fileOverview A Genkit flow to process natural language queries about invoices.
 *
 * - processInvoiceQuery - Parses text to understand intent (get details or update status) and extracts relevant info.
 * - ProcessInvoiceQueryInput - Input schema for the flow.
 * - ProcessInvoiceQueryOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const invoiceStatuses = ['Draft', 'Sent', 'Paid', 'Overdue'] as const;

export const ProcessInvoiceQueryInputSchema = z.object({
  query: z.string().describe('Natural language query about an invoice. E.g., "Show details for INV-2024-0001" or "Mark INV-2024-0002 as Paid".'),
});
export type ProcessInvoiceQueryInput = z.infer<typeof ProcessInvoiceQueryInputSchema>;

export const ProcessInvoiceQueryOutputSchema = z.object({
  intent: z.enum(['get_details', 'update_status', 'unknown']).describe('The recognized intent of the query.'),
  invoiceNumber: z.string().optional().describe('The invoice number extracted from the query (e.g., "INV-2024-0001").'),
  newStatus: z.enum(invoiceStatuses).optional().describe('The new status for an update_status intent.'),
  message: z.string().describe('A message summarizing the action or asking for clarification if the query is unclear.'),
});
export type ProcessInvoiceQueryOutput = z.infer<typeof ProcessInvoiceQueryOutputSchema>;

export async function processInvoiceQuery(input: ProcessInvoiceQueryInput): Promise<ProcessInvoiceQueryOutput> {
  return processInvoiceQueryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processInvoiceQueryPrompt',
  input: { schema: ProcessInvoiceQueryInputSchema },
  output: { schema: ProcessInvoiceQueryOutputSchema },
  prompt: `You are an AI assistant for managing invoices. Analyze the user's query to determine their intent and extract key information.

User Query: {{{query}}}

Your task is to:
1.  Determine the intent:
    *   If the query is asking to view or get details of an invoice (e.g., "show invoice INV-123", "details for INV-XYZ", "what is invoice ABC-001?"), set intent to 'get_details'.
    *   If the query is asking to change the status of an invoice (e.g., "mark INV-123 as Paid", "update status of INV-XYZ to Sent", "set INV-ABC to Overdue"), set intent to 'update_status'.
    *   Otherwise, set intent to 'unknown'.
2.  Extract the invoiceNumber: This usually looks like "INV-YYYY-NNNN" or similar.
3.  If the intent is 'update_status', extract the newStatus. The status must be one of: ${invoiceStatuses.join(', ')}.
4.  Provide a concise message:
    *   For 'get_details': "Getting details for invoice [invoiceNumber]."
    *   For 'update_status': "Attempting to update invoice [invoiceNumber] to [newStatus]."
    *   For 'unknown': "Sorry, I didn't understand that. You can ask to 'show details for INV-XXXX' or 'update status of INV-XXXX to Paid/Sent/Draft/Overdue'."
    *   If invoice number is missing for a clear intent: "Please specify the invoice number."
    *   If status is missing or invalid for 'update_status': "Please specify a valid status (${invoiceStatuses.join(', ')}) for the invoice."

Respond with a JSON object matching the ProcessInvoiceQueryOutputSchema.

Examples:
Query: "Show me invoice INV-2024-0042"
Output: { "intent": "get_details", "invoiceNumber": "INV-2024-0042", "message": "Getting details for invoice INV-2024-0042." }

Query: "Change status of INV-2023-001 to Paid"
Output: { "intent": "update_status", "invoiceNumber": "INV-2023-001", "newStatus": "Paid", "message": "Attempting to update invoice INV-2023-001 to Paid." }

Query: "Set INV-007 to Overdue"
Output: { "intent": "update_status", "invoiceNumber": "INV-007", "newStatus": "Overdue", "message": "Attempting to update invoice INV-007 to Overdue." }

Query: "What's up?"
Output: { "intent": "unknown", "message": "Sorry, I didn't understand that. You can ask to 'show details for INV-XXXX' or 'update status of INV-XXXX to Paid/Sent/Draft/Overdue'." }

Query: "Update status to Paid"
Output: { "intent": "update_status", "message": "Please specify the invoice number." }

Query: "Mark INV-111 as shipped"
Output: { "intent": "update_status", "invoiceNumber": "INV-111", "message": "Please specify a valid status (Draft, Sent, Paid, Overdue) for the invoice." }
`,
});

const processInvoiceQueryFlow = ai.defineFlow(
  {
    name: 'processInvoiceQueryFlow',
    inputSchema: ProcessInvoiceQueryInputSchema,
    outputSchema: ProcessInvoiceQueryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
     if (!output) {
      return {
        intent: 'unknown',
        message: 'AI model did not return an output. Please try rephrasing your query.',
      };
    }
    // Additional validation based on intent
    if (output.intent === 'get_details' && !output.invoiceNumber) {
        return { ...output, intent: 'unknown', message: "Please specify the invoice number for which you want details."};
    }
    if (output.intent === 'update_status' && !output.invoiceNumber) {
        return { ...output, intent: 'unknown', message: "Please specify the invoice number to update."};
    }
    if (output.intent === 'update_status' && output.invoiceNumber && !output.newStatus) {
        return { ...output, intent: 'unknown', message: `Please specify a valid new status (${invoiceStatuses.join(", ")}) for invoice ${output.invoiceNumber}.`};
    }
    return output;
  }
);
