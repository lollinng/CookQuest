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
    4. Waits for Claude to finish, then loops

Keeps your Claude session free. Only burns tokens when there's real work.
"""

import os
import re
import subprocess
import sys
import time
from datetime import datetime

VAULT_PATH = os.path.expanduser('~/Documents/CookQuest-Vault')
PROJECT_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX_FILE = os.path.join(VAULT_PATH, 'Task Inbox.md')
LOG_PREFIX = '\033[36m[inbox-watcher]\033[0m'


def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f'{LOG_PREFIX} {ts}  {msg}')


def git_pull():
    """Pull latest vault changes."""
    result = subprocess.run(
        ['git', 'pull', '--rebase'],
        cwd=VAULT_PATH,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def has_inbox_items():
    """Check if Task Inbox.md has unprocessed items."""
    if not os.path.exists(INBOX_FILE):
        return False

    with open(INBOX_FILE, 'r') as f:
        content = f.read()

    # Split on separator
    parts = content.split('---', 1)
    if len(parts) < 2:
        return False

    after = parts[1]

    # Remove comments and empty lines
    lines = after.strip().splitlines()
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('<!--') and line.endswith('-->'):
            continue
        # Skip already-processed items
        if line.startswith('- [x]'):
            continue
        if '~~' in line and line.count('~~') >= 2:
            continue
        # Found an unprocessed item
        if re.match(r'^(\d+\.|[-*])\s+\S', line):
            return True

    return False


def run_claude():
    """Spawn Claude Code to process the inbox."""
    log('Spawning Claude Code → /watch-inbox')
    result = subprocess.run(
        ['claude', '--dangerously-skip-permissions', '-p', '/watch-inbox'],
        cwd=PROJECT_PATH,
        timeout=600,  # 10 min max
    )
    return result.returncode == 0


def check_once():
    """Single check cycle. Returns True if work was found and processed."""
    log('Pulling vault...')
    if not git_pull():
        log('Git pull failed (maybe no remote or conflict)')

    if has_inbox_items():
        log('New inbox items detected!')
        success = run_claude()
        if success:
            log('Claude finished successfully.')
        else:
            log('Claude exited with error.')
        return True
    else:
        log('Inbox empty. Sleeping...')
        return False


def main():
    args = sys.argv[1:]

    if '--once' in args:
        found = check_once()
        sys.exit(0 if found else 1)

    interval = 60
    if args and args[0].isdigit():
        interval = int(args[0])

    log(f'Starting inbox watcher (poll every {interval}s)')
    log(f'Vault: {VAULT_PATH}')
    log(f'Project: {PROJECT_PATH}')
    log(f'Press Ctrl+C to stop.\n')

    try:
        while True:
            check_once()
            time.sleep(interval)
    except KeyboardInterrupt:
        log('Stopped.')


if __name__ == '__main__':
    main()
