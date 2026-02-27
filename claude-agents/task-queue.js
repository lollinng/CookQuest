import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TaskQueue {
  constructor(options = {}) {
    this.queueFile = options.queueFile || path.join(__dirname, 'tasks.json');
    this.memoryFile = options.memoryFile || path.join(__dirname, 'memory.md');
    this.outputDir = options.outputDir || path.join(__dirname, '..', 'outputs');
    this.tasks = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.ensureDirectories();
    await this.loadTasks();
    
    this.initialized = true;
    console.log('📋 TaskQueue initialized');
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async loadTasks() {
    try {
      const data = await fs.readFile(this.queueFile, 'utf8');
      this.tasks = JSON.parse(data);
      console.log(`📥 Loaded ${this.tasks.length} tasks from queue`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.tasks = [];
        await this.saveTasks();
        console.log('📄 Created new task queue file');
      } else {
        throw error;
      }
    }
  }

  async saveTasks() {
    const data = JSON.stringify(this.tasks, null, 2);
    await fs.writeFile(this.queueFile, data, 'utf8');
  }

  async addTask(task) {
    if (!this.initialized) await this.initialize();

    const newTask = {
      id: this.generateTaskId(),
      status: 'todo',
      priority: task.priority || 1,
      createdAt: new Date().toISOString(),
      assignedTo: null,
      assignedAt: null,
      completedAt: null,
      retryCount: 0,
      maxRetries: task.maxRetries || 3,
      ...task
    };

    this.tasks.push(newTask);
    await this.saveTasks();
    
    console.log(`➕ Added task: ${newTask.title} (ID: ${newTask.id})`);
    return newTask.id;
  }

  async getNextTask(agentType = null) {
    if (!this.initialized) await this.initialize();

    const availableTasks = this.tasks.filter(task => {
      if (task.status !== 'todo') return false;
      if (agentType && task.agentType && task.agentType !== agentType) return false;
      return true;
    });

    if (availableTasks.length === 0) return null;

    // Sort by priority (highest first), then by creation time (oldest first)
    availableTasks.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return availableTasks[0];
  }

  async assignTask(taskId, agentId) {
    if (!this.initialized) await this.initialize();

    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.status !== 'todo') throw new Error(`Task is not available: ${task.status}`);

    task.status = 'in_progress';
    task.assignedTo = agentId;
    task.assignedAt = new Date().toISOString();
    
    await this.saveTasks();
    console.log(`🎯 Assigned task ${taskId} to ${agentId}`);
    
    return task;
  }

  async completeTask(taskId, result = {}) {
    if (!this.initialized) await this.initialize();

    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.status = 'done';
    task.completedAt = new Date().toISOString();
    task.result = result;
    
    await this.saveTasks();
    await this.logTaskOutput(task, result);
    
    console.log(`✅ Completed task: ${task.title} (ID: ${taskId})`);
    
    return task;
  }

  async failTask(taskId, error, shouldRetry = true) {
    if (!this.initialized) await this.initialize();

    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.retryCount++;
    task.lastError = {
      message: error.message || error,
      timestamp: new Date().toISOString()
    };

    if (shouldRetry && task.retryCount <= task.maxRetries) {
      task.status = 'todo';
      task.assignedTo = null;
      task.assignedAt = null;
      console.log(`🔄 Retrying task ${taskId} (attempt ${task.retryCount}/${task.maxRetries})`);
    } else {
      task.status = 'failed';
      console.log(`❌ Failed task ${taskId} after ${task.retryCount} attempts`);
    }
    
    await this.saveTasks();
    return task;
  }

  async getTaskStatus(taskId) {
    if (!this.initialized) await this.initialize();
    
    const task = this.tasks.find(t => t.id === taskId);
    return task ? task.status : null;
  }

  async getAllTasks() {
    if (!this.initialized) await this.initialize();
    return [...this.tasks];
  }

  async getTasksByStatus(status) {
    if (!this.initialized) await this.initialize();
    return this.tasks.filter(task => task.status === status);
  }

  async getTasksByAgent(agentId) {
    if (!this.initialized) await this.initialize();
    return this.tasks.filter(task => task.assignedTo === agentId);
  }

  async clearCompletedTasks() {
    if (!this.initialized) await this.initialize();
    
    const completedTasks = this.tasks.filter(task => task.status === 'done');
    this.tasks = this.tasks.filter(task => task.status !== 'done');
    
    await this.saveTasks();
    console.log(`🗑️  Cleared ${completedTasks.length} completed tasks`);
    
    return completedTasks.length;
  }

  async logTaskOutput(task, result) {
    const outputFile = path.join(this.outputDir, `${task.id}-${Date.now()}.json`);
    const output = {
      task: task,
      result: result,
      completedAt: new Date().toISOString()
    };
    
    await fs.writeFile(outputFile, JSON.stringify(output, null, 2), 'utf8');
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getQueueStats() {
    if (!this.initialized) await this.initialize();

    const stats = {
      total: this.tasks.length,
      todo: 0,
      in_progress: 0,
      done: 0,
      failed: 0
    };

    this.tasks.forEach(task => {
      stats[task.status]++;
    });

    return stats;
  }
}

export default TaskQueue;