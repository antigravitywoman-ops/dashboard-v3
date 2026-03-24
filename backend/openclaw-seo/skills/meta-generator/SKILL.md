# Meta Generator

> Generates `.meta.json` sidecar files for all company folder content.

## Purpose

Ensures every content file in the company folder has a corresponding metadata file with all required fields for the SEO Dashboard API and UI to display properly.

## When to Use

- After creating any new content file (`content-writer` agent)
- After running a technical audit
- After generating a report sheet
- After building a weekly plan
- During company onboarding
- As a periodic sync task

## File Types Supported

### 1. Content Files (`content/{status}/*.md`)

Creates `content/{status}/{filename}.meta.json`:

```json
{
  "title": "Article Title",
  "type": "blog-post",
  "status": "pending-publish",
  "word_count": 1500,
  "seo_score": 85,
  "target_url": "https://example.com/blog/article",
  "author": "Content Team",
  "gap_id": "GAP-001",
  "week_target": "Week 1",
  "priority": "HIGH",
  "keywords": ["keyword1", "keyword2"],
  "created_at": "2026-03-18T12:00:00Z",
  "updated_at": "2026-03-18T12:00:00Z",
  "published_at": null,
  "gate_status": "pending",
  "gate_notes": null
}
```

### 2. Technical Audits (`technical/audits/*.json`)

Creates `technical/audits/{filename}.meta.json`:

```json
{
  "audit_type": "full-site",
  "crawl_timestamp": "2026-03-18T12:00:00Z",
  "pages_crawled": 150,
  "total_issues": 25,
  "critical": 3,
  "high": 8,
  "medium": 10,
  "low": 4,
  "fixed": 0,
  "scope_flags": {
    "linkedin_active": true,
    "reddit_active": true,
    "quora_active": true
  },
  "tool": "firecrawl",
  "created_at": "2026-03-18T12:00:00Z",
  "updated_at": "2026-03-18T12:00:00Z"
}
```

### 3. Report Sheets (`reports/{period}/sheets/*.md`)

Creates `reports/{period}/sheets/{NN-name}.meta.json`:

```json
{
  "sheet_number": 2,
  "sheet_name": "Gap Analysis",
  "sheet_id": "02-gap-analysis",
  "period": "2026-03",
  "content_hash": "abc123...",
  "validation_status": "passed",
  "validation_errors": null,
  "keywords_count": 50,
  "competitors_analyzed": 5,
 "gaps_identified": 12,
  "tasks_generated": 8,
  "created_at": "2026-03-18T12:00:00Z",
  "updated_at": "2026-03-18T12:00:00Z"
}
```

### 4. Weekly Plans (`plans/active/*.md`)

Creates `plans/active/{YYYY-WNN}.meta.json`:

```json
{
  "week": "2026-W12",
  "week_start": "2026-03-17T00:00:00Z",
  "week_end": "2026-03-23T23:59:59Z",
  "status": "active",
  "total_tasks": 15,
  "completed_tasks": 3,
  "pending_tasks": 10,
  "blocked_tasks": 2,
  "focus_areas": ["Technical SEO", "Content Creation"],
  "gaps_addressed": ["GAP-001", "GAP-002"],
  "priority_tasks": ["task-1", "task-2"],
  "notes": null,
  "created_at": "2026-03-18T12:00:00Z",
  "updated_at": "2026-03-18T12:00:00Z"
}
```

### 5. About Files (`about/*.md`)

Creates `about/{filename}.meta.json`:

```json
{
  "category": "brand-voice",
  "last_reviewed": "2026-03-18T12:00:00Z",
  "review_status": "approved",
  "linked_sheets": ["02-gap-analysis", "05-keyword-research"],
  "version": 1,
  "author": "Research Team",
  "created_at": "2026-03-15T12:00:00Z",
  "updated_at": "2026-03-18T12:00:00Z"
}
```

### 6. Reviews (`reviews/*.md`)

Creates `reviews/{filename}.meta.json`:

```json
{
  "review_type": "content-review",
  "target_url": "https://example.com/blog/article",
  "status": "approved",
  "score": 85,
  "issues_found": 3,
  "issues_resolved": 3,
  "reviewer": "verification-agent",
  "target_item": "article-slug.md",
  "created_at": "2026-03-18T12:00:00Z",
  "updated_at": "2026-03-18T12:00:00Z"
}
```

## Implementation

### Python Script

```python
import json
import os
import re
from datetime import datetime
from pathlib import Path

COMPANY_DIR = Path("companies")

def extract_title_from_md(content: str) -> str:
    """Extract title from first H1 heading or use filename."""
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return ""

def count_words(content: str) -> int:
    """Count words in markdown content."""
    # Remove markdown syntax
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content)
    text = re.sub(r'[#*_`~>\-]', '', text)
    words = text.split()
    return len(words)

def generate_content_meta(md_path: Path) -> dict:
    """Generate metadata for content file."""
    content = md_path.read_text(encoding='utf-8')
    now = datetime.utcnow().isoformat() + 'Z'

    return {
        "title": extract_title_from_md(content) or md_path.stem.replace('-', ' '),
        "type": "blog-post",  # Default, can be inferred from content
        "status": md_path.parent.name,
        "word_count": count_words(content),
        "seo_score": None,
        "target_url": None,
        "author": None,
        "gap_id": None,
        "week_target": None,
        "priority": None,
        "keywords": [],
        "created_at": now,
        "updated_at": now,
        "published_at": None,
        "gate_status": "pending",
        "gate_notes": None
    }

def generate_sheet_meta(md_path: Path, period: str) -> dict:
    """Generate metadata for report sheet."""
    content = md_path.read_text(encoding='utf-8')
    now = datetime.utcnow().isoformat() + 'Z'

    # Extract sheet number and name from filename
    match = re.match(r'(\d+)-(.+)\.md', md_path.name)
    sheet_num = int(match.group(1)) if match else 0
    sheet_name = match.group(2).replace('-', ' ').title() if match else md_path.stem

    return {
        "sheet_number": sheet_num,
        "sheet_name": sheet_name,
        "sheet_id": f"{match.group(1):02d}-{match.group(2)}" if match else md_path.stem,
        "period": period,
        "content_hash": hash(content),
        "validation_status": "pending",
        "keywords_count": None,
        "competitors_analyzed": None,
        "gaps_identified": None,
        "tasks_generated": None,
        "created_at": now,
        "updated_at": now
    }

def generate_plan_meta(md_path: Path) -> dict:
    """Generate metadata for weekly plan."""
    now = datetime.utcnow().isoformat() + 'Z'

    # Extract week from filename
    match = re.match(r'(\d{4})-W(\d{2})', md_path.stem)
    if match:
        year, week = match.groups()
        week_start = f"{year}-{int(week):02d}-01"
    else:
        week_start = None

    return {
        "week": md_path.stem,
        "week_start": week_start,
        "week_end": None,
        "status": "active",
        "total_tasks": 0,
        "completed_tasks": 0,
        "pending_tasks": 0,
        "blocked_tasks": 0,
        "focus_areas": [],
        "gaps_addressed": [],
        "priority_tasks": [],
        "notes": None,
        "created_at": now,
        "updated_at": now
    }

def ensure_meta_for_company(company_slug: str):
    """Ensure all content files have metadata."""
    company_path = COMPANY_DIR / company_slug

    if not company_path.exists():
        print(f"Company not found: {company_slug}")
        return

    # Content files
    content_dir = company_path / "content"
    if content_dir.exists():
        for status_dir in content_dir.iterdir():
            if status_dir.is_dir():
                for md_file in status_dir.glob("*.md"):
                    meta_file = md_file.with_suffix('.meta.json')
                    if not meta_file.exists():
                        meta = generate_content_meta(md_file)
                        meta_file.write_text(json.dumps(meta, indent=2))
                        print(f"Created: {meta_file}")

    # Report sheets
    reports_dir = company_path / "reports"
    if reports_dir.exists():
        for period_dir in reports_dir.iterdir():
            if period_dir.is_dir():
                sheets_dir = period_dir / "sheets"
                if sheets_dir.exists():
                    for md_file in sheets_dir.glob("*.md"):
                        meta_file = md_file.with_suffix('.meta.json')
                        if not meta_file.exists():
                            meta = generate_sheet_meta(md_file, period_dir.name)
                            meta_file.write_text(json.dumps(meta, indent=2))
                            print(f"Created: {meta_file}")

    # Plans
    plans_dir = company_path / "plans" / "active"
    if plans_dir.exists():
        for md_file in plans_dir.glob("*.md"):
            meta_file = md_file.with_suffix('.meta.json')
            if not meta_file.exists():
                meta = generate_plan_meta(md_file)
                meta_file.write_text(json.dumps(meta, indent=2))
                print(f"Created: {meta_file}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        ensure_meta_for_company(sys.argv[1])
    else:
        print("Usage: python meta-generator.py <company-slug>")
