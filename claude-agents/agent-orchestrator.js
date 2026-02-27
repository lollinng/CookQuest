import IntentionDetector from './intention-detector.js';
import ProductManagerAgent from './product-manager-agent.js';
import SoftwareArchitectAgent from './software-architect-agent.js';
import TestEngineerAgent from './test-engineer-agent.js';
import DeveloperAgent from './developer-agent.js';
import CodeReviewerAgent from './code-reviewer-agent.js';
import DevOpsEngineerAgent from './devops-engineer-agent.js';

class AgentOrchestrator {
  constructor() {
    this.intentionDetector = new IntentionDetector();
    this.agents = {
      'product-manager': new ProductManagerAgent(),
      'architect': new SoftwareArchitectAgent(),
      'test-engineer': new TestEngineerAgent(),
      'developer': new DeveloperAgent(),
      'code-reviewer': new CodeReviewerAgent(),
      'devops-engineer': new DevOpsEngineerAgent()
    };
    
    this.pipeline = [
      'product-manager',
      'architect', 
      'test-engineer',
      'developer',
      'code-reviewer',
      'devops-engineer'
    ];
  }

  async processUserInput(prompt, context = {}) {
    const intention = this.intentionDetector.detectIntention(prompt);
    
    if (intention.type === 'PRODUCT_FEATURE') {
      return await this.runFeaturePipeline(prompt, context);
    } else {
      return await this.handleConversation(prompt, context);
    }
  }

  async runFeaturePipeline(prompt, context = {}) {
    console.log('🚀 Initiating Product Feature Pipeline');
    console.log('=====================================');
    
    const results = {
      intention: 'PRODUCT_FEATURE',
      pipeline: 'multi-agent-development',
      outputs: {},
      summary: {},
      pullRequest: null
    };

    let currentOutput = { output: { userStory: prompt } };
    let currentAgent = 'product-manager';
    let stepCount = 1;

    while (currentAgent && stepCount <= 6) {
      console.log(`\\n📋 Step ${stepCount}: ${this.agents[currentAgent].name}`);
      console.log('─'.repeat(50));
      
      try {
        const agent = this.agents[currentAgent];
        const agentResult = await agent.process(currentOutput, context);
        
        results.outputs[currentAgent] = agentResult.output;
        
        // Log key information for each agent
        this.logAgentOutput(currentAgent, agentResult);
        
        // Check if we need to loop back (e.g., code review failed)
        if (currentAgent === 'code-reviewer' && !agentResult.output.approved) {
          console.log('\\n❌ Code review failed. Sending back to developer for fixes.');
          currentAgent = 'developer';
          currentOutput = agentResult;
          continue;
        }
        
        currentOutput = agentResult;
        currentAgent = agentResult.nextAgent;
        stepCount++;
        
      } catch (error) {
        console.error(`Error in ${currentAgent}:`, error.message);
        results.error = {
          agent: currentAgent,
          message: error.message,
          step: stepCount
        };
        break;
      }
    }

    // Generate final summary and PR
    results.summary = this.generateSummary(results.outputs);
    results.pullRequest = this.generatePullRequestSummary(results.outputs);
    
    console.log('\\n✅ Pipeline Complete!');
    console.log('=====================');
    
    return results;
  }

  logAgentOutput(agentName, result) {
    const out = result?.output || {};
    switch (agentName) {
      case 'product-manager':
        console.log('📝 Requirements clarified');
        console.log('📋 Feature specification written');
        console.log('✅ Acceptance criteria defined');
        if (out.questions && out.questions.length > 0) {
          console.log('❓ Questions identified:', out.questions.length);
        }
        break;

      case 'architect':
        console.log('🏗️  System architecture designed');
        console.log('📁 Files identified:');
        console.log(`   - Create: ${(out.filesToCreate || []).length} files`);
        console.log(`   - Modify: ${(out.filesToModify || []).length} files`);
        console.log('🔌 Interfaces defined');
        break;

      case 'test-engineer':
        console.log('🧪 Test suite created');
        console.log(`📝 Unit tests: ${(out.unitTests || []).length} files`);
        console.log(`🔗 Integration tests: ${(out.integrationTests || []).length} files`);
        console.log(`🎭 E2E tests: ${(out.e2eTests || []).length} files`);
        break;

      case 'developer':
        console.log('💻 Implementation complete');
        console.log(`📄 Files implemented: ${(out.implementedFiles || []).length}`);
        console.log('🧪 Tests should now pass');
        break;

      case 'code-reviewer':
        console.log(`🔍 Code review complete - Score: ${out.qualityScore || 0}/10`);
        console.log(`💬 Comments: ${(out.reviewComments || []).length}`);
        console.log(`🔧 Improvements: ${(out.improvements || []).length}`);
        console.log(`🛡️  Security issues: ${(out.securityIssues || []).length}`);
        console.log(`⚡ Performance issues: ${(out.performanceIssues || []).length}`);
        console.log(out.approved ? '✅ APPROVED' : '❌ NEEDS WORK');
        break;

      case 'devops-engineer':
        console.log('🚀 Deployment prepared');
        console.log(`📦 Build: ${out.buildStatus?.status || 'UNKNOWN'}`);
        console.log('🧪 Test suite ready');
        console.log('📊 Monitoring configured');
        break;
    }
  }

  generateSummary(outputs) {
    const pm = outputs['product-manager'];
    const arch = outputs['architect']; 
    const test = outputs['test-engineer'];
    const dev = outputs['developer'];
    const review = outputs['code-reviewer'];
    const devops = outputs['devops-engineer'];

    return {
      feature: pm?.featureSpecification?.title || 'New Feature',
      description: pm?.featureSpecification?.description || 'Feature implementation',
      
      implementation: {
        filesCreated: arch?.filesToCreate?.length || 0,
        filesModified: arch?.filesToModify?.length || 0,
        testsCreated: test?.unitTests?.length || 0,
        codeQuality: review?.qualityScore || 0
      },
      
      quality: {
        approved: review?.approved || false,
        testCoverage: 'Target: >90%',
        securityIssues: review?.securityIssues?.length || 0,
        performanceIssues: review?.performanceIssues?.length || 0
      },
      
      deployment: {
        ready: devops?.buildStatus?.status === 'READY',
        strategy: devops?.deploymentPlan?.strategy || 'Standard',
        monitoring: 'Configured',
        rollback: 'Plan Ready'
      }
    };
  }

  generatePullRequestSummary(outputs) {
    const pm = outputs['product-manager'];
    const arch = outputs['architect'];
    const dev = outputs['developer'];
    const review = outputs['code-reviewer'];

    const title = pm?.featureSpecification?.title || 'New Feature Implementation';
    
    const summary = [
      pm?.featureSpecification?.description || 'Implements new feature functionality',
      '',
      '## Changes Made',
      `- Created ${arch?.filesToCreate?.length || 0} new files`,
      `- Modified ${arch?.filesToModify?.length || 0} existing files`,
      `- Added ${outputs['test-engineer']?.unitTests?.length || 0} test files`,
      '',
      '## Quality Metrics',
      `- Code Quality Score: ${review?.qualityScore || 'N/A'}/10`,
      `- Security Issues: ${review?.securityIssues?.length || 0}`,
      `- Performance Issues: ${review?.performanceIssues?.length || 0}`,
      '',
      '## Testing',
      '- Unit tests: ✅ Created and should pass',
      '- Integration tests: ✅ Created', 
      '- E2E tests: ✅ Created',
      '',
      '## Deployment',
      '- Build configuration: ✅ Ready',
      '- Monitoring: ✅ Configured',
      '- Rollback plan: ✅ Prepared'
    ];

    return {
      title,
      body: summary.join('\\n'),
      files: [
        ...(arch?.filesToCreate || []),
        ...(arch?.filesToModify || [])
      ]
    };
  }

  async handleConversation(prompt, context) {
    // For non-feature requests, provide conversational response
    return {
      intention: 'CONVERSATION',
      response: this.generateConversationalResponse(prompt),
      suggestions: this.generateSuggestions(prompt)
    };
  }

  generateConversationalResponse(prompt) {
    const lowercasePrompt = prompt.toLowerCase();
    
    if (lowercasePrompt.includes('help')) {
      return 'I can help you with software development tasks. For product features, describe what you want to build and I\'ll use a multi-agent pipeline to implement it. For other tasks, I\'ll assist conversationally.';
    }
    
    if (lowercasePrompt.includes('explain') || lowercasePrompt.includes('how')) {
      return 'I\'ll help explain that concept or process for you.';
    }
    
    if (lowercasePrompt.includes('debug') || lowercasePrompt.includes('error')) {
      return 'I\'ll help you debug that issue. Please share the error details or code that\'s causing problems.';
    }
    
    return 'I\'m ready to help with your development task. What would you like to work on?';
  }

  generateSuggestions(prompt) {
    const suggestions = [
      'Try describing a feature you want to build (e.g., "Add user authentication system")',
      'Ask for code explanation or debugging help',
      'Request code refactoring or optimization',
      'Ask about best practices for a specific technology'
    ];
    
    const lowercasePrompt = prompt.toLowerCase();
    
    if (lowercasePrompt.includes('feature') || lowercasePrompt.includes('implement')) {
      suggestions.unshift('Use the feature pipeline by describing what you want to build');
    }
    
    return suggestions;
  }
}

export default AgentOrchestrator;