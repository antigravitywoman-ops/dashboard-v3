---
name: vps-configurator
description: "Configures and provisions a remote VPS for hosting SEO automation tasks: installs Node.js/Python, sets up cron jobs, configures nginx, and creates system services. Use when: (1) onboarding a new company that needs a dedicated VPS automation environment, (2) updating an existing server configuration. NOT for: running individual remote commands (use ssh-executor), WordPress server ops (use wpcli-manager)."
metadata:
  {
    "openclaw": {
      "emoji": "🛠️",
      "requires": { "bins": ["node"] }
    }
  }
---

# VPS CONFIGURATOR Skill

Provisions and configures a remote VPS environment for SEO automation.

## Quick Start
```bash
cd scripts/ && node vps-configurator.js <company-slug> --action=setup|update-cron|check
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Running a one-off command → use `ssh-executor`
- VPS is already configured and you only need to deploy a script update → use `ssh-executor`

## Output
Returns `{ steps[], status: "success"|"partial"|"failed", serverSummary }`.

## Rules
- Requires `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY_PATH` in company `.env`.
- Always run `--action=check` before `--action=setup` to verify current state.
- Set up cron job to run `wf-weekly-strategy` every Sunday at midnight UTC.
