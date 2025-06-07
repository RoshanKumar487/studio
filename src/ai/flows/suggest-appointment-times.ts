
// This Genkit flow is no longer used and can be deleted.
// All AI Scheduler functionality has been removed and replaced by the AI Assistant page.

'use server';

/**
 * @fileOverview This file defined a Genkit flow for suggesting optimal appointment times.
 * This functionality has been removed.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAppointmentTimesInputSchema_REMOVED = z.object({
  // ...
});
export type SuggestAppointmentTimesInput_REMOVED = z.infer<
  typeof SuggestAppointmentTimesInputSchema_REMOVED
>;

const SuggestAppointmentTimesOutputSchema_REMOVED = z.object({
  // ...
});
export type SuggestAppointmentTimesOutput_REMOVED = z.infer<
  typeof SuggestAppointmentTimesOutputSchema_REMOVED
>;

export async function suggestAppointmentTimes_REMOVED(
  input: SuggestAppointmentTimesInput_REMOVED
): Promise<SuggestAppointmentTimesOutput_REMOVED> {
  // Functionality removed
  throw new Error("AI Scheduler functionality has been removed.");
}

const prompt_REMOVED = ai.definePrompt({
  name: 'suggestAppointmentTimesPrompt_REMOVED',
  // ...
});

const suggestAppointmentTimesFlow_REMOVED = ai.defineFlow(
  {
    name: 'suggestAppointmentTimesFlow_REMOVED',
    // ...
  },
  async input => {
    throw new Error("AI Scheduler functionality has been removed.");
  }
);

    