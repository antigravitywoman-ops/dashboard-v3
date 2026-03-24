#!/usr/bin/env node

/**
 * BROKEN LINK SCANNER SKILL
 * Scans a target URL for <a> tags and independently verifies their HTTP status.
 */

const https = require('https');
const http = require('http');

async function fetchPage(urlStr) {
    return new Promise((resolve) => {
        const client = urlStr.startsWith('https') ? https : http;
        client.get(urlStr, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return resolve({ html: null, error: `HTTP ${res.statusCode}` });
                }
                resolve({ html: data, error: null });
            });
        }).on('error', e => resolve({ html: null, error: e.message }));
    });
}

async function checkLink(urlStr) {
    return new Promise((resolve) => {
        let parsed;
        try {
            parsed = new URL(urlStr);
        } catch (e) {
            return resolve({ url: urlStr, status: 0, ok: false, error: 'Invalid URL formulation' });
        }
        
        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.request(urlStr, { method: 'HEAD', timeout: 5000 }, (res) => {
            resolve({
                url: urlStr,
                status: res.statusCode,
                ok: res.statusCode >= 200 && res.statusCode < 400
            });
        });
        
        req.on('timeout', () => { req.destroy(); resolve({ url: urlStr, status: 0, ok: false, error: 'Timeout' }); });
        req.on('error', e => resolve({ url: urlStr, status: 0, ok: false, error: e.message }));
        req.end();
    });
}

function extractLinks(html, baseUrl) {
    const rawLinks = [];
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
        rawLinks.push(match[1]);
    }
    
    const uniqueLinks = [...new Set(rawLinks)].filter(l => !l.startsWith('mailto:') && !l.startsWith('tel:') && !l.startsWith('#'));
    
    return uniqueLinks.map(l => {
        if (l.startsWith('http')) return l;
        try {
            return new URL(l, baseUrl).href;
        } catch (e) {
            return null;
        }
    }).filter(Boolean);
}

async function scan(targetUrl) {
    const pageObj = await fetchPage(targetUrl);
    if (pageObj.error) {
        return { target: targetUrl, status: "error", error: pageObj.error };
    }
    
    const links = extractLinks(pageObj.html, targetUrl);
    const results = [];
    
    // Process in small batches to respect rate limits / CPU blocking
    const BATCH_SIZE = 10;
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
        const batch = links.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(checkLink));
        results.push(...batchResults);
    }
    
    const broken = results.filter(r => !r.ok);
    const valid = results.filter(r => r.ok);
    
    return {
        target: targetUrl,
        status: "success",
        total_found: links.length,
        broken_count: broken.length,
        valid_count: valid.length,
        broken_links: broken
    };
}

(async () => {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log(JSON.stringify({ error: "Usage: node broken-link-scanner.js <target_url>" }));
        process.exit(1);
    }

    const targetUrl = args[0];
    const data = await scan(targetUrl);
    console.log(JSON.stringify(data, null, 2));
})();
