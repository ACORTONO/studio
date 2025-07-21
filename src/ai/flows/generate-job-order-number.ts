'use server';
/**
 * @fileOverview Generates a unique job order number using an LLM to avoid collisions.
 *
 * - generateJobOrderNumber - A function that generates a unique job order number.
 * - GenerateJobOrderNumberInput - The input type for the generateJobOrderNumber function.
 * - GenerateJobOrderNumberOutput - The return type for the generateJobOrderNumber function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateJobOrderNumberInputSchema = z.object({
  existingJobOrderNumbers: z
    .array(z.string())
    .describe('A list of existing job order numbers to avoid collisions.'),
  currentDate: z.string().describe('The current date in YYYY-MM-DD format.')
});
export type GenerateJobOrderNumberInput = z.infer<
  typeof GenerateJobOrderNumberInputSchema
>;

const GenerateJobOrderNumberOutputSchema = z.object({
  jobOrderNumber: z
    .string()
    .describe('A unique job order number that does not exist in the provided list.'),
});
export type GenerateJobOrderNumberOutput = z.infer<
  typeof GenerateJobOrderNumberOutputSchema
>;

export async function generateJobOrderNumber(
  input: GenerateJobOrderNumberInput
): Promise<GenerateJobOrderNumberOutput> {
  return generateJobOrderNumberFlow(input);
}

const generateJobOrderNumberPrompt = ai.definePrompt({
  name: 'generateJobOrderNumberPrompt',
  input: {schema: GenerateJobOrderNumberInputSchema},
  output: {schema: GenerateJobOrderNumberOutputSchema},
  prompt: `You are a job order number generator.

  The current date is {{currentDate}}.

  Given a list of existing job order numbers:
  {{#each existingJobOrderNumbers}}
  - {{this}}
  {{/each}}

  Generate a new job order number that is unique and does not exist in the list. The job order number should be in the format JO-YYYYMMDD-NNNN where YYYY, MM, and DD are from the current date, and NNNN is a 4-digit sequence number, starting from 0001.
  Do not generate a job order number that already exists in the list.
  `,
});

const generateJobOrderNumberFlow = ai.defineFlow(
  {
    name: 'generateJobOrderNumberFlow',
    inputSchema: GenerateJobOrderNumberInputSchema,
    outputSchema: GenerateJobOrderNumberOutputSchema,
  },
  async input => {
    const {output} = await generateJobOrderNumberPrompt(input);
    return output!;
  }
);
