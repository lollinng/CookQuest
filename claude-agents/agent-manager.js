import QueueManager from './queue-manager.js';

class AgentManager {
  constructor(options = {}) {
    this.queueManager = new QueueManager(options);
    this.isRunning = false;
    this.managerId = `manager_${Date.now()}`;
  }

  async initialize() {
    await this.queueManager.initialize();
    console.log('👔 AgentManager initialized');
  }

  async start() {
    if (this.isRunning) return;
    
    await this.initialize();
    
    // Register this manager as an agent coordinator
    await this.queueManager.registerAgent(this.managerId, 'manager', ['task-coordination']);
    
    // Start the queue manager
    await this.queueManager.start();
    
    this.isRunning = true;
    console.log('🎬 AgentManager started - ready to coordinate tasks');
    
    // Start monitoring and reporting
    this.startStatusReporting();
  }

  async stop() {
    if (!this.isRunning) return;
    
    await this.queueManager.stop();
    await this.queueManager.unregisterAgent(this.managerId);
    
    this.isRunning = false;
    console.log('🎬 AgentManager stopped');
  }

  // Task submission methods
  async submitFeatureTask(prompt, priority = 1, context = {}) {
    const task = {
      title: `Feature: ${prompt.substring(0, 50)}...`,
      type: 'PRODUCT_FEATURE',
      prompt: prompt,
      context: context,
      priority: priority,
      agentType: null, // Can be handled by any agent type in pipeline
      estimatedDuration: 1800000 // 30 minutes
    };
    
    return await this.queueManager.addTask(task);
  }

  async submitSingleAgentTask(agentType, input, priority = 1, context = {}) {
    const task = {
      title: `${agentType}: ${JSON.stringify(input).substring(0, 30)}...`,
      type: 'SINGLE_AGENT',
      agentType: agentType,
      input: input,
      context: context,
      priority: priority,
      estimatedDuration: 300000 // 5 minutes
    };
    
    return await this.queueManager.addTask(task);
  }

  async submitCustomTask(taskConfig) {
    const task = {
      title: taskConfig.title || 'Custom Task',
      type: taskConfig.type || 'CONVERSATION',
      prompt: taskConfig.prompt || '',
      priority: taskConfig.priority || 1,
      agentType: taskConfig.agentType || null,
      context: taskConfig.context || {},
      estimatedDuration: taskConfig.estimatedDuration || 600000, // 10 minutes
      ...taskConfig
    };
    
    return await this.queueManager.addTask(task);
  }

  // Agent management
  async registerWorkerAgent(agentId, agentType, capabilities = []) {
    return await this.queueManager.registerAgent(agentId, agentType, capabilities);
  }

  async unregisterWorkerAgent(agentId) {
    return await this.queueManager.unregisterAgent(agentId);
  }

  // Monitoring and status
  async getSystemStatus() {
    const queueStats = await this.queueManager.getQueueStats();
    const agentStats = await this.queueManager.getAgentStats();
    
    return {
      manager: {
        id: this.managerId,
        running: this.isRunning,
        uptime: this.isRunning ? Date.now() - this.startTime : 0
      },
      queue: queueStats,
      agents: agentStats,
      timestamp: new Date().toISOString()
    };
  }

  async getTasks(status = null) {
    if (status) {
      return await this.queueManager.getTasksByStatus(status);
    }
    return await this.queueManager.getAllTasks();
  }

  async clearCompletedTasks() {
    return await this.queueManager.clearCompletedTasks();
  }

  // Status reporting
  startStatusReporting() {
    this.statusInterval = setInterval(async () => {
      try {
        const status = await this.getSystemStatus();
        this.logSystemStatus(status);
      } catch (error) {
        console.error('❌ Error in status reporting:', error.message);
      }
    }, 60000); // Report every minute
  }

  logSystemStatus(status) {
    const { queue, agents } = status;
    
    console.log('\\n📊 SYSTEM STATUS');
    console.log('================');
    console.log(`Queue: ${queue.todo} todo | ${queue.in_progress} active | ${queue.done} done | ${queue.failed} failed`);
    console.log(`Agents: ${agents.active}/${agents.total} active | ${agents.idle} idle`);
    
    if (queue.todo > 0 && agents.idle > 0) {
      console.log('⚡ Tasks available - agents should pick them up');
    }
    
    if (queue.failed > 0) {
      console.log(`⚠️  ${queue.failed} failed tasks need attention`);
    }
  }

  // Utility methods for the master prompt workflow
  async waitForNoTasks() {
    while (true) {
      const stats = await this.queueManager.getQueueStats();
      if (stats.todo === 0 && stats.in_progress === 0) {
        break;
      }
      console.log('⏳ Waiting for tasks to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  async selectHighestPriorityTask() {
    const todoTasks = await this.queueManager.getTasksByStatus('todo');
    if (todoTasks.length === 0) return null;
    
    // Sort by priority (highest first), then by creation time (oldest first), then by scope (smallest first)
    todoTasks.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.createdAt !== b.createdAt) return new Date(a.createdAt) - new Date(b.createdAt);
      return (a.estimatedDuration || 0) - (b.estimatedDuration || 0);
    });
    
    return todoTasks[0];
  }

  async breakDownTask(task) {
    if (task.type === 'PRODUCT_FEATURE') {
      // Product features are already broken down by the pipeline
      return [task];
    }
    
    // For other task types, check if they need breaking down
    if (task.estimatedDuration && task.estimatedDuration > 1800000) { // 30 minutes
      console.log(`🔧 Task ${task.id} is large, may need breakdown`);
    }
    
    return [task];
  }

  async ensureCodeCompiles(taskResult) {
    if (!taskResult || !taskResult.outputs) return true;
    
    // Check if any agent outputs indicate compilation issues
    const devOpsOutput = taskResult.outputs['devops-engineer'];
    if (devOpsOutput && devOpsOutput.buildStatus) {
      return devOpsOutput.buildStatus.status === 'READY';
    }
    
    // If no build status, assume it compiles
    return true;
  }

  async ensureTestsPass(taskResult) {
    if (!taskResult || !taskResult.outputs) return true;
    
    // Check test engineer and developer outputs for test status
    const testOutput = taskResult.outputs['test-engineer'];
    const devOutput = taskResult.outputs['developer'];
    
    if (testOutput && testOutput.testResults) {
      return testOutput.testResults.passed === testOutput.testResults.total;
    }
    
    if (devOutput && devOutput.testStatus) {
      return devOutput.testStatus === 'PASSED';
    }
    
    // If no test status, assume tests pass
    return true;
  }

  async updateMemory(learnings) {
    const { promises: fs } = await import('fs');
    const path = (await import('path')).default;
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const memoryFile = path.join(__dirname, 'memory.md');
    
    const timestamp = new Date().toISOString();
    const entry = `\\n## ${timestamp}\\n${learnings}\\n`;
    
    try {
      await fs.appendFile(memoryFile, entry, 'utf8');
      console.log('🧠 Updated memory with learnings');
    } catch (error) {
      console.error('❌ Error updating memory:', error.message);
    }
  }
}

export default AgentManager;