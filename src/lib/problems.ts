
export interface Problem {
  id: string;
  title: string;
  description: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  starterCode: string;
  solution?: string;
  testCases: {
    input: any[];
    expected: any;
  }[];
  entryPoint: string;
}
