
'use server';
/**
 * @fileOverview A Genkit flow to parse text and extract employee details for creation.
 *
 * - addEmployeeByText - Parses text to extract employee information.
 * - AddEmployeeByTextInput - The input type for the addEmployeeByText function.
 * - AddEmployeeByTextOutput - The return type for the addEmployeeByText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Keep employmentTypes in sync with src/app/(app)/hr/page.tsx
const employmentTypes = ['Full-time', 'Part-time', 'Contract'] as const;

export const AddEmployeeByTextInputSchema = z.object({
  employeeText: z.string().describe('Natural language text describing the employee to be added. Include name, email, job title, start date (YYYY-MM-DD), and employment type.'),
});
export type AddEmployeeByTextInput = z.infer<typeof AddEmployeeByTextInputSchema>;

export const AddEmployeeByTextOutputSchema = z.object({
  success: z.boolean().describe('Whether the parsing was successful and all required fields are present.'),
  message: z.string().describe('A message indicating success or failure, or asking for clarification.'),
  name: z.string().optional().describe('Extracted full name of the employee.'),
  email: z.string().email().optional().describe('Extracted email address of the employee.'),
  jobTitle: z.string().optional().describe('Extracted job title of the employee.'),
  startDate: z.string().optional().describe('Extracted start date in YYYY-MM-DD format.'),
  employmentType: z.enum(employmentTypes).optional().describe('Extracted employment type.'),
});
export type AddEmployeeByTextOutput = z.infer<typeof AddEmployeeByTextOutputSchema>;


export async function addEmployeeByText(input: AddEmployeeByTextInput): Promise<AddEmployeeByTextOutput> {
  return addEmployeeByTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'addEmployeeByTextPrompt',
  input: { schema: AddEmployeeByTextInputSchema },
  output: { schema: AddEmployeeByTextOutputSchema },
  prompt: `You are an AI assistant helping to add new employees based on text input.
Parse the following text to extract employee details: name, email, jobTitle, startDate, and employmentType.

Text: {{{employeeText}}}

Guidelines:
- Name is mandatory. If not found, set success to false and message to "Employee name is required."
- If email is provided, it must be a valid email format.
- StartDate should be in YYYY-MM-DD format if mentioned. If a relative date like "tomorrow" or "next Monday" is given, try to calculate it based on the current date (assume current date is ${new Date().toISOString().split('T')[0]}).
- EmploymentType must be one of: ${employmentTypes.join(', ')}.
- If any crucial information (like name) is missing or unclear, set 'success' to false and provide a clear 'message' asking for clarification or stating what's missing.
- If all necessary information for adding an employee seems present (at least name), set 'success' to true.

Respond with a JSON object matching the AddEmployeeByTextOutputSchema.
Example of a good extraction:
Input: "Add new team member Jane Doe, email is jane.d@example.com, position Senior Developer, starts next Monday (current date 2024-07-15), contract based."
Output: { "success": true, "message": "Employee details extracted.", "name": "Jane Doe", "email": "jane.d@example.com", "jobTitle": "Senior Developer", "startDate": "2024-07-22", "employmentType": "Contract" }

Input: "John Smith, john@test.com"
Output: { "success": true, "message": "Employee details extracted. Job title, start date, and employment type are optional.", "name": "John Smith", "email": "john@test.com" }

Input: "Employee: Sarah, title Manager"
Output: { "success": true, "message": "Employee details extracted.", "name": "Sarah", "jobTitle": "Manager" }

Input: "Need to add someone."
Output: { "success": false, "message": "Employee name is required. Please provide more details." }
`,
});


const addEmployeeByTextFlow = ai.defineFlow(
  {
    name: 'addEmployeeByTextFlow',
    inputSchema: AddEmployeeByTextInputSchema,
    outputSchema: AddEmployeeByTextOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        return {
            success: false,
            message: 'AI model did not return an output. Please try rephrasing your request.',
        };
    }
    // Basic validation after AI output
    if (output.success && !output.name) {
        return {
            ...output,
            success: false,
            message: 'AI successfully parsed but employee name is missing in the output. Please ensure the name is clearly stated.',
        };
    }
    return output;
  }
);
