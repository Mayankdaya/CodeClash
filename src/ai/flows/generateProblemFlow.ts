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

// A schema for valid JSON values, restricted to primitives and arrays of
// primitives/arrays. This is a workaround for limitations in the backend API's
// schema parser, which dislikes fully generic object definitions.
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonSchema: z.ZodType<any> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema)])
);


const TestCaseSchema = z.object({
  input: z.array(jsonSchema).describe("An array of arguments for the function. This MUST be an array of pure JSON values (primitives or arrays). Objects are not supported."),
  expected: jsonSchema.refine(val => val !== null && val !== undefined, { message: "Expected value cannot be null or undefined." }).describe("The expected output for the test case. It MUST NOT be null or undefined."),
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
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium').optional().describe('The difficulty level of the problem.'),
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

The problem should be self-contained, clearly explained, and engaging. The difficulty should match the requested level (defaulting to medium if not specified). The problem, examples, and test cases should be solvable in JavaScript.

**CRITICAL INSTRUCTIONS - FOLLOW THESE EXACTLY:**
1.  **Output Format:** You MUST return a single JSON object that strictly adheres to the provided schema. ALL fields (\`id\`, \`title\`, \`description\`, \`examples\`, \`starterCode\`, \`solution\`, \`testCases\`, \`entryPoint\`) are mandatory.

2.  **Problem Description Quality:**
    *   Write clear, concise problem statements with proper formatting.
    *   Include constraints like input size limits and value ranges.
    *   Break down complex problems into steps or parts.
    *   Use consistent terminology throughout the description.
    *   Include time and space complexity expectations for optimal solutions.

3.  **Examples Quality:**
    *   Provide at least 3 examples with increasing complexity.
    *   Include edge cases in your examples.
    *   For each example, give a clear explanation of the step-by-step solution process.
    *   Make sure examples are diverse and cover different scenarios.

4.  **Test Case Validity is PARAMOUNT:**
    *   You MUST provide at least 8 complete test cases.
    *   Include a mix of simple cases, edge cases, and complex scenarios.
    *   For **EVERY SINGLE TEST CASE**, the \`expected\` field MUST have a valid, concrete value.
    *   The \`expected\` field **CANNOT BE \`null\`**.
    *   The \`expected\` field **CANNOT BE \`undefined\`**.
    *   If the correct output is an empty array, the \`expected\` value must be \`[]\`.
    *   If the correct output is an empty string, the \`expected\` value must be \`""\`.
    *   If the correct output is \`0\`, the \`expected\` value must be \`0\`.
    *   **There are no exceptions. The \`expected\` field must always be populated with a real value.**

5.  **CRITICAL \`testCases.input\` FORMATTING:**
    *   The \`input\` field for each test case MUST be an array of arguments.
    *   The values within this array MUST be pure, valid JSON types (strings, numbers, booleans, nulls, and arrays). Objects are NOT supported.
    *   **DO NOT** represent arrays or numbers as strings within the JSON.
    *   **CORRECT:** \`"input": [[1, 2, 3], 4]\`
    *   **INCORRECT:** \`"input": ["[1, 2, 3]", 4]\`
    *   **INCORRECT:** \`"input": ["[1, 2, 3]", "4"]\`
    *   **INCORRECT:** \`"input": "[[1,2,3], 4]"\` (The entire value should not be a string)
    *   For a function \`twoSum(nums, target)\` a CORRECT \`input\` is \`[[2, 7, 11, 15], 9]\`.
    *   For a function \`rotate(nums, k)\` a CORRECT \`input\` is \`[[1,2,3,4,5], 2]\`.

6.  **Starter Code Quality:**
    *   Provide meaningful variable names and basic structure.
    *   Include helpful comments explaining the function parameters and expected return value.
    *   Do not include solution hints in the starter code.

7.  **Solution Quality:**
    *   Provide an optimal, well-commented solution.
    *   Include time and space complexity analysis in comments.
    *   Use clear variable names and follow best practices.

8.  **No Comments:** The final JSON output must NOT contain any comments.

**Topic:** {{{topic}}}
**Difficulty:** {{{difficulty}}}
**Unique Request Seed:** {{{seed}}}

Generate a problem with all the required fields, paying special attention to the format and validity of the \`testCases\`. Double-check your work to ensure \`expected\` is never null or undefined and that all input values are pure JSON types.`,
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
