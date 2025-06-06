'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting optimal appointment times based on historical data and revenue projections.
 *
 * - suggestAppointmentTimes - A function that suggests optimal appointment times.
 * - SuggestAppointmentTimesInput - The input type for the suggestAppointmentTimes function.
 * - SuggestAppointmentTimesOutput - The return type for the suggestAppointmentTimes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAppointmentTimesInputSchema = z.object({
  historicalData: z
    .string()
    .describe(
      'Historical appointment data, including date, time, duration, and revenue generated.'
    ),
  revenueProjections: z
    .string()
    .describe('Revenue projections for the upcoming weeks or months.'),
  appointmentDuration: z
    .number()
    .describe('The duration of the appointment in minutes.'),
  availableDays: z
    .string()
    .describe('Days of the week the appointment can be scheduled on.'),
  availableTimeSlots: z
    .string()
    .describe('Time slots available to schedule an appointment'),
});
export type SuggestAppointmentTimesInput = z.infer<
  typeof SuggestAppointmentTimesInputSchema
>;

const SuggestAppointmentTimesOutputSchema = z.object({
  suggestedTimes: z
    .string()
    .describe(
      'Suggested optimal appointment times based on historical data and revenue projections.'
    ),
  reasoning: z
    .string()
    .describe(
      'Explanation of why the suggested times are optimal, based on the input data.'
    ),
});
export type SuggestAppointmentTimesOutput = z.infer<
  typeof SuggestAppointmentTimesOutputSchema
>;

export async function suggestAppointmentTimes(
  input: SuggestAppointmentTimesInput
): Promise<SuggestAppointmentTimesOutput> {
  return suggestAppointmentTimesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAppointmentTimesPrompt',
  input: {schema: SuggestAppointmentTimesInputSchema},
  output: {schema: SuggestAppointmentTimesOutputSchema},
  prompt: `You are an AI assistant that suggests optimal appointment times for businesses.

  Based on the historical data, revenue projections, and the business owner's preferences for appointment duration and available days, you need to find the best possible appointment times to maximize their earnings.

  Historical Data: {{{historicalData}}}
  Revenue Projections: {{{revenueProjections}}}
  Appointment Duration: {{{appointmentDuration}}} minutes
  Available Days: {{{availableDays}}}
  Available Time Slots: {{{availableTimeSlots}}}

  Consider these factors and suggest appointment times in a structured and readable format.
  Explain the reasoning behind your suggestions.
  `,
});

const suggestAppointmentTimesFlow = ai.defineFlow(
  {
    name: 'suggestAppointmentTimesFlow',
    inputSchema: SuggestAppointmentTimesInputSchema,
    outputSchema: SuggestAppointmentTimesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
