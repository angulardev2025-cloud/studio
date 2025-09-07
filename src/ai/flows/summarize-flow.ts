'use server';
/**
 * @fileOverview A flow for summarizing video descriptions.
 *
 * - summarizeDescription - A function that handles the summarization.
 * - SummarizeInput - The input type for the summarizeDescription function.
 * - SummarizeOutput - The return type for the summarizeDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInputSchema = z.object({
  description: z.string().describe('The video description to summarize.'),
});
export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;

const SummarizeOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise, easy-to-read summary of the video description.'),
});
export type SummarizeOutput = z.infer<typeof SummarizeOutputSchema>;

export async function summarizeDescription(
  input: SummarizeInput
): Promise<SummarizeOutput> {
  return summarizeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizePrompt',
  input: {schema: SummarizeInputSchema},
  output: {schema: SummarizeOutputSchema},
  prompt: `You are an expert content summarizer.
Your task is to create a concise, easy-to-read summary from the provided video description.
Focus on the key topics and takeaways. The summary should be no more than 3-4 sentences.

Video Description:
{{{description}}}`,
});

const summarizeFlow = ai.defineFlow(
  {
    name: 'summarizeFlow',
    inputSchema: SummarizeInputSchema,
    outputSchema: SummarizeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
