
'use server';
/**
 * @fileOverview A flow to generate a hint for a coding problem.
 *
 * - getHint - A function that generates a hint for a problem.
 * - GetHintInput - The input type for the getHint function.
 * - GetHintOutput - The return type for the getHint function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetHintInputSchema = z.object({
  problemTitle: z.string().describe('The title of the coding problem.'),
  problemDescription: z.string().describe('The description of the coding problem.'),
  userCode: z.string().describe("The user's current code solution."),
});
export type GetHintInput = z.infer<typeof GetHintInputSchema>;

const GetHintOutputSchema = z.object({
    hint: z.string().describe('A helpful, non-obvious hint to help the user solve the problem. Do not give away the full solution. Focus on the algorithmic approach or a key observation needed.'),
});
export type GetHintOutput = z.infer<typeof GetHintOutputSchema>;


export async function getHint(input: GetHintInput): Promise<GetHintOutput> {
  return getHintFlow(input);
}

const getHintPrompt = ai.definePrompt({
  name: 'getHintPrompt',
  input: { schema: GetHintInputSchema },
  output: { schema: GetHintOutputSchema },
  prompt: `You are a helpful coding assistant in a competitive programming platform called CodeClash. The user is stuck on a problem and has requested a hint.

Your task is to provide a single, concise, and helpful hint.

IMPORTANT RULES:
1.  **DO NOT** provide the final code or the direct solution.
2.  **DO NOT** just rephrase the problem description.
3.  Your hint should guide the user towards the correct algorithmic approach, data structure, or a key insight they might be missing.
4.  Analyze their current code to see what they might be struggling with, but your hint should be general enough to be useful even if their code is completely wrong.

Problem Title: {{{problemTitle}}}
Problem Description: {{{problemDescription}}}

User's Current Code:
\`\`\`
{{{userCode}}}
\`\`\`

Based on all this information, provide one single hint.
`,
});

const getHintFlow = ai.defineFlow(
  {
    name: 'getHintFlow',
    inputSchema: GetHintInputSchema,
    outputSchema: GetHintOutputSchema,
  },
  async (input) => {
    const { output } = await getHintPrompt(input);
    if (!output) {
      throw new Error('Failed to generate a hint from the AI model.');
    }
    return output;
  }
);
