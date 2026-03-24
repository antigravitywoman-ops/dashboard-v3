#!/usr/bin/env python3
"""
SERPER MINER SKILL — Real Implementation
Hits the Serper.dev API to pull live Top 10 organic results for a target keyword.
Requires: pip install requests python-dotenv
"""

import sys
import json
import time
import os
import re
from datetime import datetime, timezone

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("[serper-miner] ERROR: Missing dependencies. Run: pip install requests python-dotenv")
    sys.exit(1)


def load_env(company_slug: str):
    """Load company-level .env file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '..', '..', '..', 'companies', company_slug, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()  # fallback to local .env


def mine_serps(keyword: str, company_slug: str, gl: str = "us", hl: str = "en") -> dict:
    print(f"[serper-miner] Initiating live SERP extraction for: {company_slug}")
    print(f"[serper-miner] Keyword: \"{keyword}\" | geo={gl} | lang={hl}")

    load_env(company_slug)
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        print("[serper-miner] ERROR: SERPER_API_KEY not found in .env")
        sys.exit(1)

    payload = {"q": keyword, "gl": gl, "hl": hl, "num": 10, "type": "search"}
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}

    print(f"[serper-miner] Hitting https://google.serper.dev/search ...")
    resp = requests.post(
        "https://google.serper.dev/search",
        headers=headers,
        json=payload,
        timeout=15
    )
    resp.raise_for_status()
    raw = resp.json()

    print(f"[serper-miner] Response OK — parsing organic results...")

    organic = []
    for item in raw.get("organic", []):
        organic.append({
            "position": item.get("position"),
            "title": item.get("title"),
            "url": item.get("link"),
            "domain": item.get("link", "").split("/")[2] if item.get("link") else "",
            "snippet": item.get("snippet"),
            "date": item.get("date"),
        })

    paa = [{"question": p.get("question"), "link": p.get("link")} for p in raw.get("peopleAlsoAsk", [])]
    related = [r.get("query") for r in raw.get("relatedSearches", [])]

    result = {
        "keyword": keyword,
        "geo": gl,
        "scannedAt": datetime.now(timezone.utc).isoformat(),
        "organicResults": organic,
        "peopleAlsoAsk": paa,
        "relatedSearches": related,
    }

    # Persist to memory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mem_dir = os.path.join(script_dir, '..', '..', '..', 'companies', company_slug, 'memory', 'competitors')
    os.makedirs(mem_dir, exist_ok=True)

    safe_kw = re.sub(r'[^a-zA-Z0-9]', '_', keyword)
    ts = int(time.time())
    file_name = f"serp-{safe_kw}-{ts}.json"
    out_file = os.path.join(mem_dir, file_name)

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=4, ensure_ascii=False)

    print(f"[serper-miner] {len(organic)} competitors extracted. Saved: {file_name}")
    return result


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        kw = sys.argv[1]
        slug = sys.argv[2]
        geo = "us"
        for arg in sys.argv[3:]:
            if arg.startswith("--gl="):
                geo = arg.split("=")[1]
        result = mine_serps(kw, slug, gl=geo)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print('Usage: python3 serper-miner.py "<keyword>" <company_slug> [--gl=us]')
