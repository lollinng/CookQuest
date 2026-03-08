#!/usr/bin/env python3
"""
Inbox Watcher — lightweight daemon that watches the Obsidian vault for new
inbox items and spawns Claude Code to process them.

Usage:
    python3 scripts/inbox-watcher.py            # Poll every 60s (default)
    python3 scripts/inbox-watcher.py 30          # Poll every 30s
    python3 scripts/inbox-watcher.py --once      # Single check, no loop

How it works:
    1. Pulls vault git repo
    2. Reads Task Inbox.md for unprocessed items
    3. If found → runs: claude --dangerously-skip-permissions -p "/watch-inbox"
    4. ALWAYS runs obsidian-sync.py push after Claude finishes (programmatic, not agent-dependent)
    5. Checks if all tasks are done → auto-deploys if so
    6. Loops

Keeps your Claude session free. Only burns tokens when there's real work.
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime

VAULT_PATH = os.path.expanduser('~/Documents/CookQuest-Vault')
PROJECT_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX_FILE = os.path.join(VAULT_PATH, 'Task Inbox.md')
TASKS_FILE = os.path.join(PROJECT_PATH, 'claude-agents', 'tasks.json')
SYNC_SCRIPT = os.path.join(PROJECT_PATH, 'scripts', 'obsidian-sync.py')

C = '\033[36m'  # cyan
G = '\033[32m'  # green
Y = '\033[33m'  # yellow
R = '\033[31m'  # red
B = '\033[1m'   # bold
X = '\033[0m'   # reset
PREFIX = f'{C}[inbox-watcher]{X}'


def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f'{PREFIX} {ts}  {msg}')


def git_pull():
    """Pull latest vault changes."""
    result = subprocess.run(
        ['git', 'pull', '--rebase'],
        cwd=VAULT_PATH,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def vault_push():
    """ALWAYS push to vault — this is programmatic, not agent-dependent."""
    log('Pushing to vault (dashboard + inbox sync)...')
    result = subprocess.run(
        [sys.executable, SYNC_SCRIPT, 'push'],
        cwd=PROJECT_PATH,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        log(f'{G}Vault pushed.{X}')
    else:
        log(f'{R}Vault push failed:{X} {result.stderr.strip()}')
    return result.returncode == 0


def has_inbox_items():
    """Check if Task Inbox.md has unprocessed items."""
    if not os.path.exists(INBOX_FILE):
        return False

    with open(INBOX_FILE, 'r') as f:
        content = f.read()

    parts = content.split('---', 1)
    if len(parts) < 2:
        return False

    lines = parts[1].strip().splitlines()
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('<!--') and line.endswith('-->'):
            continue
        if line.startswith('- [x]'):
            continue
        if '~~' in line and line.count('~~') >= 2:
            continue
        if re.match(r'^(\d+\.|[-*])\s+\S', line):
            return True

    return False


def all_tasks_done():
    """Check if every task in tasks.json is done. Returns (all_done, total, open_count)."""
    if not os.path.exists(TASKS_FILE):
        return False, 0, 0

    with open(TASKS_FILE, 'r') as f:
        tasks = json.load(f)

    if not tasks:
        return False, 0, 0

    total = len(tasks)
    open_tasks = [t for t in tasks if t.get('status') in ('todo', 'in_progress')]
    return len(open_tasks) == 0, total, len(open_tasks)


def run_claude(prompt):
    """Spawn Claude Code with a prompt."""
    log(f'{B}Spawning Claude Code{X} → {prompt}')
    result = subprocess.run(
        ['claude', '--dangerously-skip-permissions', '-p', prompt],
        cwd=PROJECT_PATH,
        timeout=1200,  # 20 min max per run
    )
    return result.returncode == 0


def check_deploy():
    """If all tasks are done, trigger deploy. Returns True if deployed."""
    done, total, open_count = all_tasks_done()

    if not done:
        if total > 0:
            log(f'Tasks: {total - open_count}/{total} done, {open_count} remaining. Skipping deploy.')
        return False

    log(f'{G}{B}All {total} tasks done! Triggering deploy...{X}')
    success = run_claude('/deploy')
    if success:
        log(f'{G}Deploy complete.{X}')
    else:
        log(f'{R}Deploy failed. Check logs.{X}')

    # Always sync after deploy attempt
    vault_push()
    return success


def check_once():
    """Single check cycle. Returns True if work was found and processed."""
    log('Pulling vault...')
    if not git_pull():
        log(f'{Y}Git pull failed (maybe no remote or conflict){X}')

    if not has_inbox_items():
        log('Inbox empty. Sleeping...')
        return False

    log(f'{G}New inbox items detected!{X}')

    # Run watch-inbox pipeline
    success = run_claude('/watch-inbox')
    if success:
        log('Claude finished successfully.')
    else:
        log(f'{Y}Claude exited with error.{X}')

    # === PROGRAMMATIC GUARANTEES (not agent-dependent) ===

    # 1. ALWAYS push vault (dashboard + inbox updates)
    vault_push()

    # 2. Check if all tasks done → auto-deploy
    check_deploy()

    return True


def main():
    args = sys.argv[1:]

    if '--once' in args:
        found = check_once()
        sys.exit(0 if found else 1)

    interval = 60
    if args and args[0].isdigit():
        interval = int(args[0])

    log(f'{B}Starting inbox watcher{X} (poll every {interval}s)')
    log(f'Vault:   {VAULT_PATH}')
    log(f'Project: {PROJECT_PATH}')
    log(f'')
    log(f'Guarantees (programmatic, not agent-dependent):')
    log(f'  1. Vault sync (push) runs after EVERY Claude session')
    log(f'  2. Auto-deploy triggers when all tasks are done')
    log(f'  3. Dashboard + inbox always reflect latest state')
    log(f'')
    log(f'Press Ctrl+C to stop.\n')

    try:
        while True:
            check_once()
            time.sleep(interval)
    except KeyboardInterrupt:
        log('\nStopped.')


if __name__ == '__main__':
    main()
