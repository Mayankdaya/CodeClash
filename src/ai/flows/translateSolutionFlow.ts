'use server';
/**
 * @fileOverview A flow to translate a full code solution to a different language.
 *
 * - translateSolution - A function that translates a solution.
 * - TranslateSolutionInput - The input type for the translateSolution function.
 * - TranslateSolutionOutput - The return type for the translateSolution function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateSolutionInputSchema = z.object({
  sourceCode: z.string().describe('The source code of the complete solution to be translated.'),
  sourceLanguage: z.string().describe('The programming language of the source code.'),
  targetLanguage: z.string().describe('The target programming language.'),
  entryPoint: z.string().describe('The name of the function to be translated (the entry point).'),
});
export type TranslateSolutionInput = z.infer<typeof TranslateSolutionInputSchema>;

const TranslateSolutionOutputSchema = z.object({
    translatedCode: z.string().describe('The translated, complete solution in the target language.'),
});
export type TranslateSolutionOutput = z.infer<typeof TranslateSolutionOutputSchema>;


export async function translateSolution(input: TranslateSolutionInput): Promise<TranslateSolutionOutput> {
  return translateSolutionFlow(input);
}

const translateSolutionPrompt = ai.definePrompt({
  name: 'translateSolutionPrompt',
  input: { schema: TranslateSolutionInputSchema },
  output: { schema: TranslateSolutionOutputSchema },
  prompt: `You are an expert programmer specializing in code translation. Your task is to translate a given code solution from one language to another, ensuring functional equivalence.

**IMPORTANT RULES:**
1.  **Translate the Logic:** You MUST translate the full implementation logic of the source code. The output should be a complete, working solution in the target language.
2.  **Maintain Signature:** Maintain the original function signature as closely as possible in the target language's idiomatic style.
3.  **Entry Point:** The main function to be translated is named '{{{entryPoint}}}'.
    *   For Python, it should be 'def {{{entryPoint}}}(...): ...'.
    *   For Java, it must be part of a public class named 'Solution'.
    *   For C++, it can be a standalone function.
4.  **Clean Code:** Return *only* the translated code. Do not include any extra explanations, comments, or markdown formatting like \`\`\`.

Source Language: {{{sourceLanguage}}}
Target Language: {{{targetLanguage}}}

Source Solution:
\`\`\`
{{{sourceCode}}}
\`\`\`

Provide the translated and fully implemented solution for the '{{{targetLanguage}}}' language.
`,
});

const translateSolutionFlow = ai.defineFlow(
  {
    name: 'translateSolutionFlow',
    inputSchema: TranslateSolutionInputSchema,
    outputSchema: TranslateSolutionOutputSchema,
  },
  async (input) => {
    const { output } = await translateSolutionPrompt(input);
    if (!output) {
      throw new Error('Failed to translate the solution from the AI model.');
    }
    return output;
  }
);
