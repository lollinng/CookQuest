import ClaudeResponseHandler from './claude-response-handler.mjs';

console.log('🧪 TESTING CLAUDE INTEGRATION');
console.log('=============================');
console.log('This demonstrates how Claude should analyze messages before responding\\n');

const testMessages = [
  // Feature requests that should trigger the pipeline
  "Add user authentication system",
  "Build a shopping cart feature", 
  "Implement dashboard analytics",
  "As a user, I want to save my cooking preferences",
  
  // Conversational requests that should be handled normally
  "How does React work?",
  "Help debug this error",
  "Explain this code",
  "What's the difference between props and state?"
];

testMessages.forEach((message, index) => {
  console.log(`\\n🔍 TEST ${index + 1}: "${message}"`);
  console.log('─'.repeat(80));
  
  const analysis = ClaudeResponseHandler.analyzeUserMessage(message);
  
  console.log(`\\n📤 CLAUDE SHOULD RESPOND WITH:`);
  console.log(`"${analysis.message}"`);
  
  if (analysis.shouldUsePipeline) {
    console.log(`\\n🔄 THEN EXECUTE PIPELINE...`);
    const pipelineResult = ClaudeResponseHandler.simulatePipeline(message, analysis.intention);
    console.log(`📋 ${pipelineResult.message}`);
  }
  
  console.log('\\n' + '='.repeat(80));
});

console.log('\\n✅ INTEGRATION TEST COMPLETE');
console.log('Claude should now properly detect intentions and route accordingly!');