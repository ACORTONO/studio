
'use server';
/**
 * @fileOverview Generates a unique invoice number using an LLM to avoid collisions.
 *
 * - generateInvoiceNumber - A function that generates a unique invoice number.
 * - GenerateInvoiceNumberInput - The input type for the generateInvoiceNumber function.
 * - GenerateInvoiceNumberOutput - The return type for the generateInvoiceNumber function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInvoiceNumberInputSchema = z.object({
  existingInvoiceNumbers: z
    .array(z.string())
    .describe('A list of existing invoice numbers to avoid collisions.'),
  currentDate: z.string().describe('The current date in YYYY-MM-DD format.')
});
export type GenerateInvoiceNumberInput = z.infer<
  typeof GenerateInvoiceNumberInputSchema
>;

const GenerateInvoiceNumberOutputSchema = z.object({
  invoiceNumber: z
    .string()
    .describe('A unique invoice number that does not exist in the provided list.'),
});
export type GenerateInvoiceNumberOutput = z.infer<
  typeof GenerateInvoiceNumberOutputSchema
>;

export async function generateInvoiceNumber(
  input: GenerateInvoiceNumberInput
): Promise<GenerateInvoiceNumberOutput> {
  return generateInvoiceNumberFlow(input);
}

const generateInvoiceNumberPrompt = ai.definePrompt({
  name: 'generateInvoiceNumberPrompt',
  input: {schema: GenerateInvoiceNumberInputSchema},
  output: {schema: GenerateInvoiceNumberOutputSchema},
  prompt: `You are an invoice number generator.

  The current date is {{currentDate}}.

  Given a list of existing invoice numbers:
  {{#each existingInvoiceNumbers}}
  - {{this}}
  {{/each}}

  Generate a new invoice number that is unique and does not exist in the list. The invoice number should be in the format INV-YYYYMMDD-NNNN where YYYY, MM, and DD are from the current date, and NNNN is a 4-digit sequence number, starting from 0001.
  Do not generate a invoice number that already exists in the list.
  `,
});

const generateInvoiceNumberFlow = ai.defineFlow(
  {
    name: 'generateInvoiceNumberFlow',
    inputSchema: GenerateInvoiceNumberInputSchema,
    outputSchema: GenerateInvoiceNumberOutputSchema,
  },
  async input => {
    const {output} = await generateInvoiceNumberPrompt(input);
    return output!;
  }
);
