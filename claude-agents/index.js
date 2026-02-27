import AgentOrchestrator from './agent-orchestrator.js';
import config from './agent-config.json' assert { type: 'json' };

class ClaudeCodeAgents {
  constructor() {
    this.orchestrator = new AgentOrchestrator();
    this.config = config;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('🤖 Initializing Claude Code Agents...');
    console.log('=====================================');
    
    // Validate configuration
    this.validateConfig();
    
    // Set up logging
    this.setupLogging();
    
    // Initialize agents with config
    this.orchestrator.config = this.config;
    
    this.initialized = true;
    console.log('✅ Agents initialized successfully!');
    console.log('');
  }

  validateConfig() {
    const required = ['agents', 'pipeline', 'output'];
    
    for (const section of required) {
      if (!this.config[section]) {
        throw new Error(`Missing required configuration section: ${section}`);
      }
    }

    // Validate pipeline steps
    const enabledAgents = this.config.pipeline.steps.filter(step => 
      this.config[step.name]?.enabled !== false
    );
    
    if (enabledAgents.length === 0) {
      throw new Error('No agents enabled in pipeline configuration');
    }

    console.log(`📋 Configuration validated - ${enabledAgents.length} agents enabled`);
  }

  setupLogging() {
    const logLevel = this.config.agents.logLevel || 'info';
    console.log(`📝 Logging level set to: ${logLevel}`);
  }

  async processInput(userPrompt, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('🎯 Processing user input...');
    console.log(`📝 Prompt: "${userPrompt.substring(0, 100)}${userPrompt.length > 100 ? '...' : ''}"`);
    
    const startTime = Date.now();
    
    try {
      const result = await this.orchestrator.processUserInput(userPrompt, context);
      
      const duration = Date.now() - startTime;
      console.log(`⏱️  Processing completed in ${duration}ms`);
      
      if (this.config.output.generateSummary && result.summary) {
        this.displaySummary(result.summary);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error processing input:', error.message);
      throw error;
    }
  }

  displaySummary(summary) {
    console.log('\\n📊 EXECUTION SUMMARY');
    console.log('===================');
    
    if (summary.feature) {
      console.log(`🎯 Feature: ${summary.feature}`);
      console.log(`📝 Description: ${summary.description}`);
    }
    
    if (summary.implementation) {
      console.log('\\n📁 Implementation:');
      console.log(`   • Files Created: ${summary.implementation.filesCreated}`);
      console.log(`   • Files Modified: ${summary.implementation.filesModified}`); 
      console.log(`   • Tests Created: ${summary.implementation.testsCreated}`);
      console.log(`   • Code Quality: ${summary.implementation.codeQuality}/10`);
    }
    
    if (summary.quality) {
      console.log('\\n🔍 Quality Assurance:');
      console.log(`   • Approved: ${summary.quality.approved ? '✅ Yes' : '❌ No'}`);
      console.log(`   • Test Coverage: ${summary.quality.testCoverage}`);
      console.log(`   • Security Issues: ${summary.quality.securityIssues}`);
      console.log(`   • Performance Issues: ${summary.quality.performanceIssues}`);
    }
    
    if (summary.deployment) {
      console.log('\\n🚀 Deployment:');
      console.log(`   • Ready: ${summary.deployment.ready ? '✅ Yes' : '❌ No'}`);
      console.log(`   • Strategy: ${summary.deployment.strategy}`);
      console.log(`   • Monitoring: ${summary.deployment.monitoring}`);
      console.log(`   • Rollback: ${summary.deployment.rollback}`);
    }
  }

  // Utility methods for direct agent access
  async detectIntention(prompt) {
    if (!this.initialized) await this.initialize();
    return this.orchestrator.intentionDetector.detectIntention(prompt);
  }

  getAgentConfig(agentName) {
    return this.config[agentName] || {};
  }

  updateConfig(updates) {
    Object.assign(this.config, updates);
  }

  // Health check
  async healthCheck() {
    if (!this.initialized) {
      return { status: 'not_initialized' };
    }

    return {
      status: 'healthy',
      agents: Object.keys(this.orchestrator.agents).length,
      config: !!this.config,
      uptime: Date.now() - this.initTime
    };
  }
}

// Export singleton instance
export default new ClaudeCodeAgents();