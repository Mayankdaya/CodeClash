
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
  input: z.any().describe("An array of arguments for the function. IMPORTANT: Values within this array must be valid JSON primitives, arrays, or objects. They MUST NOT be strings that represent JSON (e.g., use `[1, 2]` instead of `'[1, 2]'`). For a function twoSum(nums, target), an example input is [[2, 7, 11, 15], 9]."),
  expected: z.any().refine(val => val !== null && val !== undefined, { message: "Expected value cannot be null or undefined." }).describe("The expected output for the test case. It MUST NOT be null or undefined."),
});

const ProblemSchema: z.ZodType<Problem> = z.object({
  id: z.string().describe('A unique identifier for the problem, in kebab-case. e.g., "two-sum"'),
  title: z.string().describe('The title of the coding problem.'),
  description: z.string().describe('A detailed description of the problem. Use newlines (`\\n`) for formatting. Do not use Markdown characters like `#` or `*`.'),
  examples: z.array(z.object({
    input: z.string().describe('A human-readable string representing an example input for the problem.'),
    output: z.string().describe('The corresponding human-readable output for the example input.'),
    explanation: z.string().optional().describe('An optional explanation of the example.'),
  })).min(3).describe('An array of at least 3 clear examples with human-readable inputs, outputs, and optional explanations.'),
  starterCode: z.string().describe('Boilerplate code in JavaScript for the user to start with, as a standard function declaration. e.g., "function twoSum(nums, target) { ... }"'),
  solution: z.string().describe('A correct and optimal solution in JavaScript.'),
  testCases: z.array(TestCaseSchema).min(5).describe("An array of at least 5 test cases to verify the solution. The 'input' field should be an array of arguments for the function."),
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

**CRITICAL INSTRUCTIONS:**
1.  **Output Format:** You MUST return a single JSON object that strictly adheres to the provided schema. ALL fields (\`id\`, \`title\`, \`description\`, \`examples\`, \`starterCode\`, \`solution\`, \`testCases\`, \`entryPoint\`) are mandatory.
2.  **TEST CASE VALIDITY IS PARAMOUNT:** This is the most important rule.
    *   You MUST provide at least 5 complete test cases.
    *   For every single test case, the \`expected\` field MUST have a valid, concrete value. It CANNOT be \`null\` or \`undefined\`.
    *   For problems where the output is an empty structure (like an empty array \`[]\`), use that structure as the \`expected\` value. DO NOT use \`null\`.
3.  **\`testCases\` \`input\` Format:** The \`input\` values inside \`testCases\` MUST be pure JSON arrays of arguments, NOT strings that look like JSON. For example, for a function that takes an array and a number, the value must be \`[[1, 2, 3], 42]\`, NOT \`'["[1, 2, 3]", "42"]'\`.
4.  **No Comments:** The final JSON output must NOT contain any comments.

**Topic:** {{{topic}}}
**Unique Request Seed:** {{{seed}}}

Generate a problem with all the required fields, paying special attention to the format and validity of the \`testCases\`.
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
