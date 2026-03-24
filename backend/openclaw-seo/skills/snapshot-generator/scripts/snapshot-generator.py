#!/usr/bin/env python3
"""
SNAPSHOT GENERATOR SKILL — Real Implementation
Fetches live data from GA4 and GSC, computes week-over-week deltas, saves JSON snapshot.
Requires: pip install google-api-python-client google-auth google-analytics-data python-dotenv
"""

import sys
import json
import os
import glob
from datetime import datetime, timedelta, timezone

try:
    from dotenv import load_dotenv
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        RunReportRequest, DateRange, Metric, Dimension, FilterExpression,
        Filter
    )
except Exception as e:
    print(f"[snapshot-generator] ERROR: Missing dependencies or import failed: {e}")
    sys.exit(1)


def load_env(company_slug: str):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '..', '..', '..', 'companies', company_slug, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()


def build_credentials(sa_json_env: str):
    """Build Google credentials from service account JSON (path or inline string)."""
    sa_value = sa_json_env.strip()
    try:
        sa_info = json.loads(sa_value)
    except json.JSONDecodeError:
        with open(sa_value, 'r') as f:
            sa_info = json.load(f)
    scopes = [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/analytics.readonly'
    ]
    return service_account.Credentials.from_service_account_info(sa_info, scopes=scopes)


def fetch_ga4(property_id: str, credentials, days: int = 7) -> dict:
    """Fetch organic session metrics from GA4 Data API."""
    print(f"[snapshot-generator] Fetching GA4 organics (last {days}d)...")
    client = BetaAnalyticsDataClient(credentials=credentials)

    request = RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
        metrics=[
            Metric(name="sessions"),
            Metric(name="engagementRate"),
            Metric(name="averageSessionDuration"),
            Metric(name="conversions"),
            Metric(name="screenPageViews"),
        ],
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        dimension_filter=FilterExpression(
            filter=Filter(
                field_name="sessionDefaultChannelGroup",
                string_filter=StringFilter(value="Organic Search")
            )
        )
    )
    response = client.run_report(request)

    organic_sessions = 0
    engagement_rate = 0.0
    avg_duration = 0.0
    conversions = 0

    for row in response.rows:
        organic_sessions = int(row.metric_values[0].value or 0)
        engagement_rate = float(row.metric_values[1].value or 0)
        avg_duration = float(row.metric_values[2].value or 0)
        conversions = int(row.metric_values[3].value or 0)

    # Top pages by organic sessions
    page_request = RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
        metrics=[Metric(name="sessions"), Metric(name="engagementRate")],
        dimensions=[Dimension(name="landingPage"), Dimension(name="sessionDefaultChannelGroup")],
        dimension_filter=FilterExpression(
            filter=Filter(
                field_name="sessionDefaultChannelGroup",
                string_filter=Filter.StringFilter(value="Organic Search")
            )
        ),
        limit=10,
        order_bys=[{"metric": {"metric_name": "sessions"}, "desc": True}]
    )
    page_resp = client.run_report(page_request)
    top_pages = [
        {"pagePath": r.dimension_values[0].value,
         "organicSessions": int(r.metric_values[0].value or 0),
         "engagementRate": round(float(r.metric_values[1].value or 0), 3)}
        for r in page_resp.rows
    ]

    return {
        "organicSessions": organic_sessions,
        "engagementRate": round(engagement_rate, 3),
        "averageSessionDurationSec": round(avg_duration, 1),
        "conversions": conversions,
        "topPages": top_pages
    }


def fetch_gsc(site_url: str, credentials, days: int = 7) -> dict:
    """Fetch query performance data from Google Search Console."""
    print(f"[snapshot-generator] Fetching GSC queries (last {days}d)...")
    service = build('searchconsole', 'v1', credentials=credentials)

    end_date = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')  # GSC has 3-day lag
    start_date = (datetime.now() - timedelta(days=days + 3)).strftime('%Y-%m-%d')

    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": ["query"],
        "rowLimit": 25000,
        "startRow": 0
    }
    response = service.searchanalytics().query(siteUrl=site_url, body=body).execute()
    rows = response.get("rows", [])

    total_clicks = sum(r.get("clicks", 0) for r in rows)
    total_impressions = sum(r.get("impressions", 0) for r in rows)
    avg_ctr = total_clicks / total_impressions if total_impressions > 0 else 0
    avg_position = (sum(r.get("position", 0) for r in rows) / len(rows)) if rows else 0

    top_queries = sorted(rows, key=lambda x: x.get("clicks", 0), reverse=True)[:20]
    top_queries_clean = [
        {
            "query": r["keys"][0],
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr": round(r.get("ctr", 0), 4),
            "position": round(r.get("position", 0), 1)
        }
        for r in top_queries
    ]

    return {
        "totalClicks": total_clicks,
        "totalImpressions": total_impressions,
        "avgCTR": round(avg_ctr, 4),
        "avgPosition": round(avg_position, 2),
        "topQueries": top_queries_clean,
        "queryCount": len(rows)
    }


def compute_delta(current: dict, previous: dict) -> dict:
    """Compare current snapshot values against a previous snapshot."""
    if not previous:
        return {"previousSnapshotFile": None, "note": "No previous snapshot found — baseline established."}

    curr_ga4 = current.get("ga4", {})
    prev_ga4 = previous.get("ga4", {})
    curr_gsc = current.get("gsc", {})
    prev_gsc = previous.get("gsc", {})

    organic_change = curr_ga4.get("organicSessions", 0) - prev_ga4.get("organicSessions", 0)
    organic_pct = (organic_change / prev_ga4["organicSessions"] * 100) if prev_ga4.get("organicSessions") else 0

    curr_queries = {q["query"] for q in curr_gsc.get("topQueries", [])}
    prev_queries = {q["query"] for q in prev_gsc.get("topQueries", [])}

    return {
        "previousSnapshotFile": previous.get("_file"),
        "organicSessionsChange": organic_change,
        "organicSessionsChangePct": f"{'+' if organic_pct >= 0 else ''}{organic_pct:.1f}%",
        "avgPositionChange": round(curr_gsc.get("avgPosition", 0) - prev_gsc.get("avgPosition", 0), 2),
        "totalClicksChange": curr_gsc.get("totalClicks", 0) - prev_gsc.get("totalClicks", 0),
        "gainedKeywords": list(curr_queries - prev_queries)[:10],
        "droppedKeywords": list(prev_queries - curr_queries)[:10],
    }


def load_previous_snapshot(mem_dir: str) -> dict | None:
    """Load the most recent snapshot JSON from the snapshots directory."""
    pattern = os.path.join(mem_dir, 'snapshot-*.json')
    files = sorted(glob.glob(pattern), reverse=True)
    if not files:
        return None
    with open(files[0], 'r', encoding='utf-8') as f:
        data = json.load(f)
        data['_file'] = os.path.basename(files[0])
        return data


def trigger_snapshot(company_slug: str, days: int = 7) -> dict:
    print(f"[snapshot-generator] Starting snapshot for: {company_slug} (days={days})")

    load_env(company_slug)

    sa_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    property_id = os.getenv("GA4_PROPERTY_ID")
    site_url = os.getenv("GSC_SITE_URL")

    if not sa_json:
        print("[snapshot-generator] ERROR: GOOGLE_SERVICE_ACCOUNT_JSON not set in .env")
        sys.exit(1)
    if not property_id:
        print("[snapshot-generator] ERROR: GA4_PROPERTY_ID not set in .env")
        sys.exit(1)
    if not site_url:
        print("[snapshot-generator] ERROR: GSC_SITE_URL not set in .env")
        sys.exit(1)

    credentials = build_credentials(sa_json)

    ga4_data = fetch_ga4(property_id, credentials, days)
    gsc_data = fetch_gsc(site_url, credentials, days)

    now = datetime.now(timezone.utc)
    snapshot = {
        "generated_at": now.isoformat(),
        "company": company_slug,
        "period": {
            "start": (now - timedelta(days=days)).strftime('%Y-%m-%d'),
            "end": now.strftime('%Y-%m-%d'),
            "days": days
        },
        "ga4": ga4_data,
        "gsc": gsc_data,
    }

    # Save snapshot first before delta (delta needs the file saved)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mem_dir = os.path.join(script_dir, '..', '..', '..', 'companies', company_slug, 'memory', 'snapshots')
    os.makedirs(mem_dir, exist_ok=True)

    # Load previous snapshot for delta computation
    previous = load_previous_snapshot(mem_dir)
    snapshot["delta"] = compute_delta(snapshot, previous)

    ts_ms = int(now.timestamp() * 1000)
    file_name = f"snapshot-{ts_ms}.json"
    out_file = os.path.join(mem_dir, file_name)

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, indent=4, ensure_ascii=False)

    print(f"[snapshot-generator] SUCCESS: Snapshot saved → {file_name}")
    print(f"[snapshot-generator] Organic sessions: {ga4_data['organicSessions']} | "
          f"GSC clicks: {gsc_data['totalClicks']} | "
          f"Avg position: {gsc_data['avgPosition']}")

    return snapshot


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        slug = sys.argv[1]
        d = 7
        for arg in sys.argv[2:]:
            if arg.startswith("--days="):
                d = int(arg.split("=")[1])
        result = trigger_snapshot(slug, d)
        summary = {
            "generated_at": result["generated_at"],
            "company": result["company"],
            "ga4_organicSessions": result["ga4"]["organicSessions"],
            "gsc_totalClicks": result["gsc"]["totalClicks"],
            "gsc_avgPosition": result["gsc"]["avgPosition"],
            "delta_organicChange": result["delta"].get("organicSessionsChangePct"),
        }
        print(json.dumps(summary, indent=2))
    else:
        print("Usage: python3 snapshot-generator.py <company_slug> [--days=7]")
