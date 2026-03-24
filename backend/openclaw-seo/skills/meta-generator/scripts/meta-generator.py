#!/usr/bin/env python3
"""
Meta Generator - Creates .meta.json sidecar files for company folder content.
Also enriches existing .meta.json files with actual content analysis (counts, hashes).

Usage:
    python meta-generator.py <company-slug>          # Create / enrich all metadata
    python meta-generator.py <company-slug> --enrich  # Re-analyze and update all .meta.json
    python meta-generator.py <company-slug> --folders  # Create folders only
"""

import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path

# Use absolute path
SCRIPT_DIR = Path(__file__).resolve().parent
# scripts/meta-generator.py -> meta-generator -> skills -> openclaw-seo -> companies
COMPANY_DIR = SCRIPT_DIR.parent.parent.parent / "companies"


def content_hash(content: str) -> str:
    """Compute MD5 hash of content for change detection."""
    return hashlib.md5(content.encode('utf-8')).hexdigest()


def extract_title_from_md(content: str) -> str:
    """Extract title from first H1 heading or use filename."""
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return ""


def count_words(content: str) -> int:
    """Count words in markdown content."""
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content)
    text = re.sub(r'[#*_`~>\-]', '', text)
    words = text.split()
    return len(words)


def count_table_rows(content: str) -> int:
    """Count non-header table rows in markdown content."""
    lines = content.split('\n')
    rows = 0
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('|') and stripped.endswith('|'):
            cells = [c.strip() for c in stripped.split('|') if c.strip()]
            # Header lines typically have '---' separators after them, skip those
            if len(cells) >= 2 and not all(re.match(r'^-+$', c) for c in cells):
                rows += 1
    # Subtract 1 for the header row
    return max(0, rows - 1)


def count_gap_refs(content: str) -> int:
    """Count GAP-### references in content."""
    matches = re.findall(r'GAP-\d{3}', content)
    return len(matches)


def count_keyword_rows(content: str) -> int:
    """Count keyword table rows (lines with | keyword | volume/difficulty pattern)."""
    lines = content.split('\n')
    count = 0
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('|') and stripped.endswith('|'):
            cells = [c.strip() for c in stripped.split('|') if c.strip()]
            # Keyword rows have: keyword term | intent | position/something | volume | difficulty | ...
            if len(cells) >= 3:
                # Check if second column looks like volume (numeric)
                second = re.sub(r'[,.\s]', '', cells[1])
                if second and re.match(r'^[\d.-]+$', second):
                    count += 1
    return count


def extract_data_sources(content: str, existing: list = None) -> list:
    """Extract data sources referenced in sheet content."""
    sources = set(existing if existing else [])
    content_lower = content.lower()

    if 'search console' in content_lower or 'gsc' in content_lower:
        sources.add('gsc')
    if 'google analytics' in content_lower or 'ga4' in content_lower:
        sources.add('ga4')
    if 'serper' in content_lower or 'serp' in content_lower:
        sources.add('serper-miner')
    if 'firecrawl' in content_lower or 'crawl' in content_lower:
        sources.add('crawl-firecrawl')
    if 'schema' in content_lower:
        sources.add('schema-auditor')
    if 'crawl-browser' in content_lower or 'browser crawl' in content_lower:
        sources.add('crawl-browser')
    if 'rank' in content_lower or 'ranking' in content_lower:
        sources.add('rank-track')
    if 'ahrefs' in content_lower:
        sources.add('ahrefs')
    if 'similarweb' in content_lower:
        sources.add('similarweb')

    return sorted(list(sources))


def extract_linked_sheets(content: str, current_num: str) -> list:
    """Extract cross-references to other sheets (e.g. 'Sheet 05')."""
    refs = set()
    matches = re.findall(r'Sheet (\d{2})', content)
    for match in matches:
        if match != current_num:
            SHEET_FILENAMES = {
                '00': '00-digital-presence-baseline', '01': '01-executive-summary',
                '02': '02-gap-analysis', '03': '03-competitor-analysis',
                '04': '04-twelve-week-plan', '05': '05-keyword-research',
                '06': '06-location-pages', '07': '07-citations-backlinks',
                '08': '08-youtube-strategy', '09': '09-reddit-quora',
                '10': '10-review-strategy', '11': '11-schema-markup',
                '12': '12-weekly-tasks', '13': '13-kpis-metrics',
            }
            if match in SHEET_FILENAMES:
                refs.add(f'{match}-{SHEET_FILENAMES[match]}')
    return sorted(list(refs))


def extract_content_summary_and_highlights(content: str) -> tuple:
    """
    Extract summary (1 sentence, max 150 chars) and highlights (H2 headings, max 5, max 80 chars)
    from content markdown. Returns (summary, highlights_list).
    """
    if not content:
        return None, []

    # Strip frontmatter
    content_clean = re.sub(r'^---\s*\n[\s\S]*?\n---\s*\n?', '', content)

    # Strip markdown syntax
    plain = content_clean
    plain = re.sub(r'#{1,6}\s+', '', plain)
    plain = re.sub(r'\*\*(.+?)\*\*', r'\1', plain)
    plain = re.sub(r'\*(.+?)\*', r'\1', plain)
    plain = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', plain)
    plain = re.sub(r'`(.+?)`', r'\1', plain)
    plain = re.sub(r'^[|>-].*$', '', plain, flags=re.MULTILINE)
    plain = re.sub(r'\n+', ' ', plain).strip()

    # First sentence as summary
    match = re.search(r'[^.!?]*[.!?]', plain)
    summary = match.group(0).strip()[:150] if match else (plain[:150] or None)
    if summary and len(summary) > 147:
        summary = summary[:147] + '...'

    # H2 headings as highlights
    h2s = re.findall(r'^##\s+(.+)$', content, re.MULTILINE)
    highlights = [h.strip()[:80] for h in h2s[:5]]

    return summary, highlights


def extract_plan_summary_and_highlights(content: str) -> tuple:
    """
    Extract summary and highlights from plan markdown.
    Summary comes from "## This Week's Focus" section.
    Highlights come from focus area bullet points.
    """
    if not content:
        return None, []

    # Find "## This Week's Focus" section
    summary = None
    focus_match = re.search(
        r"##\s+This Week'?s?\s+Focus[\s\S]*?\n([^\n#]+)",
        content,
        re.IGNORECASE | re.MULTILINE
    )
    if focus_match:
        summary = focus_match.group(1).strip()[:150]

    # Extract focus area bullets
    highlights = []
    in_focus = False
    for line in content.split('\n'):
        stripped = line.strip()
        if re.match(r'##\s+.*(?:focus|area)', stripped, re.IGNORECASE):
            in_focus = True
            continue
        if in_focus and re.match(r'##\s+', stripped):
            in_focus = False
        if in_focus and re.match(r'^[-*]\s+(.+)', stripped):
            highlights.append(re.sub(r'^[-*]\s+', '', stripped).strip()[:80])

    return summary, highlights[:5]



    SHEET_NAMES = {
        '00': 'Digital Presence Baseline',
        '01': 'Executive Summary',
        '02': 'Gap Analysis',
        '03': 'Competitor Analysis',
        '04': 'Twelve Week Plan',
        '05': 'Keyword Research',
        '06': 'Location Pages',
        '07': 'Citations & Backlinks',
        '08': 'YouTube Strategy',
        '09': 'Reddit & Quora',
        '10': 'Review Strategy',
        '11': 'Schema Markup',
        '12': 'Weekly Tasks',
        '13': 'KPIs & Metrics'
    }
    sheet_name = SHEET_NAMES.get(sheet_num, f'Sheet {sheet_num}')

    highlights = []

    if sheet_num == '03':  # Competitor Analysis
        # Find top competitors by extracting domain names from table
        domains = re.findall(r'\|\s*[^\|]+?\s*\|\s*(https?://)?([a-z0-9-]+\.[a-z]{2,}[^\s|]*)', content, re.IGNORECASE)
        for _, domain in domains[:3]:
            d = domain.strip().lower()
            if d and d != 'domain':
                highlights.append(f"Top competitor: {d}")
        highlights.append(f"{sheet_name} — competitive landscape analysis")
    elif sheet_num == '05':  # Keyword Research
        # Find highest-volume keywords
        vol_matches = re.findall(r'\|\s*([^\|]{3,40})\s*\|\s*[\d,.-]+\s*\|\s*(\d+)', content)
        vol_matches.sort(key=lambda x: int(x[1].replace(',', '')) if x[1].replace(',', '').isdigit() else 0, reverse=True)
        for kw, vol in vol_matches[:3]:
            kw = kw.strip()
            vol = vol.strip()
            if kw and vol:
                highlights.append(f"Top keyword: '{kw}' ({vol}/mo)")
        highlights.append(f"{sheet_name} — target keyword universe")
    elif sheet_num == '02':  # Gap Analysis
        # Find top-priority gaps
        gap_lines = re.findall(r'\|.*?(GAP-\d{3}).*?(CRITICAL|HIGH|MEDIUM).*?\|', content, re.IGNORECASE)
        for gap_id, priority in gap_lines[:3]:
            highlights.append(f"{gap_id}: {priority} priority")
        highlights.append(f"{sheet_name} — content & technical opportunities")
    elif sheet_num == '04':  # Twelve Week Plan
        # Find active/current phase
        phase_match = re.search(r'\*\*Current Phase\*\*:\s*(\w+)', content)
        week_match = re.search(r'\*\*Current Period\*\*:\s*(\S+)', content)
        if phase_match:
            highlights.append(f"Phase: {phase_match.group(1)}")
        if week_match:
            highlights.append(f"Period: {week_match.group(1)}")
        highlights.append(f"{sheet_name} — 12-week roadmap")
    elif sheet_num == '12':  # Weekly Tasks
        # Count task categories
        task_lines = re.findall(r'\|\s*[^\|]+?\s*\|[^|]*\|[^|]*\|[^|]*\|', content)
        highlights.append(f"{len(task_lines)-1} tasks across all categories")
        highlights.append(f"{sheet_name} — execution checklist")
    else:
        # Generic: use table row count as the highlight
        row_count = count_table_rows(content)
        if row_count > 0:
            highlights.append(f"{row_count} data rows analyzed")
        highlights.append(f"{sheet_name}")

    # Build summary
    summary = f"{sheet_name} for period — {len(highlights)} key findings"

    # Truncate highlights to max 80 chars each
    highlights = [h[:80] for h in highlights[:5]]

    return summary[:150], highlights


def generate_content_meta(md_path: Path) -> dict:
    """Generate metadata for content file."""
    content = md_path.read_text(encoding='utf-8')
    now = datetime.utcnow().isoformat() + 'Z'

    title = extract_title_from_md(content) or md_path.stem.replace('-', ' ')
    summary, highlights = extract_content_summary_and_highlights(content)

    # Infer type from content
    content_type = "blog-post"
    if "product" in title.lower():
        content_type = "product-page"
    elif "service" in title.lower():
        content_type = "service-page"
    elif "location" in title.lower() or "city" in title.lower():
        content_type = "location-page"
    elif "about" in title.lower():
        content_type = "landing-page"

    return {
        "title": title,
        "type": content_type,
        "status": md_path.parent.name,
        "word_count": count_words(content),
        "seo_score": None,
        "target_url": None,
        "author": None,
        "gap_id": None,
        "week_target": None,
        "priority": None,
        "keywords": [],
        "summary": summary,
        "highlights": highlights,
        "created_at": now,
        "updated_at": now,
        "published_at": None,
        "gate_status": "pending",
        "gate_notes": None
    }


def generate_sheet_meta(md_path: Path, period: str, generated_by: str = "meta-generator") -> dict:
    """Generate enriched metadata for report sheet by analyzing the actual content."""
    now = datetime.utcnow().isoformat() + 'Z'

    # Read content for hashing and analysis
    content = md_path.read_text(encoding='utf-8') if md_path.exists() else ''

    # Handle .md files vs .meta.json paths
    filename = md_path.name if md_path.name.endswith('.md') else md_path.stem.replace('.meta', '') + '.md'
    match = re.match(r'(\d+)-(.+)\.md', filename)
    sheet_num = int(match.group(1)) if match else 0
    sheet_num_str = f"{sheet_num:02d}"
    sheet_name_raw = match.group(2).replace('-', ' ').title() if match else md_path.stem
    sheet_id = f"{sheet_num_str}-{match.group(2)}" if match else md_path.stem

    # Sheet name mapping
    SHEET_NAMES = {
        '00': 'Digital Presence Baseline',
        '01': 'Executive Summary',
        '02': 'Gap Analysis',
        '03': 'Competitor Analysis',
        '04': 'Twelve Week Plan',
        '05': 'Keyword Research',
        '06': 'Location Pages',
        '07': 'Citations & Backlinks',
        '08': 'YouTube Strategy',
        '09': 'Reddit & Quora',
        '10': 'Review Strategy',
        '11': 'Schema Markup',
        '12': 'Weekly Tasks',
        '13': 'KPIs & Metrics'
    }

    sheet_name = SHEET_NAMES.get(sheet_num_str, sheet_name_raw)

    # ── Per-sheet count logic ─────────────────────────────────────────────────
    keywords_count = None
    competitors_analyzed = None
    gaps_identified = None
    tasks_generated = None

    if sheet_num_str == '03':  # Competitor Analysis
        competitors_analyzed = count_table_rows(content)
    elif sheet_num_str == '05':  # Keyword Research
        # Try keyword-specific counting first, then generic table rows
        keywords_count = count_keyword_rows(content)
        if keywords_count == 0:
            keywords_count = count_table_rows(content)
    elif sheet_num_str == '02':  # Gap Analysis
        gaps_identified = count_gap_refs(content)
    elif sheet_num_str == '04':  # Twelve Week Plan
        gaps_identified = count_gap_refs(content)
    elif sheet_num_str == '12':  # Weekly Tasks
        tasks_generated = count_table_rows(content)
    else:
        # Also try to extract counts from any other table in the content
        generic_rows = count_table_rows(content)
        if generic_rows > 0:
            keywords_count = generic_rows

    # ── Extract summary and highlights ─────────────────────────────────────────
    summary, highlights = extract_summary_and_highlights(content, sheet_num_str)

    return {
        "sheet_number": sheet_num,
        "sheet_name": sheet_name,
        "sheet_id": sheet_id,
        "period": period,
        "content_hash": content_hash(content) if content else None,
        "generated_at": now,
        "generated_by": generated_by,
        "validation_status": "pending",
        "validation_errors": None,
        "summary": summary,
        "highlights": highlights,
        "keywords_count": keywords_count,
        "competitors_analyzed": competitors_analyzed,
        "gaps_identified": gaps_identified,
        "tasks_generated": tasks_generated,
        "data_sources": extract_data_sources(content),
        "linked_sheets": extract_linked_sheets(content, sheet_num_str),
        "created_at": now,
        "updated_at": now
    }


def generate_plan_meta(md_path: Path) -> dict:
    """Generate metadata for weekly plan."""
    now = datetime.utcnow().isoformat() + 'Z'

    content = ''
    try:
        content = md_path.read_text(encoding='utf-8')
    except Exception:
        pass

    week_match = re.match(r'(\d{4})-W(\d{2})', md_path.stem)
    if week_match:
        year, week = week_match.groups()
        week_start = f"{year}-W{week}-01"
    else:
        week_start = None

    summary, highlights = extract_plan_summary_and_highlights(content)

    return {
        "week": md_path.stem,
        "week_start": week_start,
        "week_end": None,
        "status": "active",
        "total_tasks": 0,
        "completed_tasks": 0,
        "pending_tasks": 0,
        "blocked_tasks": 0,
        "in_progress_tasks": 0,
        "focus_areas": [],
        "gaps_addressed": [],
        "priority_tasks": [],
        "summary": summary,
        "highlights": highlights,
        "notes": None,
        "created_at": now,
        "updated_at": now
    }


def generate_about_meta(md_path: Path) -> dict:
    """Generate metadata for about files."""
    now = datetime.utcnow().isoformat() + 'Z'

    # Infer category from filename
    filename = md_path.stem.lower()
    category = "general"
    if "brand" in filename or "voice" in filename:
        category = "brand-voice"
    elif "audience" in filename:
        category = "audience"
    elif "competitor" in filename:
        category = "competitors"
    elif "keyword" in filename:
        category = "keywords"
    elif "goal" in filename:
        category = "goals"
    elif "scope" in filename:
        category = "scope"
    elif "profile" in filename:
        category = "profile"
    elif "access" in filename:
        category = "access"

    return {
        "category": category,
        "last_reviewed": None,
        "review_status": "pending",
        "linked_sheets": [],
        "version": 1,
        "author": None,
        "created_at": now,
        "updated_at": now
    }


def generate_review_meta(md_path: Path) -> dict:
    """Generate metadata for review files."""
    now = datetime.utcnow().isoformat() + 'Z'

    filename = md_path.stem.lower()
    review_type = "general-review"
    if "technical" in filename:
        review_type = "technical-review"
    elif "on-page" in filename or "onpage" in filename:
        review_type = "on-page-review"
    elif "schema" in filename:
        review_type = "schema-review"
    elif "content" in filename:
        review_type = "content-review"

    return {
        "review_type": review_type,
        "target_url": None,
        "status": "pending",
        "score": None,
        "issues_found": 0,
        "issues_resolved": 0,
        "reviewer": None,
        "target_item": None,
        "summary": None,
        "highlights": [],
        "humanReadableSummary": None,
        "human_decision": None,
        "human_comment": None,
        "human_reviewer": None,
        "human_decision_at": None,
        "created_at": now,
        "updated_at": now
    }


def ensure_meta_for_company(company_slug: str):
    """Ensure all content files have metadata."""
    company_path = COMPANY_DIR / company_slug

    if not company_path.exists():
        print(f"Company not found: {company_slug}")
        return False

    created_count = 0

    # Content files
    content_dir = company_path / "content"
    if content_dir.exists():
        for status_dir in content_dir.iterdir():
            if status_dir.is_dir():
                for md_file in status_dir.glob("*.md"):
                    meta_file = md_file.with_suffix('.meta.json')
                    if not meta_file.exists():
                        meta = generate_content_meta(md_file)
                        meta_file.write_text(json.dumps(meta, indent=2), encoding='utf-8')
                        print(f"Created: {meta_file}")
                        created_count += 1

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
                            meta_file.write_text(json.dumps(meta, indent=2), encoding='utf-8')
                            print(f"Created: {meta_file}")
                            created_count += 1

    # Plans - active
    plans_active_dir = company_path / "plans" / "active"
    if plans_active_dir.exists():
        for md_file in plans_active_dir.glob("*.md"):
            meta_file = md_file.with_suffix('.meta.json')
            if not meta_file.exists():
                meta = generate_plan_meta(md_file)
                meta_file.write_text(json.dumps(meta, indent=2), encoding='utf-8')
                print(f"Created: {meta_file}")
                created_count += 1

    # Plans - archive
    plans_archive_dir = company_path / "plans" / "archive"
    if plans_archive_dir.exists():
        for md_file in plans_archive_dir.glob("*.md"):
            meta_file = md_file.with_suffix('.meta.json')
            if not meta_file.exists():
                meta = generate_plan_meta(md_file)
                meta['status'] = 'archived'
                meta_file.write_text(json.dumps(meta, indent=2), encoding='utf-8')
                print(f"Created: {meta_file}")
                created_count += 1

    # About files
    about_dir = company_path / "about"
    if about_dir.exists():
        for md_file in about_dir.glob("*.md"):
            if md_file.stat().st_size > 0:  # Skip empty files
                meta_file = md_file.with_suffix('.meta.json')
                if not meta_file.exists():
                    meta = generate_about_meta(md_file)
                    meta_file.write_text(json.dumps(meta, indent=2), encoding='utf-8')
                    print(f"Created: {meta_file}")
                    created_count += 1

    # Reviews
    reviews_dir = company_path / "reviews"
    if reviews_dir.exists():
        for md_file in reviews_dir.glob("*.md"):
            if md_file.stat().st_size > 0:
                meta_file = md_file.with_suffix('.meta.json')
                if not meta_file.exists():
                    meta = generate_review_meta(md_file)
                    meta_file.write_text(json.dumps(meta, indent=2), encoding='utf-8')
                    print(f"Created: {meta_file}")
                    created_count += 1

    return created_count


def enrich_all_meta(company_slug: str, generated_by: str = None) -> int:
    """Re-analyze all existing .meta.json files for a company and update with fresh counts."""
    company_path = COMPANY_DIR / company_slug

    if not company_path.exists():
        print(f"Company not found: {company_slug}")
        return 0

    updated = 0

    # Walk all .meta.json files in reports/
    reports_dir = company_path / "reports"
    if reports_dir.exists():
        for period_dir in reports_dir.iterdir():
            if period_dir.is_dir():
                sheets_dir = period_dir / "sheets"
                if sheets_dir.exists():
                    for md_file in sheets_dir.glob("*.md"):
                        meta_file = md_file.with_suffix('.meta.json')
                        period = period_dir.name

                        # Read existing meta to preserve provenance
                        existing_meta = {}
                        if meta_file.exists():
                            try:
                                existing_meta = json.loads(meta_file.read_text(encoding='utf-8'))
                            except:
                                pass

                        # Build fresh meta from the actual sheet content
                        # Use existing generated_by if present, else caller-supplied, else 'meta-generator'
                        caller = existing_meta.get('generated_by') or generated_by or 'meta-generator'
                        fresh_meta = generate_sheet_meta(md_file, period, generated_by=caller)

                        # Preserve: created_at, generated_at (original), validation_status, validation_errors
                        fresh_meta['created_at'] = existing_meta.get('created_at', fresh_meta['created_at'])
                        fresh_meta['generated_at'] = existing_meta.get('generated_at', fresh_meta['generated_at'])
                        fresh_meta['validation_status'] = existing_meta.get('validation_status', 'pending')
                        fresh_meta['validation_errors'] = existing_meta.get('validation_errors')

                        meta_file.write_text(json.dumps(fresh_meta, indent=2), encoding='utf-8')
                        print(f"Enriched: {meta_file.relative_to(company_path)}")
                        updated += 1

    return updated


def ensure_folders_exist(company_slug: str):
    """Ensure all required folders exist for a company."""
    company_path = COMPANY_DIR / company_slug

    if not company_path.exists():
        print(f"Company not found: {company_slug}")
        return False

    # Content folders
    content_dir = company_path / "content"
    for status in ['pending-publish', 'in-review', 'approved', 'published', 'rejected']:
        folder = content_dir / status
        folder.mkdir(exist_ok=True)

    # Plans folders
    plans_dir = company_path / "plans"
    (plans_dir / "active").mkdir(exist_ok=True)
    (plans_dir / "archive").mkdir(exist_ok=True)

    # Technical folders
    technical_dir = company_path / "technical"
    (technical_dir / "audits").mkdir(exist_ok=True)

    print(f"Ensured folder structure for: {company_slug}")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python meta-generator.py <company-slug>                      # Create metadata for missing files")
        print("  python meta-generator.py <company-slug> --enrich              # Re-analyze and update all .meta.json")
        print("  python meta-generator.py <company-slug> --enrich --caller research-analyst  # With provenance")
        print("  python meta-generator.py <company-slug> --folders            # Create folder structure only")
        sys.exit(1)

    company_slug = sys.argv[1]

    # Parse --caller flag for provenance tracking
    generated_by = None
    if "--caller" in sys.argv:
        idx = sys.argv.index("--caller")
        if len(sys.argv) > idx + 1:
            generated_by = sys.argv[idx + 1]

    if "--folders" in sys.argv:
        ensure_folders_exist(company_slug)
    elif "--enrich" in sys.argv:
        count = enrich_all_meta(company_slug, generated_by=generated_by)
        print(f"\nDone! Enriched {count} metadata files.")
    else:
        count = ensure_meta_for_company(company_slug)
        print(f"\nDone! Created {count} metadata files.")
