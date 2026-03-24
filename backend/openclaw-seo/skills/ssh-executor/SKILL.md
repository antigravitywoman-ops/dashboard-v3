---
name: ssh-executor
description: "Executes shell commands on a remote VPS or server via SSH using the company's stored private key. Use when: (1) deploying or running scripts on the VPS, (2) vps-configurator needs remote shell access, (3) restarting services or checking cron logs on the server. NOT for: local command execution (run commands directly), file transfer (use SCP separately), WordPress management (use wpcli-manager)."
metadata:
  {
    "openclaw": {
      "emoji": "🖥️",
      "requires": { "bins": ["node"] }
    }
  }
---

# SSH EXECUTOR Skill

Runs shell commands on a remote server via SSH.

## Quick Start
```bash
cd scripts/ && node ssh-executor.js <company-slug> --cmd="<shell command>"
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Commands should run locally — execute them directly
- WordPress CLI → use `wpcli-manager` (which handles SSH internally)

## Output
Returns `{ exitCode, stdout, stderr, duration }`.

## Rules
- Load `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY_PATH` from company `.env`.
- Timeout: 30 seconds per command. Log timeout errors to `memory/errors/ssh-<ts>.log`.
- Use strict host key checking. Never pass `StrictHostKeyChecking=no` in production.
