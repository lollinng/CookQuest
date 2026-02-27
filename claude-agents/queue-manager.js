import TaskQueue from './task-queue.js';
import AgentOrchestrator from './agent-orchestrator.js';

class QueueManager {
  constructor(options = {}) {
    this.taskQueue = new TaskQueue(options);
    this.orchestrator = new AgentOrchestrator();
    this.agents = new Map(); // agentId -> agent info
    this.running = false;
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
    this.maxConcurrentTasks = options.maxConcurrentTasks || 3;
    this.activeAgents = new Set();
  }

  async initialize() {
    await this.taskQueue.initialize();
    console.log('🎛️  QueueManager initialized');
  }

  async start() {
    if (this.running) return;
    
    await this.initialize();
    this.running = true;
    
    console.log('🚀 QueueManager started - monitoring for tasks...');
    this.monitorQueue();
  }

  async stop() {
    this.running = false;
    console.log('🛑 QueueManager stopped');
  }

  async registerAgent(agentId, agentType = null, capabilities = []) {
    const agentInfo = {
      id: agentId,
      type: agentType,
      capabilities: capabilities,
      registeredAt: new Date().toISOString(),
      isActive: false,
      currentTask: null,
      tasksCompleted: 0,
      tasksAssigned: 0
    };
    
    this.agents.set(agentId, agentInfo);
    console.log(`🤖 Registered agent: ${agentId} (${agentType || 'general'})`);
    
    return agentInfo;
  }

  async unregisterAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    // If agent has active task, mark it as failed and retry
    if (agent.currentTask) {
      await this.taskQueue.failTask(agent.currentTask, 'Agent unregistered');
    }
    
    this.agents.delete(agentId);
    this.activeAgents.delete(agentId);
    console.log(`🗑️  Unregistered agent: ${agentId}`);
    
    return true;
  }

  async addTask(task) {
    const taskId = await this.taskQueue.addTask(task);
    
    // Try to assign immediately if we have available agents
    if (this.running) {
      this.tryAssignTasks();
    }
    
    return taskId;
  }

  async monitorQueue() {
    while (this.running) {
      try {
        await this.tryAssignTasks();
        await this.checkAgentHealth();
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      } catch (error) {
        console.error('❌ Error in queue monitoring:', error.message);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
  }

  async tryAssignTasks() {
    if (this.activeAgents.size >= this.maxConcurrentTasks) {
      return; // At max capacity
    }

    const availableAgents = Array.from(this.agents.values()).filter(agent => 
      !agent.isActive && !agent.currentTask
    );

    if (availableAgents.length === 0) {
      return; // No available agents
    }

    for (const agent of availableAgents) {
      if (this.activeAgents.size >= this.maxConcurrentTasks) break;
      
      const task = await this.taskQueue.getNextTask(agent.type);
      if (!task) continue; // No suitable tasks
      
      try {
        await this.assignTaskToAgent(task.id, agent.id);
      } catch (error) {
        console.error(`❌ Failed to assign task ${task.id} to agent ${agent.id}:`, error.message);
      }
    }
  }

  async assignTaskToAgent(taskId, agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    if (agent.isActive) throw new Error(`Agent is busy: ${agentId}`);

    // Assign task in queue
    const task = await this.taskQueue.assignTask(taskId, agentId);
    
    // Update agent status
    agent.isActive = true;
    agent.currentTask = taskId;
    agent.tasksAssigned++;
    this.activeAgents.add(agentId);
    
    // Execute task asynchronously
    this.executeTask(task, agent).catch(error => {
      console.error(`❌ Task execution failed for ${taskId}:`, error.message);
      this.handleTaskFailure(taskId, agentId, error);
    });
    
    console.log(`🎯 Assigned task ${taskId} to agent ${agentId}`);
  }

  async executeTask(task, agent) {
    try {
      console.log(`🔧 Executing task: ${task.title} (Agent: ${agent.id})`);
      
      let result;
      
      // Route task based on type
      if (task.type === 'PRODUCT_FEATURE') {
        result = await this.orchestrator.runFeaturePipeline(task.prompt, task.context || {});
      } else if (task.type === 'SINGLE_AGENT') {
        result = await this.executeSingleAgentTask(task);
      } else {
        result = await this.orchestrator.processUserInput(task.prompt, task.context || {});
      }
      
      // Mark task as completed
      await this.taskQueue.completeTask(task.id, result);
      
      // Update agent status
      agent.isActive = false;
      agent.currentTask = null;
      agent.tasksCompleted++;
      this.activeAgents.delete(agent.id);
      
      console.log(`✅ Task ${task.id} completed by agent ${agent.id}`);
      
    } catch (error) {
      await this.handleTaskFailure(task.id, agent.id, error);
      throw error;
    }
  }

  async executeSingleAgentTask(task) {
    const agentType = task.agentType || 'developer';
    const agent = this.orchestrator.agents[agentType];
    
    if (!agent) {
      throw new Error(`Agent type not found: ${agentType}`);
    }
    
    return await agent.process({
      output: task.input || {}
    }, task.context || {});
  }

  async handleTaskFailure(taskId, agentId, error) {
    try {
      await this.taskQueue.failTask(taskId, error);
      
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.isActive = false;
        agent.currentTask = null;
        this.activeAgents.delete(agentId);
      }
      
      console.error(`❌ Task ${taskId} failed on agent ${agentId}: ${error.message}`);
    } catch (failError) {
      console.error('❌ Error handling task failure:', failError.message);
    }
  }

  async checkAgentHealth() {
    const now = new Date();
    const maxTaskDuration = 30 * 60 * 1000; // 30 minutes
    
    for (const agent of this.agents.values()) {
      if (!agent.currentTask) continue;
      
      const task = await this.taskQueue.getAllTasks().then(tasks => 
        tasks.find(t => t.id === agent.currentTask)
      );
      
      if (!task) {
        // Task not found, reset agent
        agent.isActive = false;
        agent.currentTask = null;
        this.activeAgents.delete(agent.id);
        continue;
      }
      
      const taskStartTime = new Date(task.assignedAt);
      if (now - taskStartTime > maxTaskDuration) {
        console.log(`⚠️  Task ${task.id} on agent ${agent.id} exceeded max duration`);
        await this.handleTaskFailure(task.id, agent.id, new Error('Task timeout'));
      }
    }
  }

  // Public API methods
  async getQueueStats() {
    return await this.taskQueue.getQueueStats();
  }

  async getAgentStats() {
    const agents = Array.from(this.agents.values());
    return {
      total: agents.length,
      active: this.activeAgents.size,
      idle: agents.length - this.activeAgents.size,
      agents: agents.map(agent => ({
        id: agent.id,
        type: agent.type,
        isActive: agent.isActive,
        tasksCompleted: agent.tasksCompleted,
        tasksAssigned: agent.tasksAssigned,
        currentTask: agent.currentTask
      }))
    };
  }

  async clearCompletedTasks() {
    return await this.taskQueue.clearCompletedTasks();
  }

  async getAllTasks() {
    return await this.taskQueue.getAllTasks();
  }

  async getTasksByStatus(status) {
    return await this.taskQueue.getTasksByStatus(status);
  }
}

export default QueueManager;