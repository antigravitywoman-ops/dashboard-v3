#!/usr/bin/env node

/**
 * ROBOTS AUDITOR SKILL
 * Fetches and parses robots.txt for a given domain/URL.
 */

const https = require('https');
const http = require('http');
const url = require('url');

function fetchRobots(target) {
    return new Promise((resolve) => {
        let parsedUrl;
        try {
            parsedUrl = new URL(target.startsWith('http') ? target : `https://${target}`);
        } catch (e) {
            return resolve({ target, status: "error", error: "Invalid URL string provided." });
        }

        const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
        const client = robotsUrl.startsWith('https') ? https : http;

        client.get(robotsUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return resolve({
                        target: robotsUrl,
                        status: "error",
                        error: `HTTP Error ${res.statusCode}`
                    });
                }
                
                const lines = data.split('\n').map(l => l.trim().toLowerCase()).filter(l => l.length > 0 && !l.startsWith('#'));
                let userAgents = {};
                let sitemaps = [];
                let currentAgent = null;

                for (let line of lines) {
                    if (line.startsWith('user-agent:')) {
                        currentAgent = line.substring(11).trim();
                        if (!userAgents[currentAgent]) {
                            userAgents[currentAgent] = { allow: [], disallow: [] };
                        }
                    } else if (line.startsWith('allow:') && currentAgent) {
                        userAgents[currentAgent].allow.push(line.substring(6).trim());
                    } else if (line.startsWith('disallow:') && currentAgent) {
                        userAgents[currentAgent].disallow.push(line.substring(9).trim());
                    } else if (line.startsWith('sitemap:')) {
                        sitemaps.push(line.substring(8).trim());
                    }
                }

                // Check specifically if the target path is blocked by '*' or 'googlebot'
                const targetPath = parsedUrl.pathname + parsedUrl.search;
                let isBlocked = false;
                
                const activeAgents = [userAgents['*'], userAgents['googlebot']].filter(Boolean);
                for (const agent of activeAgents) {
                    for (const block of agent.disallow) {
                        if (block === '/' || (block.length > 1 && targetPath.startsWith(block))) {
                            isBlocked = true;
                        }
                    }
                }

                resolve({
                    target: target,
                    status: "success",
                    robots_url: robotsUrl,
                    is_target_path_blocked: isBlocked,
                    sitemap_count: sitemaps.length,
                    sitemaps: sitemaps,
                    rules: userAgents
                });
            });
        }).on('error', e => resolve({ target: robotsUrl, status: "error", error: e.message }));
    });
}

(async () => {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log(JSON.stringify({ error: "Usage: node robots-auditor.js <target_url>" }));
        process.exit(1);
    }

    const result = await fetchRobots(args[0]);
    console.log(JSON.stringify(result, null, 2));
})();
