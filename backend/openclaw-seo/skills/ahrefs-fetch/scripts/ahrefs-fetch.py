#!/usr/bin/env python3
import sys
import os
import json
import urllib.request
import urllib.error

def fetch_ahrefs_metrics(target):
    api_key = os.environ.get('AHREFS_API_KEY')
    if not api_key:
        print(json.dumps({
            "error": "AHREFS_API_KEY missing from environment",
            "domain": target,
            "dr": None,
            "traffic": None
        }))
        return

    # Ahrefs API v3 endpoint for domain/url metrics
    url = f"https://api.ahrefs.com/v3/site-explorer/metrics?target={target}&mode=subdomains"
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {api_key}',
        'Accept': 'application/json'
    })

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            metrics = data.get('metrics', {})
            print(json.dumps({
                "domain": target,
                "dr": metrics.get('domain_rating', 0),
                "ur": metrics.get('url_rating', 0),
                "backlinks": metrics.get('backlinks', 0),
                "traffic": metrics.get('org_traffic', 0)
            }, indent=2))
    except urllib.error.HTTPError as e:
        print(json.dumps({
            "error": f"API HTTP Error: {e.code}",
            "domain": target,
            "dr": None,
            "traffic": None
        }))
    except Exception as e:
        print(json.dumps({
            "error": f"Unexpected Error: {str(e)}",
            "domain": target,
            "dr": None,
            "traffic": None
        }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing target domain argument."}))
        sys.exit(1)
    
    target_domain = sys.argv[1]
    fetch_ahrefs_metrics(target_domain)
