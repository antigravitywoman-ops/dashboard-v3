#!/usr/bin/env node

/**
 * INDEX CHECKER SKILL
 * Integrates with Google Search Console URL Inspection API
 * Requires GCP service account JSON credentials with access to the site.
 */

const https = require('https');
const fs = require('fs');

async function getAccessToken(credentialsPath) {
    // In a real environment, this invokes google-auth-library
    // Since we don't want to break if the lib is missing during this test, 
    // we assume a bearer token might be passed or we simulate the behavior 
    // for the sake of the orchestrator architecture if key not present.
    try {
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        return token.token;
    } catch (e) {
        return null;
    }
}

async function inspectUrl(targetUrl, siteUrl, token) {
    if (!token) {
        return {
            url: targetUrl,
            error: "No valid Google auth token generated. Ensure GOOGLE_SERVICE_ACCOUNT_JSON is set and google-auth-library is installed.",
            status: "unknown"
        };
    }

    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            inspectionUrl: targetUrl,
            siteUrl: siteUrl,
            languageCode: "en-US"
        });

        const options = {
            hostname: 'searchconsole.googleapis.com',
            port: 443,
            path: '/v1/urlInspection/index:inspect',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    try {
                        const err = JSON.parse(data);
                        return resolve({ url: targetUrl, status: "error", error: err.error?.message || `HTTP ${res.statusCode}` });
                    } catch(e) {
                        return resolve({ url: targetUrl, status: "error", error: `HTTP ${res.statusCode}` });
                    }
                }
                
                try {
                    const parsed = JSON.parse(data);
                    const result = parsed.inspectionResult?.indexStatusResult || {};
                    
                    resolve({
                        url: targetUrl,
                        status: result.coverageState?.includes('Indexed') ? 'indexed' : 'not-indexed',
                        coverage_state: result.coverageState,
                        last_crawl: result.lastCrawlTime,
                        google_canonical: result.googleCanonical,
                        user_canonical: result.userCanonical,
                        is_mobile_friendly: parsed.inspectionResult?.mobileUsabilityResult?.verdict === 'PASS'
                    });
                } catch(e) {
                    resolve({ url: targetUrl, status: "error", error: `Parse Error: ${e.message}` });
                }
            });
        });

        req.on('error', e => resolve({ url: targetUrl, status: "error", error: e.message }));
        req.write(payload);
        req.end();
    });
}

(async () => {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(JSON.stringify({ error: "Usage: node index-checker.js <company-slug> --url=<url>" }));
        process.exit(1);
    }

    const companySlug = args[0];
    const urlArg = args.find(a => a.startsWith('--url='));
    
    if (!urlArg) {
        console.log(JSON.stringify({ error: "Missing --url=<url> argument." }));
        process.exit(1);
    }
    const targetUrl = urlArg.split('=').slice(1).join('=');
    
    // Check local env or fallback to a standard location
    const path = require('path');
    const envPath = path.join(process.cwd(), 'companies', companySlug, '.env');
    let credPath = null;
    let siteUrl = null;
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const credMatch = envContent.match(/^GOOGLE_SERVICE_ACCOUNT_JSON=(.*)$/m);
        if (credMatch) credPath = credMatch[1].trim().replace(/['"]/g, '');
        
        const siteUrlMatch = envContent.match(/^GSC_SITE_URL=(.*)$/m);
        if (siteUrlMatch) siteUrl = siteUrlMatch[1].trim().replace(/['"]/g, '');
    }
    
    credPath = credPath || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null;
    siteUrl = siteUrl || process.env.GSC_SITE_URL || targetUrl; // Fallback to targetUrl if unknown
    
    if (!credPath) {
        console.log(JSON.stringify({
            url: targetUrl,
            status: "error",
            error: "GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set in company .env."
        }, null, 2));
        process.exit(0);
    }
    
    const token = await getAccessToken(credPath);
    const result = await inspectUrl(targetUrl, siteUrl, token);
    
    console.log(JSON.stringify(result, null, 2));
})();
