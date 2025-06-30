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

const TestCaseSchema = z.object({
  input: z.any().describe("An array of arguments for the function. For example, for a function twoSum(nums, target), an input could be [[2, 7, 11, 15], 9]."),
  expected: z.any().describe("The expected output for the test case."),
});

const ProblemSchema: z.ZodType<Problem> = z.object({
  id: z.string().describe('A unique identifier for the problem, in kebab-case. e.g., "two-sum"'),
  title: z.string().describe('The title of the coding problem.'),
  description: z.string().describe('A detailed description of the problem. Use newlines (`\\n`) for formatting. Do not use Markdown characters like `#` or `*`.'),
  example: z.object({
    input: z.string().describe('A human-readable string representing an example input for the problem.'),
    output: z.string().describe('The corresponding human-readable output for the example input.'),
    explanation: z.string().optional().describe('An optional explanation of the example.'),
  }),
  starterCode: z.string().describe('Boilerplate code in JavaScript for the user to start with. IMPORTANT: The function must be defined as a variable, like `var twoSum = function(nums, target) { ... };`'),
  testCases: z.array(TestCaseSchema).min(3).describe("An array of at least 3 test cases to verify the solution. The 'input' field should be an array of arguments to pass to the function."),
  entryPoint: z.string().describe("The name of the function to be tested, e.g., 'twoSum'."),
});
export type { Problem };

const GenerateProblemInputSchema = z.object({
  topic: z.string().describe('The topic for the coding problem, e.g., "Arrays & Hashing", "Dynamic Programming".'),
  seed: z.string().optional().describe('A random string to ensure the problem is unique and not from a cache.'),
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

The problem should be self-contained and clearly explained. The difficulty should be easy to medium. The problem, examples, and test cases should be solvable in JavaScript.

Topic: {{{topic}}}

Generate a problem with the following structure:
- A unique ID in kebab-case.
- A clear title.
- A detailed description. Use newlines for spacing and structure. DO NOT use any Markdown formatting like '#' for headers or '*' for lists.
- One clear example with a human-readable input, output, and an optional explanation.
- Starter code in JavaScript. CRITICAL: The function must be declared as a variable, for example: 'var twoSum = function(nums, target) { ... };' This format is essential for the testing environment.
- An array of at least 3 test cases, where each 'input' is an array of arguments for the function.
- The name of the main function to be called for testing (the 'entryPoint').
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
