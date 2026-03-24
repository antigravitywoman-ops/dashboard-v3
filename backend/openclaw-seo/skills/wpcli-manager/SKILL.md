---
name: wpcli-manager
description: "Executes WP-CLI commands on a WordPress installation for bulk operations: plugin management, user management, cache flushing, options updates, and content import/export. Use when: (1) bulk operations too slow or unavailable via REST API, (2) managing plugins or site health post-deployment, (3) cache needs flushing after a batch publish. NOT for: creating or editing individual posts (use cms-wordpress), non-WordPress sites (use cms-editor-generic)."
metadata:
  {
    "openclaw": {
      "emoji": "⚡",
      "requires": { "bins": ["node"] }
    }
  }
---

# WPCLI MANAGER Skill

Executes WP-CLI commands for bulk WordPress operations via SSH.

## Quick Start
```bash
cd scripts/ && node wpcli-manager.js <company-slug> --cmd="wp cache flush"
cd scripts/ && node wpcli-manager.js <company-slug> --cmd="wp plugin update --all"
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Creating or updating a single post → use `cms-wordpress`
- Non-WordPress site → use `cms-editor-generic`

## Output
Returns `{ exitCode, stdout, stderr }` from the remote WP-CLI execution.

## Rules
- Requires SSH access via `ssh-executor` under the hood.
- Always run `wp cache flush` after any bulk content import or publish.
- Prefix commands with `--path=<wp-root>` if WordPress is not in the default path.
