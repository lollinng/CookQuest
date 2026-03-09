#!/usr/bin/env python3
"""
Obsidian Vault Sync for CookQuest
Syncs project docs and task queue to/from an Obsidian vault repo.

Usage:
    python3 scripts/obsidian-sync.py push    # Project → Vault + render dashboard
    python3 scripts/obsidian-sync.py pull    # Vault → Project + check inbox
    python3 scripts/obsidian-sync.py sync    # Full bidirectional: pull then push
    python3 scripts/obsidian-sync.py watch   # Foreground watcher (auto-push on changes)
    python3 scripts/obsidian-sync.py watch 5 # Custom poll interval in seconds (default: 3)
"""

import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone

# === Configuration ===

VAULT_PATH = os.path.expanduser('~/Documents/CookQuest-Vault')
PROJECT_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Mapping: project relative path → vault relative path
FILE_MAP = {
    'CLAUDE.md': 'docs/CLAUDE.md',
    'README.md': 'docs/README.md',
    'DEPLOY.md': 'docs/DEPLOY.md',
    'VERCEL-DEPLOYMENT.md': 'docs/VERCEL-DEPLOYMENT.md',
    'NEXT_SESSION_CONTEXT.md': 'docs/NEXT_SESSION_CONTEXT.md',
    'PROJECT_STRUCTURE.md': 'docs/PROJECT_STRUCTURE.md',
    'ATTRIBUTIONS.md': 'docs/ATTRIBUTIONS.md',
    'WORKFLOW.md': 'docs/WORKFLOW.md',
    'USAGE.md': 'docs/USAGE.md',
    'gcp/GCP-DEPLOYMENT.md': 'docs/GCP-DEPLOYMENT.md',
    'guidelines/Guidelines.md': 'guidelines/Guidelines.md',
    'claude-agents/tasks.json': 'agent-system/tasks.json',
    'claude-agents/agent-config.json': 'agent-system/agent-config.json',
    'claude-agents/memory.md': 'agent-system/memory.md',
    'claude-agents/README.md': 'agent-system/README.md',
    'claude-agents/on-demand/ui-ux-auditor-agent.md': 'agent-system/ui-ux-auditor-agent.md',
    'claude-agents/on-demand/bug-triage-agent.md': 'agent-system/bug-triage-agent.md',
    'claude-agents/agent-roster.json': 'agent-system/agent-roster.json',
}

# Directories to auto-sync (all .md files inside → vault subdirectory)
AUTO_SYNC_DIRS = {
    '.claude/commands': 'commands',
}

# launchd auto-sync daemon
LAUNCHD_LABEL = 'com.cookquest.vault-sync'
LAUNCHD_PLIST = os.path.expanduser(f'~/Library/LaunchAgents/{LAUNCHD_LABEL}.plist')

# Directories the daemon watches for changes
WATCH_PATHS = [
    'CLAUDE.md',
    'README.md',
    'DEPLOY.md',
    'claude-agents',
    '.claude/commands',
    'guidelines',
]

INBOX_VAULT = os.path.join(VAULT_PATH, 'Task Inbox.md')
INBOX_PROJECT = os.path.join(PROJECT_PATH, 'claude-agents', 'task-inbox.md')
INBOX_SEPARATOR = '---'

# === Helpers ===

def git(args, cwd=VAULT_PATH):
    """Run a git command in the vault repo."""
    result = subprocess.run(
        ['git'] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()

def copy_file(src, dst):
    """Copy a file, creating parent dirs as needed."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)

def has_remote(cwd=VAULT_PATH):
    """Check if the vault repo has a remote configured."""
    code, out, _ = git(['remote'], cwd)
    return code == 0 and bool(out.strip())

# === Push: Project → Vault ===

def push():
    """Copy project files to vault and render the Task Dashboard."""
    print('Push: copying project files to vault...')
    copied = 0
    for proj_rel, vault_rel in FILE_MAP.items():
        src = os.path.join(PROJECT_PATH, proj_rel)
        dst = os.path.join(VAULT_PATH, vault_rel)
        if os.path.exists(src):
            copy_file(src, dst)
            copied += 1
        else:
            print(f'  skip (not found): {proj_rel}')

    # Auto-sync directories (all .md files)
    for proj_dir, vault_dir in AUTO_SYNC_DIRS.items():
        src_dir = os.path.join(PROJECT_PATH, proj_dir)
        if not os.path.isdir(src_dir):
            continue
        for fname in sorted(os.listdir(src_dir)):
            if fname.endswith('.md'):
                src = os.path.join(src_dir, fname)
                dst = os.path.join(VAULT_PATH, vault_dir, fname)
                copy_file(src, dst)
                copied += 1

    print(f'  copied {copied} files')

    render_dashboard()

    # Git commit + push
    git(['add', '-A'])
    code, out, err = git(['diff', '--cached', '--quiet'])
    if code != 0:
        now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
        git(['commit', '-m', f'sync: update from project ({now})'])
        print('  committed changes')
        if has_remote():
            code, out, err = git(['push'])
            if code == 0:
                print('  pushed to remote')
            else:
                print(f'  push failed: {err}')
    else:
        print('  no changes to commit')

def render_dashboard():
    """Generate Task Dashboard.md from tasks.json."""
    tasks_path = os.path.join(PROJECT_PATH, 'claude-agents', 'tasks.json')
    if not os.path.exists(tasks_path):
        print('  tasks.json not found, skipping dashboard')
        return

    with open(tasks_path, 'r') as f:
        tasks = json.load(f)

    todo = [t for t in tasks if t.get('status') == 'todo']
    in_progress = [t for t in tasks if t.get('status') == 'in_progress']
    done = [t for t in tasks if t.get('status') == 'done']

    now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')

    lines = [
        '# Task Dashboard',
        '',
        f'> Auto-generated by `scripts/obsidian-sync.py push` — {now}',
        '> Do not edit manually.',
        '',
        '---',
        '',
        '## Summary',
        '',
        f'| Status | Count |',
        f'|--------|-------|',
        f'| Todo | {len(todo)} |',
        f'| In Progress | {len(in_progress)} |',
        f'| Done | {len(done)} |',
        f'| **Total** | **{len(tasks)}** |',
        '',
    ]

    # Active tasks (todo + in_progress) sorted by priority
    active = sorted(todo + in_progress, key=lambda t: (t.get('priority', 99), t.get('id', '')))
    if active:
        lines.append('## Active Tasks')
        lines.append('')
        lines.append('| ID | Title | Priority | Status | Assignee |')
        lines.append('|----|-------|----------|--------|----------|')
        for t in active:
            assignee = t.get('assignedTo') or '—'
            lines.append(f"| {t['id']} | {t.get('title', '')} | {t.get('priority', '—')} | {t['status']} | {assignee} |")
        lines.append('')

    # Completed tasks (most recent first)
    if done:
        done_sorted = sorted(done, key=lambda t: t.get('completedAt') or '', reverse=True)
        lines.append('## Completed Tasks')
        lines.append('')
        lines.append('| ID | Title | Completed |')
        lines.append('|----|-------|-----------|')
        for t in done_sorted[:20]:  # Show last 20
            completed = t.get('completedAt') or '—'
            if completed != '—':
                completed = completed[:10]  # Just the date
            lines.append(f"| {t['id']} | {t.get('title', '')} | {completed} |")
        if len(done_sorted) > 20:
            lines.append(f'| ... | *{len(done_sorted) - 20} more completed tasks* | |')
        lines.append('')

    # Agent workload
    agents = {}
    for t in in_progress:
        agent = t.get('assignedTo') or 'unassigned'
        agents[agent] = agents.get(agent, 0) + 1
    unassigned_todo = len([t for t in todo if not t.get('assignedTo')])

    lines.append('## Agent Workload')
    lines.append('')
    for agent, count in sorted(agents.items()):
        lines.append(f'- **{agent}**: {count} in progress')
    lines.append(f'- **Unassigned todo**: {unassigned_todo}')
    lines.append('')

    dashboard_path = os.path.join(VAULT_PATH, 'Task Dashboard.md')
    with open(dashboard_path, 'w') as f:
        f.write('\n'.join(lines))
    print('  rendered Task Dashboard.md')

# === Pull: Vault → Project ===

def pull():
    """Pull vault changes and check inbox for new task ideas."""
    print('Pull: fetching vault changes...')

    if has_remote():
        code, out, err = git(['pull', '--rebase'])
        if code == 0:
            print('  pulled from remote')
        else:
            print(f'  pull failed: {err}')
    else:
        print('  no remote configured, skipping pull')

    # Check inbox
    check_inbox()

    # Sync vault edits back to project (vault .md files → project)
    sync_vault_edits_to_project()

def check_inbox():
    """If Task Inbox.md has user content, copy it to project-side inbox."""
    if not os.path.exists(INBOX_VAULT):
        print('  no Task Inbox.md in vault')
        return

    with open(INBOX_VAULT, 'r') as f:
        content = f.read()

    # Find content after the separator line
    parts = content.split(INBOX_SEPARATOR, 1)
    if len(parts) < 2:
        print('  inbox: no separator found')
        return

    after_separator = parts[1].strip()
    # Remove the HTML comment marker if that's all there is
    cleaned = after_separator.replace('<!-- Write below this line -->', '').strip()

    if not cleaned:
        print('  inbox: empty')
        return

    print(f'  inbox: found {len(cleaned)} chars of content')

    # Write to project-side inbox
    inbox_content = (
        '# Task Inbox (Project-side)\n'
        '\n'
        '> Synced from vault\'s `Task Inbox.md` by `scripts/obsidian-sync.py pull`.\n'
        '> Agents read this file. After processing, clear content below the line.\n'
        '\n'
        '---\n'
        '\n'
        '<!-- Inbox items appear below this line -->\n'
        '\n'
        f'{cleaned}\n'
    )
    with open(INBOX_PROJECT, 'w') as f:
        f.write(inbox_content)
    print(f'  wrote inbox entries to {os.path.relpath(INBOX_PROJECT, PROJECT_PATH)}')

def sync_vault_edits_to_project():
    """Copy vault .md files back to project if they're newer."""
    synced = 0
    for proj_rel, vault_rel in FILE_MAP.items():
        # Only sync markdown files back (not JSON — tasks.json is project-authoritative)
        if not vault_rel.endswith('.md'):
            continue

        vault_file = os.path.join(VAULT_PATH, vault_rel)
        proj_file = os.path.join(PROJECT_PATH, proj_rel)

        if not os.path.exists(vault_file) or not os.path.exists(proj_file):
            continue

        vault_mtime = os.path.getmtime(vault_file)
        proj_mtime = os.path.getmtime(proj_file)

        if vault_mtime > proj_mtime:
            copy_file(vault_file, proj_file)
            synced += 1

    if synced:
        print(f'  synced {synced} vault edits back to project')

# === Sync: Bidirectional ===

def sync():
    """Full bidirectional sync: pull first, then push."""
    pull()
    print()
    push()

# === Watch Mode (foreground, real-time) ===

def _snapshot_mtimes():
    """Build a dict of file path → mtime for all watched paths."""
    state = {}
    for rel in WATCH_PATHS:
        full = os.path.join(PROJECT_PATH, rel)
        if os.path.isdir(full):
            for root, dirs, files in os.walk(full):
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        state[fp] = os.path.getmtime(fp)
                    except OSError:
                        pass
        elif os.path.exists(full):
            state[full] = os.path.getmtime(full)
    return state


def watch(interval=3):
    """Watch project files and auto-sync on changes. Runs in foreground (Ctrl+C to stop)."""
    print(f'Vault auto-sync: watching for changes every {interval}s')
    print(f'Vault: {VAULT_PATH}')
    print(f'Watching:')
    for p in WATCH_PATHS:
        print(f'  → {p}')
    print(f'Press Ctrl+C to stop.\n')

    # Initial sync
    push()
    prev = _snapshot_mtimes()

    try:
        while True:
            time.sleep(interval)
            current = _snapshot_mtimes()

            if current != prev:
                # Find what changed for a nice log line
                changed = [
                    os.path.relpath(k, PROJECT_PATH)
                    for k in set(list(current.keys()) + list(prev.keys()))
                    if current.get(k) != prev.get(k)
                ]
                ts = datetime.now().strftime('%H:%M:%S')
                print(f'\n[{ts}] Changed: {", ".join(changed[:5])}')
                push()
                prev = _snapshot_mtimes()  # Re-snapshot after push
    except KeyboardInterrupt:
        print('\nStopped.')


# === Auto-Sync Daemon (launchd) ===

def install_daemon():
    """Install a macOS launchd daemon that watches project files and auto-syncs to vault."""
    abs_watch = [os.path.join(PROJECT_PATH, p) for p in WATCH_PATHS]
    watch_xml = '\n'.join(f'        <string>{p}</string>' for p in abs_watch)

    plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{LAUNCHD_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>{os.path.abspath(__file__)}</string>
        <string>push</string>
    </array>
    <key>WatchPaths</key>
    <array>
{watch_xml}
    </array>
    <key>ThrottleInterval</key>
    <integer>5</integer>
    <key>StandardOutPath</key>
    <string>/tmp/cookquest-vault-sync.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cookquest-vault-sync.log</string>
</dict>
</plist>"""

    # Unload existing if present
    if os.path.exists(LAUNCHD_PLIST):
        subprocess.run(['launchctl', 'unload', LAUNCHD_PLIST], capture_output=True)

    os.makedirs(os.path.dirname(LAUNCHD_PLIST), exist_ok=True)
    with open(LAUNCHD_PLIST, 'w') as f:
        f.write(plist)

    subprocess.run(['launchctl', 'load', LAUNCHD_PLIST])
    print(f'Installed and loaded: {LAUNCHD_LABEL}')
    print(f'Watching {len(abs_watch)} paths (throttle: 5s)')
    for p in abs_watch:
        print(f'  → {os.path.relpath(p, PROJECT_PATH)}')
    print(f'Log: /tmp/cookquest-vault-sync.log')
    print()
    print('Any change to watched files will auto-push to vault within 5 seconds.')
    print('Uninstall with: python3 scripts/obsidian-sync.py uninstall')


def uninstall_daemon():
    """Uninstall the launchd auto-sync daemon."""
    if os.path.exists(LAUNCHD_PLIST):
        subprocess.run(['launchctl', 'unload', LAUNCHD_PLIST], capture_output=True)
        os.remove(LAUNCHD_PLIST)
        print(f'Uninstalled: {LAUNCHD_LABEL}')
    else:
        print(f'Not installed (no plist at {LAUNCHD_PLIST})')


def daemon_status():
    """Check if the auto-sync daemon is running."""
    result = subprocess.run(
        ['launchctl', 'list', LAUNCHD_LABEL],
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        print(f'Daemon: RUNNING ({LAUNCHD_LABEL})')
        # Parse PID from output
        for line in result.stdout.strip().split('\n'):
            if 'PID' in line or line.strip().startswith('"PID"'):
                print(f'  {line.strip()}')
        print(f'Log: /tmp/cookquest-vault-sync.log')
    else:
        print(f'Daemon: NOT RUNNING')
        if os.path.exists(LAUNCHD_PLIST):
            print(f'  Plist exists but daemon not loaded. Run: python3 scripts/obsidian-sync.py install')
        else:
            print(f'  Not installed. Run: python3 scripts/obsidian-sync.py install')


# === Main ===

def main():
    if len(sys.argv) < 2:
        print('Usage: python3 scripts/obsidian-sync.py [push|pull|sync|watch|install|uninstall|status]')
        sys.exit(1)

    mode = sys.argv[1].lower()

    # Daemon management commands don't need vault to exist
    if mode == 'install':
        if not os.path.isdir(VAULT_PATH):
            print(f'Error: vault not found at {VAULT_PATH}')
            sys.exit(1)
        install_daemon()
        return
    elif mode == 'uninstall':
        uninstall_daemon()
        return
    elif mode == 'status':
        daemon_status()
        return

    if not os.path.isdir(VAULT_PATH):
        print(f'Error: vault not found at {VAULT_PATH}')
        print('Create it with: mkdir -p ~/Documents/CookQuest-Vault && cd ~/Documents/CookQuest-Vault && git init')
        sys.exit(1)

    if mode == 'push':
        push()
    elif mode == 'pull':
        pull()
    elif mode == 'sync':
        sync()
    elif mode == 'watch':
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 3
        watch(interval)
    else:
        print(f'Unknown mode: {mode}')
        print('Usage: python3 scripts/obsidian-sync.py [push|pull|sync|watch|install|uninstall|status]')
        sys.exit(1)

if __name__ == '__main__':
    main()
