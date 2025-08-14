// src/ai/flows/reason-critical-event.ts
'use server';

/**
 * @fileOverview A reasoning tool to decide which events should be alerted to the administrator.
 *
 * - shouldAlert - A function that determines whether an event should trigger an alert.
 * - ShouldAlertInput - The input type for the shouldAlert function.
 * - ShouldAlertOutput - The return type for the shouldAlert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ShouldAlertInputSchema = z.object({
  severity: z
    .enum(['high', 'medium', 'low'])
    .describe('The severity of the event (high, medium, or low).'),
  timeOfDay: z
    .string()
    .describe('The current time of day (e.g., morning, afternoon, evening, night).'),
  adminWorkload: z
    .enum(['high', 'medium', 'low'])
    .describe('The current workload of the administrator (high, medium, or low).'),
  eventDescription: z.string().describe('A description of the event.'),
});
export type ShouldAlertInput = z.infer<typeof ShouldAlertInputSchema>;

const ShouldAlertOutputSchema = z.object({
  shouldAlert: z
    .boolean()
    .describe('Whether an alert should be triggered for this event.'),
  reason: z
    .string()
    .describe('The reasoning behind the decision to alert or not.'),
});
export type ShouldAlertOutput = z.infer<typeof ShouldAlertOutputSchema>;

export async function shouldAlert(input: ShouldAlertInput): Promise<ShouldAlertOutput> {
  return shouldAlertFlow(input);
}

const prompt = ai.definePrompt({
  name: 'shouldAlertPrompt',
  input: {schema: ShouldAlertInputSchema},
  output: {schema: ShouldAlertOutputSchema},
  prompt: `You are an AI assistant that helps determine whether a specific event should trigger an alert to the administrator based on the event's severity, the time of day, the administrator's current workload, and a description of the event.

Event Description: {{{eventDescription}}}
Severity: {{{severity}}}
Time of Day: {{{timeOfDay}}}
Administrator Workload: {{{adminWorkload}}}

Based on these factors, determine whether an alert should be triggered and provide a brief reason for your decision.
`,
});

const shouldAlertFlow = ai.defineFlow(
  {
    name: 'shouldAlertFlow',
    inputSchema: ShouldAlertInputSchema,
    outputSchema: ShouldAlertOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
