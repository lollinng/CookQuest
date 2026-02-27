#!/usr/bin/env node

/**
 * Queue System Integration Test
 *
 * Tests:
 * 1. TaskQueue CRUD (add, get, assign, complete, fail)
 * 2. QueueManager agent registration + auto-assignment
 * 3. Full pipeline: PM → Architect → Test → Dev → Review → DevOps
 * 4. Intention detection with the previously-failing prompt
 */

import TaskQueue from './task-queue.js';
import QueueManager from './queue-manager.js';
import IntentionDetector from './intention-detector.js';

const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ${PASS}: ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL}: ${label}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
// Test 1: TaskQueue CRUD
// ─────────────────────────────────────────────
async function testTaskQueueCRUD() {
  console.log('\n═══ Test 1: TaskQueue CRUD ═══');

  const queue = new TaskQueue({ queueFile: '/tmp/test-tasks.json' });
  await queue.initialize();

  // Add tasks
  const id1 = await queue.addTask({ title: 'Synthetic Task A', type: 'PRODUCT_FEATURE', prompt: 'Build login page', priority: 2 });
  const id2 = await queue.addTask({ title: 'Synthetic Task B', type: 'SINGLE_AGENT', agentType: 'test-engineer', priority: 1 });
  const id3 = await queue.addTask({ title: 'Synthetic Task C', type: 'PRODUCT_FEATURE', prompt: 'Add dark mode', priority: 3 });

  assert(typeof id1 === 'string' && id1.startsWith('task_'), 'addTask returns a valid task ID');

  const all = await queue.getAllTasks();
  assert(all.length === 3, `getAllTasks returns 3 tasks (got ${all.length})`);

  // getNextTask returns highest priority first
  const next = await queue.getNextTask();
  assert(next.id === id3, `getNextTask picks highest priority (priority 3) — got "${next.title}"`);

  // getNextTask with agentType filter — untyped tasks (no agentType) are
  // available to all agent types, so highest priority wins regardless
  const nextForTestEng = await queue.getNextTask('test-engineer');
  assert(nextForTestEng !== null, `getNextTask('test-engineer') returns a task`);
  // Task C (priority 3, no agentType) beats Task B (priority 1, agentType: test-engineer)
  assert(nextForTestEng.id === id3, `getNextTask('test-engineer') picks highest priority (untyped tasks pass filter)`);

  // Assign
  const assigned = await queue.assignTask(id1, 'agent_001');
  assert(assigned.status === 'in_progress', 'assignTask sets status to in_progress');
  assert(assigned.assignedTo === 'agent_001', 'assignTask sets assignedTo');

  // Complete
  const completed = await queue.completeTask(id1, { success: true });
  assert(completed.status === 'done', 'completeTask sets status to done');
  assert(completed.result.success === true, 'completeTask stores result');

  // Fail with retry
  await queue.assignTask(id2, 'agent_002');
  const failed1 = await queue.failTask(id2, new Error('Test failure'), true);
  assert(failed1.status === 'todo', 'failTask with retry resets status to todo');
  assert(failed1.retryCount === 1, 'failTask increments retryCount');

  // Fail past max retries
  await queue.assignTask(id2, 'agent_002');
  await queue.failTask(id2, new Error('fail 2'), true);
  await queue.assignTask(id2, 'agent_002');
  await queue.failTask(id2, new Error('fail 3'), true);
  await queue.assignTask(id2, 'agent_002');
  const failedFinal = await queue.failTask(id2, new Error('fail 4'), true);
  assert(failedFinal.status === 'failed', 'failTask past maxRetries sets status to failed');

  // Stats
  const stats = await queue.getQueueStats();
  assert(stats.done === 1, `Stats: 1 done (got ${stats.done})`);
  assert(stats.failed === 1, `Stats: 1 failed (got ${stats.failed})`);
  assert(stats.todo === 1, `Stats: 1 todo (got ${stats.todo})`);

  // Clear completed
  const cleared = await queue.clearCompletedTasks();
  assert(cleared === 1, `clearCompletedTasks removes 1 done task (got ${cleared})`);

  const statsAfter = await queue.getQueueStats();
  assert(statsAfter.total === 2, `After clear: 2 total tasks (got ${statsAfter.total})`);
}

// ─────────────────────────────────────────────
// Test 2: QueueManager agent registration & auto-assignment
// ─────────────────────────────────────────────
async function testQueueManager() {
  console.log('\n═══ Test 2: QueueManager Agent Registration ═══');

  const mgr = new QueueManager({ queueFile: '/tmp/test-tasks-mgr.json', pollInterval: 100 });
  await mgr.initialize();

  // Register agents
  const agent1 = await mgr.registerAgent('pm_agent', 'product-manager', ['requirements']);
  const agent2 = await mgr.registerAgent('dev_agent', 'developer', ['implementation']);

  assert(agent1.id === 'pm_agent', 'registerAgent stores correct id');
  assert(agent1.type === 'product-manager', 'registerAgent stores correct type');

  const agentStats = await mgr.getAgentStats();
  assert(agentStats.total === 2, `2 agents registered (got ${agentStats.total})`);
  assert(agentStats.active === 0, `0 active agents (got ${agentStats.active})`);

  // Add task and verify it's in the queue
  const taskId = await mgr.addTask({ title: 'Test auto-assign', type: 'PRODUCT_FEATURE', prompt: 'Build feature X', priority: 2 });
  const tasks = await mgr.getAllTasks();
  assert(tasks.length === 1, `1 task in queue (got ${tasks.length})`);
  assert(tasks[0].status === 'todo', 'New task status is todo');

  // Unregister
  const unregistered = await mgr.unregisterAgent('dev_agent');
  assert(unregistered === true, 'unregisterAgent returns true');
  const statsAfter = await mgr.getAgentStats();
  assert(statsAfter.total === 1, `1 agent after unregister (got ${statsAfter.total})`);
}

// ─────────────────────────────────────────────
// Test 3: Full Pipeline Execution
// ─────────────────────────────────────────────
async function testFullPipeline() {
  console.log('\n═══ Test 3: Full Pipeline (PM → Arch → Test → Dev → Review → DevOps) ═══');

  const mgr = new QueueManager({ queueFile: '/tmp/test-tasks-pipeline.json', pollInterval: 50 });
  await mgr.initialize();

  // Register a general agent
  await mgr.registerAgent('pipeline_agent', null, ['all']);

  // Add a feature task — prompt must avoid PM questions:
  // - contains "user" (avoids "who is target user?" question)
  // - has 2+ action verbs (avoids "what functionality?" question)
  // - contains "data"/"store"/"save" (avoids "what data?" question)
  // Prompt carefully crafted to avoid PM questions:
  // - "user"/"customer" present → no "who is target user?" question
  // - Two sentences with action verbs → parseFunctionalRequirements finds 2+ matches
  // - "data"/"store"/"save" present → no "what data?" question
  const testPrompt = 'Add user authentication system. Create a data store for saving customer preferences.';

  const taskId = await mgr.addTask({
    title: 'Build user auth + data store',
    type: 'PRODUCT_FEATURE',
    prompt: testPrompt,
    priority: 3
  });

  // Manually assign and execute to test the pipeline
  const task = await mgr.taskQueue.getNextTask();
  assert(task !== null, 'Task is available for pickup');

  await mgr.taskQueue.assignTask(taskId, 'pipeline_agent');
  const assignedTask = (await mgr.taskQueue.getAllTasks()).find(t => t.id === taskId);
  assert(assignedTask.status === 'in_progress', 'Task is in_progress after assignment');

  // Run the pipeline through the orchestrator directly
  try {
    const result = await mgr.orchestrator.runFeaturePipeline(testPrompt, {});

    assert(result.intention === 'PRODUCT_FEATURE', 'Pipeline result has correct intention');
    assert(result.outputs['product-manager'] !== undefined, 'PM agent produced output');
    assert(result.outputs['architect'] !== undefined, 'Architect agent produced output');
    assert(result.outputs['test-engineer'] !== undefined, 'Test Engineer agent produced output');
    assert(result.outputs['developer'] !== undefined, 'Developer agent produced output');
    assert(result.outputs['code-reviewer'] !== undefined, 'Code Reviewer agent produced output');
    assert(result.outputs['devops-engineer'] !== undefined, 'DevOps agent produced output');

    // Verify PM output shape
    const pmOut = result.outputs['product-manager'];
    assert(pmOut.clarifiedRequirements !== undefined, 'PM: clarifiedRequirements present');
    assert(pmOut.featureSpecification !== undefined, 'PM: featureSpecification present');
    assert(Array.isArray(pmOut.acceptanceCriteria), 'PM: acceptanceCriteria is array');

    // Verify Architect output shape
    const archOut = result.outputs['architect'];
    assert(Array.isArray(archOut.filesToCreate), 'Arch: filesToCreate is array');
    assert(Array.isArray(archOut.filesToModify), 'Arch: filesToModify is array');
    assert(Array.isArray(archOut.interfaces), 'Arch: interfaces is array');

    // Verify Test Engineer output shape
    const testOut = result.outputs['test-engineer'];
    assert(Array.isArray(testOut.unitTests), 'Test: unitTests is array');
    assert(Array.isArray(testOut.integrationTests), 'Test: integrationTests is array');
    assert(Array.isArray(testOut.e2eTests), 'Test: e2eTests is array');

    // Verify Developer output shape
    const devOut = result.outputs['developer'];
    assert(Array.isArray(devOut.implementedFiles), 'Dev: implementedFiles is array');

    // Verify Code Reviewer output shape
    const reviewOut = result.outputs['code-reviewer'];
    assert(typeof reviewOut.qualityScore === 'number', 'Review: qualityScore is number');
    assert(typeof reviewOut.approved === 'boolean', 'Review: approved is boolean');

    // Verify summary
    assert(result.summary !== undefined, 'Pipeline generates summary');
    assert(result.pullRequest !== undefined, 'Pipeline generates PR summary');

    // Complete the task in the queue
    await mgr.taskQueue.completeTask(taskId, result);
    const completedTask = (await mgr.taskQueue.getAllTasks()).find(t => t.id === taskId);
    assert(completedTask.status === 'done', 'Task marked done after pipeline completes');
    assert(completedTask.result.intention === 'PRODUCT_FEATURE', 'Task result stored correctly');

    // Verify no pipeline error
    assert(result.error === undefined, 'Pipeline completed without errors');

  } catch (error) {
    console.log(`  ${FAIL}: Pipeline threw an exception: ${error.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
// Test 4: Intention Detection (including the previously-failing prompt)
// ─────────────────────────────────────────────
async function testIntentionDetection() {
  console.log('\n═══ Test 4: Intention Detection ═══');

  const detector = new IntentionDetector();

  const featureCases = [
    'make docker run which runs both frontend and backend',
    'Build a shopping cart feature',
    'Add user authentication system',
    'Implement dashboard analytics',
    'set up CI/CD pipeline',
    'create a login page',
    'configure nginx reverse proxy',
    'make the app deployable',
    'As a user, I want to save my preferences',
    'develop a notification system',
    'I need a way to export data',
    'add docker compose for development',
  ];

  const conversationCases = [
    'How does React work?',
    'Help debug this error',
    'Explain this code',
    'fix bug in the login form',
    'What is the difference between props and state?',
    'Optimize this function',
    'refactor the auth module',
    'clean up the CSS files',
  ];

  featureCases.forEach(prompt => {
    const result = detector.detectIntention(prompt);
    assert(result.type === 'PRODUCT_FEATURE', `Feature: "${prompt}" → ${result.type}`);
  });

  conversationCases.forEach(prompt => {
    const result = detector.detectIntention(prompt);
    assert(result.type === 'CONVERSATION', `Convo: "${prompt}" → ${result.type}`);
  });
}

// ─────────────────────────────────────────────
// Test 5: Multi-task Queue — agents pick up and complete multiple tasks
// ─────────────────────────────────────────────
async function testMultiTaskExecution() {
  console.log('\n═══ Test 5: Multi-Task Queue Execution ═══');

  const queue = new TaskQueue({ queueFile: '/tmp/test-tasks-multi.json' });
  await queue.initialize();

  // Add 3 synthetic feature tasks
  const ids = [];
  ids.push(await queue.addTask({ title: 'Feature: User Profile', type: 'PRODUCT_FEATURE', prompt: 'Add user profile page', priority: 3 }));
  ids.push(await queue.addTask({ title: 'Feature: Search', type: 'PRODUCT_FEATURE', prompt: 'Build search functionality', priority: 2 }));
  ids.push(await queue.addTask({ title: 'Feature: Notifications', type: 'PRODUCT_FEATURE', prompt: 'Create notification system', priority: 1 }));

  // Simulate an agent picking up tasks one by one (highest priority first)
  const agentId = 'sim_agent_001';

  for (let i = 0; i < 3; i++) {
    const task = await queue.getNextTask();
    assert(task !== null, `Iteration ${i + 1}: task available`);

    await queue.assignTask(task.id, agentId);
    const assigned = (await queue.getAllTasks()).find(t => t.id === task.id);
    assert(assigned.status === 'in_progress', `Iteration ${i + 1}: "${task.title}" is in_progress`);

    // Simulate work completion
    await queue.completeTask(task.id, { success: true, iteration: i + 1 });
    const completed = (await queue.getAllTasks()).find(t => t.id === task.id);
    assert(completed.status === 'done', `Iteration ${i + 1}: "${task.title}" marked done`);
  }

  // Verify no tasks left
  const remaining = await queue.getNextTask();
  assert(remaining === null, 'No tasks remaining after all processed');

  const finalStats = await queue.getQueueStats();
  assert(finalStats.done === 3, `All 3 tasks done (got ${finalStats.done})`);
  assert(finalStats.todo === 0, `0 tasks todo (got ${finalStats.todo})`);
}

// ─────────────────────────────────────────────
// Run all tests
// ─────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   CookQuest Queue System Integration Test ║');
  console.log('╚═══════════════════════════════════════════╝');

  try {
    await testTaskQueueCRUD();
    await testQueueManager();
    await testFullPipeline();
    await testIntentionDetection();
    await testMultiTaskExecution();
  } catch (err) {
    console.error(`\n\x1b[31mFATAL ERROR: ${err.message}\x1b[0m`);
    console.error(err.stack);
    failed++;
  }

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log(`║   Results: ${passed} passed, ${failed} failed${' '.repeat(Math.max(0, 16 - String(passed).length - String(failed).length))}║`);
  console.log('╚═══════════════════════════════════════════╝');

  // Cleanup temp files
  const { promises: fs } = await import('fs');
  for (const f of ['/tmp/test-tasks.json', '/tmp/test-tasks-mgr.json', '/tmp/test-tasks-pipeline.json', '/tmp/test-tasks-multi.json']) {
    try { await fs.unlink(f); } catch {}
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
