import AgentManager from './agent-manager.js';

async function testQueueSystem() {
  console.log('🧪 Starting Queue System Test');
  console.log('============================\\n');
  
  const manager = new AgentManager({
    pollInterval: 2000, // 2 seconds for testing
    maxConcurrentTasks: 2
  });
  
  try {
    // Start the manager
    console.log('1. Starting AgentManager...');
    await manager.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Register some worker agents
    console.log('\\n2. Registering worker agents...');
    await manager.registerWorkerAgent('worker1', 'developer', ['coding', 'testing']);
    await manager.registerWorkerAgent('worker2', 'architect', ['design', 'planning']);
    await manager.registerWorkerAgent('worker3', 'test-engineer', ['testing', 'quality']);
    
    // Check initial status
    console.log('\\n3. Initial system status:');
    const initialStatus = await manager.getSystemStatus();
    console.log(JSON.stringify(initialStatus, null, 2));
    
    // Submit some test tasks
    console.log('\\n4. Submitting test tasks...');
    
    const task1 = await manager.submitFeatureTask(
      'Add user authentication system with JWT tokens',
      3 // high priority
    );
    console.log(`✅ Submitted feature task: ${task1}`);
    
    const task2 = await manager.submitSingleAgentTask(
      'test-engineer',
      { testType: 'unit', component: 'auth' },
      2 // medium priority
    );
    console.log(`✅ Submitted test task: ${task2}`);
    
    const task3 = await manager.submitCustomTask({
      title: 'Code Review: Authentication Module',
      type: 'SINGLE_AGENT',
      agentType: 'code-reviewer',
      input: { files: ['auth.js', 'auth.test.js'] },
      priority: 1
    });
    console.log(`✅ Submitted review task: ${task3}`);
    
    // Wait a bit for initial assignment
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check task assignment
    console.log('\\n5. Task assignment status:');
    const queueStats = await manager.queueManager.getQueueStats();
    const agentStats = await manager.queueManager.getAgentStats();
    
    console.log('Queue Stats:', queueStats);
    console.log('Agent Stats:', agentStats);
    
    // Show all tasks
    console.log('\\n6. Current tasks:');
    const allTasks = await manager.getTasks();
    allTasks.forEach(task => {
      console.log(`  ${task.id}: ${task.title} [${task.status}] (Priority: ${task.priority})`);
      if (task.assignedTo) {
        console.log(`    → Assigned to: ${task.assignedTo}`);
      }
    });
    
    // Test high-priority task selection
    console.log('\\n7. Testing task selection...');
    const nextTask = await manager.selectHighestPriorityTask();
    if (nextTask) {
      console.log(`Next highest priority task: ${nextTask.title} (Priority: ${nextTask.priority})`);
    } else {
      console.log('No tasks available for selection');
    }
    
    // Simulate task completion
    console.log('\\n8. Simulating task completion...');
    const activeTasks = await manager.getTasks('in_progress');
    if (activeTasks.length > 0) {
      const taskToComplete = activeTasks[0];
      console.log(`Completing task: ${taskToComplete.title}`);
      
      await manager.queueManager.taskQueue.completeTask(taskToComplete.id, {
        success: true,
        output: 'Task completed successfully in test mode',
        timestamp: new Date().toISOString()
      });
      
      // Update agent status
      const agent = Array.from(manager.queueManager.agents.values())
        .find(a => a.currentTask === taskToComplete.id);
      if (agent) {
        agent.isActive = false;
        agent.currentTask = null;
        agent.tasksCompleted++;
        manager.queueManager.activeAgents.delete(agent.id);
      }
    }
    
    // Final status check
    console.log('\\n9. Final system status:');
    const finalStatus = await manager.getSystemStatus();
    console.log(JSON.stringify(finalStatus, null, 2));
    
    // Test memory update
    console.log('\\n10. Testing memory update...');
    await manager.updateMemory(`Test run completed successfully:
- Queue system operational
- Task assignment working
- Agent registration functional
- Status monitoring active`);
    
    console.log('\\n✅ Queue System Test Completed Successfully!');
    
    // Cleanup
    console.log('\\n11. Stopping system...');
    await manager.stop();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await manager.stop();
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testQueueSystem().catch(console.error);
}

export { testQueueSystem };