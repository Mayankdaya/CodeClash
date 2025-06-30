
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

export const problemsByTopic: Record<string, Problem[]> = {
  'arrays-hashing': [
    {
      id: 'two-sum',
      title: 'Two Sum',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
      example: {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      starterCode: 'var twoSum = function(nums, target) {\n    // your code here\n};',
      testCases: [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { input: [[3, 2, 4], 6], expected: [1, 2] },
        { input: [[3, 3], 6], expected: [0, 1] },
      ],
      entryPoint: 'twoSum',
    },
    {
      id: 'contains-nearby-duplicate',
      title: 'Contains Nearby Duplicate',
      description: 'Given an array of integers `nums` and an integer `k`, determine whether there are two distinct indices `i` and `j` in the array where `nums[i] == nums[j]` and the absolute difference between `i` and `j` is at most `k`.\n\nIn other words, check if there are two same numbers within a distance `k`.',
      example: {
        input: 'nums = [1,2,3,1], k = 3',
        output: 'true',
        explanation: 'The number 1 appears at indices 0 and 3. Since |3 - 0| = 3, which is <= k, we return true.',
      },
      starterCode: 'var containsNearbyDuplicate = function(nums, k) {\n    // your code here\n};',
      testCases: [
        { input: [[1, 2, 3, 1], 3], expected: true },
        { input: [[1, 0, 1, 1], 1], expected: true },
        { input: [[1, 2, 3, 1, 2, 3], 2], expected: false },
      ],
      entryPoint: 'containsNearbyDuplicate',
    },
  ],
  'two-pointers': [
    {
        id: 'valid-palindrome',
        title: 'Valid Palindrome',
        description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
        example: {
            input: 's = "A man, a plan, a canal: Panama"',
            output: 'true',
            explanation: '"amanaplanacanalpanama" is a palindrome.',
        },
        starterCode: 'var isPalindrome = function(s) {\n    // your code here\n};',
        testCases: [
            { input: ['A man, a plan, a canal: Panama'], expected: true },
            { input: ['race a car'], expected: false },
            { input: [' '], expected: true },
        ],
        entryPoint: 'isPalindrome',
    }
  ],
};
