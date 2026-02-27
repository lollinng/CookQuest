import IntentionDetector from './intention-detector.js';

const detector = new IntentionDetector();

const testCases = [
  // Should trigger pipeline
  { input: 'Add user authentication system', expected: 'PRODUCT_FEATURE' },
  { input: 'Build a shopping cart feature', expected: 'PRODUCT_FEATURE' },
  { input: 'Implement dashboard analytics', expected: 'PRODUCT_FEATURE' },
  { input: 'As a user, I want to save my preferences', expected: 'PRODUCT_FEATURE' },
  { input: 'Create a new feature for notifications', expected: 'PRODUCT_FEATURE' },
  { input: 'I need to develop a login system', expected: 'PRODUCT_FEATURE' },
  { input: 'Add functionality to track user behavior', expected: 'PRODUCT_FEATURE' },
  { input: 'Build something that allows users to...', expected: 'PRODUCT_FEATURE' },
  
  // Should be conversational  
  { input: 'How does React work?', expected: 'CONVERSATION' },
  { input: 'Help debug this error', expected: 'CONVERSATION' },
  { input: 'Explain this code', expected: 'CONVERSATION' },
  { input: 'Optimize this function', expected: 'CONVERSATION' },
  { input: 'What is the difference between props and state?', expected: 'CONVERSATION' },
  { input: 'Show me how to refactor this', expected: 'CONVERSATION' },
  { input: 'Find the bug in my component', expected: 'CONVERSATION' },
  { input: 'Why is this not working?', expected: 'CONVERSATION' }
];

console.log('🧪 Testing Intention Detection...');
console.log('==================================');

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = detector.detectIntention(test.input);
  const isCorrect = result.type === test.expected;
  const status = isCorrect ? '✅' : '❌';
  
  console.log(`${status} "${test.input}"`);
  console.log(`   Expected: ${test.expected}, Got: ${result.type} (confidence: ${result.confidence})`);
  
  if (isCorrect) {
    passed++;
  } else {
    failed++;
    console.log('   ⚠️ MISMATCH detected!');
  }
  console.log('');
});

console.log('📊 RESULTS:');
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);
console.log(`🎯 Accuracy: ${((passed / testCases.length) * 100).toFixed(1)}%`);