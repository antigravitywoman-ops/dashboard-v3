---
name: forum-commenter
description: "Finds relevant non-Reddit forum threads (industry boards, niche communities, Facebook Groups) and drafts contextual, valuable comments that naturally reference the company's content. Use when: (1) the off-page strategy includes industry-specific forums in scope, (2) direct community engagement is needed outside of Reddit and Quora. NOT for: Reddit (use post-reddit), Quora (use post-quora), LinkedIn (use post-linkedin)."
metadata:
  {
    "openclaw": {
      "emoji": "💬",
      "requires": { "bins": ["node"] }
    }
  }
---

# FORUM COMMENTER Skill

Engages with niche forums and community boards through contextual, non-spammy comments.

## Quick Start
```bash
cd scripts/ && node forum-commenter.js <company-slug> --forum-url=<thread-url>
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Platform is Reddit → use `post-reddit`
- Platform is Quora → use `post-quora`
- No relevant thread exists — do not create off-topic comments

## Output
Returns `{ forumUrl, commentDraft, linkInserted: true|false }`.

## Rules
- Never post duplicate comments across forums.
- Comment must add genuine expertise — not a link drop.
- Save draft to `memory/outreach/forum-draft-<ts>.md` for review before posting.
