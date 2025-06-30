
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

const topicIds = [
  "arrays-hashing",
  "two-pointers",
  "sliding-window",
  "stack",
  "binary-search",
  "linked-list",
  "trees",
  "dynamic-programming",
];

export const problems: Record<string, Problem[]> = {
    'arrays-hashing': [
        {
            id: 'two-sum',
            title: 'Two Sum',
            description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. \n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
            example: {
                input: 'nums = [2,7,11,15], target = 9',
                output: '[0,1]',
                explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
            },
            starterCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your code here
};`
        },
        {
            id: 'contains-duplicate',
            title: 'Contains Duplicate',
            description: "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
            example: {
                input: 'nums = [1,2,3,1]',
                output: 'true',
            },
            starterCode: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
var containsDuplicate = function(nums) {
    // Write your code here
};`
        }
    ],
    'two-pointers': [
        {
            id: 'valid-palindrome',
            title: 'Valid Palindrome',
            description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
            example: {
                input: 's = "A man, a plan, a canal: Panama"',
                output: 'true',
                explanation: '"amanaplanacanalpanama" is a palindrome.'
            },
            starterCode: `/**
 * @param {string} s
 * @return {boolean}
 */
var isPalindrome = function(s) {
    // Write your code here
};`
        }
    ]
};

// Populate other topics with a default problem
topicIds.forEach(topicId => {
    if (!problems[topicId]) {
        problems[topicId] = [{
            id: topicId,
            title: topicId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            description: 'Solve a classic problem related to this topic. The problem description will appear here. Test cases will be run against your code.',
            example: {
                input: 'N/A',
                output: 'N/A'
            },
            starterCode: `function solve() {
    // Your code goes here
}`
        }];
    }
});
