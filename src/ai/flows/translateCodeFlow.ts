
'use server';
/**
 * @fileOverview A flow to translate a code snippet to a different language.
 *
 * - translateCode - A function that translates code.
 * - TranslateCodeInput - The input type for the translateCode function.
 * - TranslateCodeOutput - The return type for the translateCode function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateCodeInputSchema = z.object({
  sourceCode: z.string().describe('The source code to be translated.'),
  sourceLanguage: z.string().describe('The programming language of the source code.'),
  targetLanguage: z.string().describe('The target programming language.'),
  entryPoint: z.string().describe('The name of the function to be translated (the entry point).'),
  isSolution: z.boolean().optional().describe('If true, translate the full implementation. If false or omitted, translate only the boilerplate.'),
});
export type TranslateCodeInput = z.infer<typeof TranslateCodeInputSchema>;

const TranslateCodeOutputSchema = z.object({
    translatedCode: z.string().describe('The translated code snippet in the target language.'),
});
export type TranslateCodeOutput = z.infer<typeof TranslateCodeOutputSchema>;


export async function translateCode(input: TranslateCodeInput): Promise<TranslateCodeOutput> {
  return translateCodeFlow(input);
}

const translateCodePrompt = ai.definePrompt({
  name: 'translateCodePrompt',
  input: { schema: TranslateCodeInputSchema },
  output: { schema: TranslateCodeOutputSchema },
  prompt: `You are an expert programmer specializing in code translation. Your task is to translate a given code snippet from one language to another.

IMPORTANT RULES:
{{#if isSolution}}
1.  **CRITICAL**: The source code is a full solution. Your translation MUST also be a full, correct, and optimal solution. Translate the implementation logic accurately.
{{else}}
1.  **CRITICAL**: The source code is a boilerplate/starter template. Your translation MUST also be a boilerplate. **DO NOT add any implementation logic.** The function body should be empty or contain only a placeholder comment (e.g., "// your code here").
{{/if}}
2.  Translate only the code provided. Maintain the original function signature as closely as possible in the target language.
3.  The main function to be translated is named '{{{entryPoint}}}'. Ensure the translated function is a standard function declaration appropriate for the target language.
    *   For Python, it should be 'def {{{entryPoint}}}(...): ...'.
    *   For Java, it must be part of a public class named 'Solution'.
    *   For C++, it can be a standalone function.
4.  Return *only* the translated code. Do not include any explanations, comments (other than the placeholder in the body, if applicable), or markdown formatting like \`\`\`.

Source Language: {{{sourceLanguage}}}
Target Language: {{{targetLanguage}}}

Source Code:
\`\`\`
{{{sourceCode}}}
\`\`\`

Provide the translated code for the '{{{targetLanguage}}}' language.
`,
});

const translateCodeFlow = ai.defineFlow(
  {
    name: 'translateCodeFlow',
    inputSchema: TranslateCodeInputSchema,
    outputSchema: TranslateCodeOutputSchema,
  },
  async (input) => {
    const { output } = await translateCodePrompt(input);
    if (!output) {
      throw new Error('Failed to translate the code from the AI model.');
    }
    return output;
  }
);
