# Claude Code Multi-Agent System

Autonomous 6-agent pipeline (PM → Architect → Dev → Review → DevOps) for CookQuest feature development.

See `CLAUDE.md` at project root for full instructions, pipeline rules, and conventions.

## Directory

```
claude-agents/
├── tasks.json              # Active task queue (todo/in_progress only)
├── tasks-archive.json      # Completed tasks archive
├── agent-config.json       # Pipeline thresholds and settings
├── memory.md               # Agent shared memory
├── task-inbox.md           # Inbox for new task ideas
├── README.md               # This file
└── on-demand/              # Agent docs loaded only when triggered
    ├── ui-ux-auditor-agent.md
    └── bug-triage-agent.md
```
