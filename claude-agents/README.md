# Claude Code Multi-Agent System

An autonomous software engineering team that uses intention detection to automatically route requests through a multi-agent pipeline for product feature development.

## Overview

This system automatically detects when you're requesting a product feature and routes it through a 6-agent pipeline that mimics a real software development team:

1. **Product Manager** - Clarifies requirements and writes specifications
2. **Software Architect** - Designs system architecture and identifies files  
3. **Test Engineer** - Writes comprehensive tests following TDD
4. **Developer** - Implements code to pass the tests
5. **Code Reviewer** - Reviews for quality, security, and performance
6. **DevOps Engineer** - Prepares deployment and monitoring

For non-feature requests, it provides normal conversational assistance.

## Quick Start

```javascript
const agents = require('./claude-agents');

// Initialize the system
await agents.initialize();

// Process user input - automatically detects intention
const result = await agents.processInput("Add user authentication system");

// The system will automatically run the full pipeline for features
// or provide conversational help for other requests
```

## Intention Detection

The system automatically detects feature requests using keywords and patterns:

### Feature Keywords (triggers pipeline):
- "add feature", "implement", "build", "create feature"  
- "new feature", "develop", "add functionality"
- "user story", "as a user", "I want", "I need"
- "requirements", "specification", "acceptance criteria"

### Conversation Keywords (normal chat):
- "explain", "how does", "what is", "why", "help"
- "find", "search", "debug", "fix bug", "error"
- "refactor", "optimize", "documentation"

## Example Usage

### Feature Development
```javascript
// These will trigger the full 6-agent pipeline:
await agents.processInput("Add a shopping cart feature for e-commerce");
await agents.processInput("Implement user authentication with JWT");
await agents.processInput("Build a dashboard for analytics");
await agents.processInput("As a user, I want to be able to save my preferences");
```

### Normal Conversation  
```javascript
// These will use conversational mode:
await agents.processInput("How does React context work?");
await agents.processInput("Help me debug this error");
await agents.processInput("Explain the difference between props and state");
await agents.processInput("Show me how to optimize this function");
```

## Pipeline Output

When a feature is detected, you'll get:

```javascript
{
  intention: 'PRODUCT_FEATURE',
  pipeline: 'multi-agent-development',
  outputs: {
    'product-manager': { /* requirements, specs, acceptance criteria */ },
    'architect': { /* system design, files to create/modify */ },
    'test-engineer': { /* comprehensive test suite */ },
    'developer': { /* implementation files */ },
    'code-reviewer': { /* quality assessment, improvements */ },
    'devops-engineer': { /* deployment plan, monitoring */ }
  },
  summary: { /* executive summary */ },
  pullRequest: { /* ready-to-use PR description */ }
}
```

## Agent Details

### 🧑‍💼 Product Manager
- Analyzes and clarifies requirements
- Writes detailed feature specifications
- Defines acceptance criteria
- Identifies clarifying questions

### 🏗️ Software Architect  
- Designs layered system architecture
- Identifies files to create and modify
- Defines interfaces and data models
- Specifies dependencies

### 🧪 Test Engineer
- Follows Test-Driven Development (TDD)
- Creates unit, integration, and E2E tests
- Covers edge cases and error scenarios
- Sets coverage targets (90%+ default)

### 💻 Developer
- Implements code to pass all tests
- Follows best practices and patterns
- Ensures security and performance
- Generates clean, maintainable code

### 🔍 Code Reviewer
- Reviews for correctness and quality
- Checks security vulnerabilities
- Identifies performance issues
- Scores code quality (0-10 scale)
- Can send back to developer for fixes

### 🚀 DevOps Engineer
- Prepares build and deployment
- Sets up monitoring and alerting  
- Creates rollback procedures
- Configures CI/CD pipeline

## Configuration

Customize the agents via `agent-config.json`:

```json
{
  "agents": {
    "enabled": true,
    "logLevel": "info"
  },
  "codeReviewer": {
    "qualityThreshold": 8.0,
    "autoApproveScore": 9.5
  },
  "testEngineer": {
    "coverageTargets": {
      "statements": 90,
      "branches": 85  
    }
  }
}
```

## Advanced Usage

### Direct Agent Access
```javascript
// Check intention without processing
const intention = await agents.detectIntention("Add user login");

// Get agent configuration
const reviewerConfig = agents.getAgentConfig('codeReviewer');

// Update configuration
agents.updateConfig({ 
  codeReviewer: { qualityThreshold: 9.0 }
});
```

### Health Check
```javascript
const health = await agents.healthCheck();
// { status: 'healthy', agents: 6, config: true, uptime: 12345 }
```

## Integration with Claude Code

This system is designed to work with Claude Code's existing tools:
- Uses `Read`, `Write`, `Edit` tools for file operations
- Integrates with `Bash` for running tests and builds  
- Works with `Grep` and `Glob` for codebase analysis
- Leverages existing project structure and conventions

## Benefits

1. **Automatic Context Switching** - No need to specify when you want the pipeline
2. **Complete Development Lifecycle** - From requirements to deployment
3. **Quality Assurance** - Built-in testing, code review, and monitoring
4. **Production Ready** - Generates deployable code with proper tests
5. **Flexible** - Falls back to conversation for non-feature requests

## File Structure

```
claude-agents/
├── index.js                    # Main entry point
├── agent-orchestrator.js       # Pipeline coordinator  
├── intention-detector.js       # Classifies user input
├── product-manager-agent.js    # Requirements & specs
├── software-architect-agent.js # System design
├── test-engineer-agent.js      # Test creation
├── developer-agent.js          # Code implementation
├── code-reviewer-agent.js      # Quality assurance
├── devops-engineer-agent.js    # Deployment preparation
├── agent-config.json           # Configuration
└── README.md                   # This file
```

## Next Steps

1. Initialize the agents in your Claude Code environment
2. Try both feature requests and conversational queries
3. Customize the configuration based on your project needs
4. Integrate with your existing development workflow

The system will automatically detect your intention and provide the appropriate level of assistance!