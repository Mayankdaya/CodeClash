
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
}

// This file is no longer used for storing problem data, as problems are
// now generated dynamically by AI. It is kept for the shared 'Problem'
// type definition.
