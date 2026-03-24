#!/usr/bin/env python3
"""
DATA RESEARCHER SKILL
Hits the Serper.dev API to find specific statistical claims or factual backing
so content-writer can remove [CITE] placeholders.
"""

import sys
import json
import os
import argparse
import requests
from datetime import datetime

def search_facts(company_slug, query):
    env_path = os.path.join(os.getcwd(), 'companies', company_slug, '.env')
    api_key = os.environ.get('SERPER_API_KEY')
    
    if not api_key and os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('SERPER_API_KEY='):
                    api_key = line.split('=', 1)[1].strip().strip('\'"')
                    
    if not api_key:
        return {
            "query": query,
            "error": "SERPER_API_KEY not found in environment or company .env."
        }
        
    url = "https://google.serper.dev/search"
    payload = json.dumps({
        "q": query,
        "num": 5
    })
    headers = {
        'X-API-KEY': api_key,
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        # Look for featured snippet first
        if 'answerBox' in data and data['answerBox'].get('answer') or data['answerBox'].get('snippet'):
            ans = data['answerBox']
            results.append({
                "source": "Featured Snippet",
                "title": ans.get("title", "Direct Answer"),
                "claim": ans.get("answer") or ans.get("snippet"),
                "url": ans.get("link", "")
            })
            
        # Add top organic results
        for org in data.get('organic', [])[:3]:
            # Don't duplicate the featured snippet if it's the exact same URL
            if results and results[0]['url'] == org.get('link'):
                continue
            results.append({
                "source": "Organic Search",
                "title": org.get("title"),
                "claim": org.get("snippet"),
                "url": org.get("link")
            })
            
        return {
            "query": query,
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "results": results[:3] # Cap at 3 strong citations
        }
        
    except Exception as e:
        return {
            "query": query,
            "error": str(e)
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Data Researcher Skill")
    parser.add_argument("company_slug", help="Company slug to locate environment variables")
    parser.add_argument("--query", required=True, help="Highly specific search query to retrieve factual claims")
    
    args = parser.parse_args()
    
    output = search_facts(args.company_slug, args.query)
    print(json.dumps(output, indent=2))
