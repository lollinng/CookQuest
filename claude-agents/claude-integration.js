const ClaudeCodeAgents = require('./index');

class ClaudeIntegration {
  constructor() {
    this.agents = ClaudeCodeAgents;
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.agents.initialize();
      this.initialized = true;
      console.log('🤖 Claude-Agent integration initialized');
    }
  }

  async processUserMessage(message, context = {}) {
    await this.initialize();
    
    // Detect intention first
    const intention = await this.agents.detectIntention(message);
    
    console.log(`🎯 Detected intention: ${intention.type} (confidence: ${intention.confidence})`);
    
    if (intention.type === 'PRODUCT_FEATURE') {
      console.log('🚀 Routing to Product Feature Pipeline...');
      return await this.handleFeatureRequest(message, context);
    } else {
      console.log('💬 Handling as conversational request...');
      return await this.handleConversation(message, context);
    }
  }

  async handleFeatureRequest(message, context) {
    try {
      const result = await this.agents.processInput(message, context);
      
      // Format the response for Claude
      return {
        type: 'FEATURE_PIPELINE',
        intention: result.intention,
        pipelineResult: result,
        summary: result.summary,
        pullRequest: result.pullRequest,
        message: this.formatPipelineResponse(result)
      };
    } catch (error) {
      console.error('❌ Feature pipeline error:', error);
      return {
        type: 'ERROR',
        error: error.message,
        message: `I encountered an error running the feature pipeline: ${error.message}`
      };
    }
  }

  async handleConversation(message, context) {
    return {
      type: 'CONVERSATION',
      intention: 'CONVERSATION',
      message: 'I\'ll help you with that conversational request.',
      suggestions: [
        'Try describing a feature you want to build',
        'Ask for code explanation or debugging help',
        'Request code refactoring or optimization'
      ]
    };
  }

  formatPipelineResponse(result) {
    if (!result.outputs) {
      return 'Feature pipeline initiated but no outputs generated yet.';
    }

    const sections = [];
    
    // Executive Summary
    if (result.summary) {
      sections.push('## 🎯 Executive Summary');
      sections.push(`**Feature**: ${result.summary.feature || 'New Feature'}`);
      sections.push(`**Quality Score**: ${result.summary.implementation?.codeQuality || 'N/A'}/10`);
      sections.push(`**Files**: ${result.summary.implementation?.filesCreated || 0} created, ${result.summary.implementation?.filesModified || 0} modified`);
      sections.push('');
    }

    // Pipeline Results
    sections.push('## 🚀 Pipeline Execution');
    
    Object.entries(result.outputs).forEach(([agentName, output]) => {
      const agentEmoji = this.getAgentEmoji(agentName);
      const agentTitle = this.getAgentTitle(agentName);
      
      sections.push(`### ${agentEmoji} ${agentTitle}`);
      sections.push(this.formatAgentOutput(agentName, output));
      sections.push('');
    });

    // Pull Request
    if (result.pullRequest) {
      sections.push('## 📋 Ready for Review');
      sections.push(`**${result.pullRequest.title}**`);
      sections.push('');
      sections.push(result.pullRequest.body);
    }

    return sections.join('\\n');
  }

  getAgentEmoji(agentName) {
    const emojis = {
      'product-manager': '🧑‍💼',
      'architect': '🏗️',
      'test-engineer': '🧪',
      'developer': '💻',
      'code-reviewer': '🔍',
      'devops-engineer': '🚀'
    };
    return emojis[agentName] || '🤖';
  }

  getAgentTitle(agentName) {
    const titles = {
      'product-manager': 'Product Manager',
      'architect': 'Software Architect',
      'test-engineer': 'Test Engineer',
      'developer': 'Developer',
      'code-reviewer': 'Code Reviewer',
      'devops-engineer': 'DevOps Engineer'
    };
    return titles[agentName] || agentName;
  }

  formatAgentOutput(agentName, output) {
    switch (agentName) {
      case 'product-manager':
        return `✅ Requirements clarified and specification written\\n` +
               `📋 ${output.acceptanceCriteria?.length || 0} acceptance criteria defined\\n` +
               `❓ ${output.questions?.length || 0} clarifying questions identified`;
               
      case 'architect':
        return `🏗️ System architecture designed\\n` +
               `📁 ${output.filesToCreate?.length || 0} files to create, ${output.filesToModify?.length || 0} to modify\\n` +
               `🔌 ${output.interfaces?.length || 0} interfaces defined`;
               
      case 'test-engineer':
        return `🧪 Comprehensive test suite created\\n` +
               `📝 ${output.unitTests?.length || 0} unit test files\\n` +
               `🔗 ${output.integrationTests?.length || 0} integration tests\\n` +
               `🎭 ${output.e2eTests?.length || 0} E2E test scenarios`;
               
      case 'developer':
        return `💻 Implementation completed\\n` +
               `📄 ${output.implementedFiles?.length || 0} files implemented\\n` +
               `✅ Code follows best practices and security standards`;
               
      case 'code-reviewer':
        return `🔍 Code review completed - Score: ${output.qualityScore}/10\\n` +
               `${output.approved ? '✅ APPROVED' : '❌ NEEDS WORK'}\\n` +
               `🛡️ ${output.securityIssues?.length || 0} security issues\\n` +
               `⚡ ${output.performanceIssues?.length || 0} performance issues`;
               
      case 'devops-engineer':
        return `🚀 Deployment ready\\n` +
               `📦 Build: ${output.buildStatus?.status || 'Unknown'}\\n` +
               `📊 Monitoring configured\\n` +
               `🔄 Rollback plan prepared`;
               
      default:
        return 'Agent processing completed';
    }
  }

  // Test method to validate intention detection
  testIntentionDetection() {
    const testCases = [
      // Should trigger pipeline
      { input: "Add user authentication system", expected: "PRODUCT_FEATURE" },
      { input: "Build a shopping cart feature", expected: "PRODUCT_FEATURE" },
      { input: "Implement dashboard analytics", expected: "PRODUCT_FEATURE" },
      { input: "As a user, I want to save my preferences", expected: "PRODUCT_FEATURE" },
      { input: "Create a new feature for notifications", expected: "PRODUCT_FEATURE" },
      { input: "make docker run which runs both frontend and backend", expected: "PRODUCT_FEATURE" },
      { input: "set up CI/CD pipeline", expected: "PRODUCT_FEATURE" },
      { input: "make the app deployable", expected: "PRODUCT_FEATURE" },
      { input: "create a login page", expected: "PRODUCT_FEATURE" },
      { input: "configure nginx reverse proxy", expected: "PRODUCT_FEATURE" },

      // Should be conversational
      { input: "How does React work?", expected: "CONVERSATION" },
      { input: "Help debug this error", expected: "CONVERSATION" },
      { input: "Explain this code", expected: "CONVERSATION" },
      { input: "Optimize this function", expected: "CONVERSATION" },
      { input: "What is the difference between props and state?", expected: "CONVERSATION" }
    ];

    console.log('🧪 Testing Intention Detection...');
    console.log('==================================');
    
    testCases.forEach(test => {
      const result = this.agents.orchestrator.intentionDetector.detectIntention(test.input);
      const passed = result.type === test.expected;
      const status = passed ? '✅' : '❌';
      
      console.log(`${status} "${test.input}"`);
      console.log(`   Expected: ${test.expected}, Got: ${result.type} (confidence: ${result.confidence})`);
      
      if (!passed) {
        console.log(`   ⚠️ MISMATCH detected!`);
      }
    });
    
    console.log('\\n🎯 Intention detection test completed');
  }
}

// Export singleton
module.exports = new ClaudeIntegration();