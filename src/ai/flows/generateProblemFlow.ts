'use server';
/**
 * @fileOverview A flow to generate coding problems using AI.
 *
 * - generateProblem - A function that generates a new coding problem based on a topic.
 * - GenerateProblemInput - The input type for the generateProblem function.
 * - Problem - The return type for the generateProblem function, representing a coding problem.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Problem } from '@/lib/problems';

const ProblemSchema: z.ZodType<Problem> = z.object({
  id: z.string().describe('A unique identifier for the problem, in kebab-case. e.g., "two-sum"'),
  title: z.string().describe('The title of the coding problem.'),
  description: z.string().describe('A detailed description of the problem, formatted with Markdown (`\\n` for new lines).'),
  example: z.object({
    input: z.string().describe('An example input for the problem.'),
    output: z.string().describe('The corresponding output for the example input.'),
    explanation: z.string().optional().describe('An optional explanation of the example.'),
  }),
  starterCode: z.string().describe('Boilerplate code in JavaScript for the user to start with.'),
});
export type { Problem };

const GenerateProblemInputSchema = z.object({
  topic: z.string().describe('The topic for the coding problem, e.g., "Arrays & Hashing", "Dynamic Programming".')
});
export type GenerateProblemInput = z.infer<typeof GenerateProblemInputSchema>;


export async function generateProblem(input: GenerateProblemInput): Promise<Problem> {
  return generateProblemFlow(input);
}

const generateProblemPrompt = ai.definePrompt({
  name: 'generateProblemPrompt',
  input: { schema: GenerateProblemInputSchema },
  output: { schema: ProblemSchema },
  prompt: `You are an expert programming challenge creator for a platform called CodeClash. Your task is to generate a unique, LeetCode-style problem based on a given topic.

The problem should be self-contained and clearly explained. The difficulty should be easy to medium.

Topic: {{{topic}}}

Generate a problem with the following structure:
- A unique ID in kebab-case.
- A clear title.
- A detailed description using Markdown for formatting.
- One clear example with input, output, and an optional explanation.
- Starter code in JavaScript. The function signature should be clear.
`,
});

const generateProblemFlow = ai.defineFlow(
  {
    name: 'generateProblemFlow',
    inputSchema: GenerateProblemInputSchema,
    outputSchema: ProblemSchema,
  },
  async (input) => {
    const { output } = await generateProblemPrompt(input);
    if (!output) {
      throw new Error('Failed to generate a problem from the AI model.');
    }
    return output;
  }
);
