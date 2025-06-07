
'use server';
/**
 * @fileOverview A Genkit flow to classify a user's text query.
 *
 * - classifyTask - Classifies the user's query.
 * - ClassifyTaskInput - The input type for the classifyTask function.
 * - ClassifyTaskOutput - The return type for the classifyTask function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ClassifyTaskInputSchema = z.object({
  textQuery: z.string().describe('The user\'s natural language query.'),
});
export type ClassifyTaskInput = z.infer<typeof ClassifyTaskInputSchema>;

const TaskTypeEnum = z.enum(['employee_management', 'invoice_processing', 'unknown'])
  .describe("The type of task the user's query is related to.");
export type TaskType = z.infer<typeof TaskTypeEnum>;


const ClassifyTaskOutputSchema = z.object({
  taskType: TaskTypeEnum,
  originalQuery: z.string().describe('The original user query, passed through for convenience.'),
  message: z.string().describe('A message related to the classification, e.g., if unknown.'),
});
export type ClassifyTaskOutput = z.infer<typeof ClassifyTaskOutputSchema>;

export async function classifyTask(input: ClassifyTaskInput): Promise<ClassifyTaskOutput> {
  return classifyTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'classifyTaskPrompt',
  input: { schema: ClassifyTaskInputSchema },
  output: { schema: ClassifyTaskOutputSchema },
  prompt: `You are an AI assistant that classifies user queries.
Determine if the following user query is primarily related to 'employee_management', 'invoice_processing', or if it's 'unknown'.
Pass through the originalQuery.

User Query: {{{textQuery}}}

Examples:
Query: "Add new team member Jane Doe, email jane.d@example.com"
Output: { "taskType": "employee_management", "originalQuery": "Add new team member Jane Doe, email jane.d@example.com", "message": "Query classified as employee management." }

Query: "Show me invoice INV-2024-0042"
Output: { "taskType": "invoice_processing", "originalQuery": "Show me invoice INV-2024-0042", "message": "Query classified as invoice processing." }

Query: "What's the weather like?"
Output: { "taskType": "unknown", "originalQuery": "What's the weather like?", "message": "Query could not be classified as employee or invoice related." }

Respond with a JSON object matching the ClassifyTaskOutputSchema.
Ensure the 'originalQuery' field in your output contains the exact same text as the 'textQuery' input.
If taskType is 'unknown', provide a helpful message. Otherwise, a simple confirmation message is fine.
`,
});

const classifyTaskFlow = ai.defineFlow(
  {
    name: 'classifyTaskFlow',
    inputSchema: ClassifyTaskInputSchema,
    outputSchema: ClassifyTaskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      return {
        taskType: 'unknown' as TaskType,
        originalQuery: input.textQuery,
        message: 'AI model did not return a classification. Please try rephrasing your request.',
      };
    }
    // Ensure originalQuery is passed through and message is set
    return {
        ...output,
        originalQuery: input.textQuery, // Always use the input query for originalQuery
        message: output.message || (output.taskType === 'unknown' ? "Query could not be classified." : "Query classified."),
    };
  }
);
