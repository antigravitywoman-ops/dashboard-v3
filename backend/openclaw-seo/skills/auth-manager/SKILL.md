---
name: auth-manager
description: "Reads, validates, and refreshes API authentication credentials stored in the company-level .env file. Handles OAuth2 token refresh for Google APIs and validates API key health for third-party services. Use when: (1) a skill fails with a 401/403 auth error, (2) setting up a new company environment for the first time. NOT for: generating WordPress Application Passwords (use wp-technical), SSH access management (use ssh-executor)."
metadata:
  {
    "openclaw": {
      "emoji": "🔐",
      "requires": { "bins": ["node"] }
    }
  }
---

# AUTH MANAGER Skill

Validates and refreshes credentials in the company `.env` file.

## Quick Start
```bash
cd scripts/ && node auth-manager.js <company-slug> --check-all
cd scripts/ && node auth-manager.js <company-slug> --refresh=google
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Managing SSH keys → use `ssh-executor`
- Generating WordPress Application Passwords → use `wp-technical --action=auth-resolve` (auto-creates App Password and writes to `.env`)
- Generating new API keys — obtain these from the service dashboard manually

## Credential Status Tracking

This skill **validates existing credentials** but does **not generate App Passwords**. Credential status is tracked in `missing-dependencies.md`, which is auto-synced from `.env` by `heartbeat.js` every cycle and updated at runtime by `wp-technical` and `cms-wordpress` on failure. Do not manually edit it.

## Output
Returns `{ service, status: "valid"|"expired"|"missing", refreshed: true|false }` per credential.

## Rules
- Never print actual credential values to stdout — only status.
- On refresh failure, write the error to `memory/errors/auth-<ts>.log`.
