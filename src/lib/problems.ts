
export interface Problem {
  id: string;
  title: string;
  description: string;
  example: {
    input: string;
    output: string;
    explanation?: string;
  };
  starterCode: string;
  testCases: {
    input: any[];
    expected: any;
  }[];
  entryPoint: string;
}
