
'use server';
/**
 * @fileOverview A flow to execute code against test cases using an AI judge.
 *
 * - executeCode - A function that handles the code execution process.
 * - ExecuteCodeInput - The input type for the executeCode function.
 * - ExecuteCodeOutput - The return type for the executeCode function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TestCaseSchema = z.object({
  input: z.any().describe('The input arguments for the function.'),
  expected: z.any().describe('The expected output for the test case.'),
});

const ExecuteCodeInputSchema = z.object({
  code: z.string().describe('The user-submitted code to execute.'),
  language: z.string().describe('The programming language of the code (e.g., "python", "java", "cpp").'),
  entryPoint: z.string().describe('The name of the function to be called and tested.'),
  testCases: z.array(TestCaseSchema).describe('An array of test cases to validate the code against.'),
});
export type ExecuteCodeInput = z.infer<typeof ExecuteCodeInputSchema>;

const TestCaseResultSchema = z.object({
  case: z.number().describe('The test case number (1-based index).'),
  input: z.string().describe("The stringified input for the test case."),
  output: z.string().describe("The stringified output from the user's code."),
  expected: z.string().describe('The stringified expected output.'),
  passed: z.boolean().describe('Whether the code passed this test case.'),
  runtime: z.string().describe('A simulated runtime for the test case, e.g., "15ms".'),
});

const ExecuteCodeOutputSchema = z.object({
  status: z.enum(['success', 'error']).describe("The overall status of the execution."),
  message: z.string().optional().describe("An error message if the execution failed (e.g., syntax error, compilation error)."),
  passedCount: z.number().describe('The total number of test cases that passed.'),
  totalCount: z.number().describe('The total number of test cases provided.'),
  results: z.array(TestCaseResultSchema).describe('An array of detailed results for each test case.'),
});
export type ExecuteCodeOutput = z.infer<typeof ExecuteCodeOutputSchema>;

export async function executeCode(input: ExecuteCodeInput): Promise<ExecuteCodeOutput> {
  return executeCodeFlow(input);
}

/**
 * Recursively parses string values in a data structure. If a string can be parsed
 * as JSON, it is replaced by the parsed value. This is used to clean up
 * test case data that may have been stringified.
 * @param data The data to parse.
 * @returns The parsed data.
 */
function robustParse(data: any): any {
  if (typeof data !== 'string') {
    if (Array.isArray(data)) {
      return data.map(item => robustParse(item));
    }
    if (typeof data === 'object' && data !== null) {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newObj[key] = robustParse(data[key]);
            }
        }
        return newObj;
    }
    return data;
  }
  try {
    const parsed = JSON.parse(data);
    return robustParse(parsed);
  } catch (e) {
    return data;
  }
}

const executeCodePrompt = ai.definePrompt({
  name: 'executeCodePrompt',
  input: { schema: ExecuteCodeInputSchema },
  output: { schema: ExecuteCodeOutputSchema },
  prompt: `You are a highly accurate and strict Code Execution Engine and Judge for a competitive programming platform called CodeClash.

Your task is to take a user's code snippet in a specific language, execute it against a series of test cases, and return a structured result. The test cases provided have already been cleaned and parsed, so you can trust their data types.

**Execution Rules:**

1.  **Analyze and Execute:** The test case data provided is already in the correct format. Directly simulate the code's execution for each test case with the given inputs.
2.  **Error Handling:**
    *   If there's a syntax error, compilation error, or a runtime error that prevents execution for all test cases (e.g., an infinite loop), set the 'status' to 'error' and provide a concise, helpful 'message' explaining the issue. The 'results' array should be empty.
    *   If an error occurs for a specific test case, mark that test case as failed. The 'output' for that result should be the error message.
3.  **Judge Correctness:** For each test case, perform a deep equality check of the actual output against the 'expected' output. The order of elements in an array matters.
4.  **Structured Output:** You MUST return a JSON object that strictly conforms to the provided output schema.
    *   'status': 'success' if the code could be executed against all test cases (even if some failed), 'error' if a fatal error occurred.
    *   'passedCount': The total number of test cases where the actual output matched the expected output.
    *   'totalCount': The total number of test cases provided.
    *   'results': An array containing an object for each test case, with stringified versions of input, output, and expected values.
    *   'runtime': Provide a realistic but simulated runtime in milliseconds for each test case (e.g., "12ms", "45ms").

**Request:**

*   **Language:** {{{language}}}
*   **Entry Point Function:** {{{entryPoint}}}
*   **Code:**
    \`\`\`
    {{{code}}}
    \`\`\`
*   **Test Cases:**
    \`\`\`json
    {{{json testCases}}}
    \`\`\`

Evaluate the code against the test cases and provide the result in the specified JSON format.`,
});


const executeCodeFlow = ai.defineFlow(
  {
    name: 'executeCodeFlow',
    inputSchema: ExecuteCodeInputSchema,
    outputSchema: ExecuteCodeOutputSchema,
  },
  async (input) => {
    // Pre-process the test cases to handle any stringified values.
    const processedTestCases = input.testCases.map(tc => ({
        input: robustParse(tc.input),
        expected: robustParse(tc.expected),
    }));

    const processedInput = { ...input, testCases: processedTestCases };

    const { output } = await executeCodePrompt(processedInput);
    if (!output) {
      throw new Error('Failed to get a valid execution result from the AI model.');
    }
    return output;
  }
);
