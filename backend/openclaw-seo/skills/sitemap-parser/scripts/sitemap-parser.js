#!/usr/bin/env node

/**
 * SITEMAP PARSER SKILL
 * Fetches and parses XML sitemaps or sitemap indexes.
 * Extracts `<loc>`, `<lastmod>`, `<priority>`, `<changefreq>`.
 */

const https = require('https');
const http = require('http');

async function fetchSitemap(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return resolve({
                        target: url,
                        status: "error",
                        error: `HTTP Error ${res.statusCode}`
                    });
                }
                
                const urls = [];
                const sitemaps = [];
                
                // Extremely simple regex for well-formed standard XML Sitemaps
                // Avoids bringing in heavy XML-parser libraries
                
                const urlMatch = data.matchAll(/<url>([\s\S]*?)<\/url>/gi);
                for (const match of urlMatch) {
                    const block = match[1];
                    const loc = block.match(/<loc>(.*?)<\/loc>/i)?.[1] || null;
                    const lastmod = block.match(/<lastmod>(.*?)<\/lastmod>/i)?.[1] || null;
                    const priority = block.match(/<priority>(.*?)<\/priority>/i)?.[1] || null;
                    const changefreq = block.match(/<changefreq>(.*?)<\/changefreq>/i)?.[1] || null;
                    if (loc) {
                        urls.push({ loc, lastmod, priority, changefreq });
                    }
                }
                
                const sitemapMatch = data.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/gi);
                for (const match of sitemapMatch) {
                    const block = match[1];
                    const loc = block.match(/<loc>(.*?)<\/loc>/i)?.[1] || null;
                    if (loc) {
                        sitemaps.push(loc);
                    }
                }
                
                resolve({
                    target: url,
                    status: "success",
                    type: sitemaps.length > 0 ? "sitemap-index" : "urlset",
                    url_count: urls.length,
                    sitemap_count: sitemaps.length,
                    sitemaps: sitemaps,
                    urls: urls
                });
            });
        }).on('error', e => resolve({ target: url, status: "error", error: e.message }));
    });
}

(async () => {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log(JSON.stringify({ error: "Usage: node sitemap-parser.js <company-slug> [--sitemap-url=<url>]" }));
        process.exit(1);
    }

    const companySlug = args[0];
    let targetUrl = null;
    const urlArg = args.find(a => a.startsWith('--sitemap-url='));
    
    if (urlArg) {
        targetUrl = urlArg.split('=').slice(1).join('=');
    } else {
        const path = require('path');
        const fs = require('fs');
        const envPath = path.join(process.cwd(), 'companies', companySlug, '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            // GSC_SITE_URL or SITE_URL is commonly used
            let siteUrlMatch = envContent.match(/^SITE_URL=(.*)$/m) || envContent.match(/^GSC_SITE_URL=(.*)$/m);
            if (siteUrlMatch) {
                let baseUrl = siteUrlMatch[1].trim().replace(/['"]/g, '');
                if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
                targetUrl = `${baseUrl}/sitemap.xml`;
            }
        }
    }
    
    if (!targetUrl) {
         console.log(JSON.stringify({ error: "No sitemap URL provided and SITE_URL not found in company .env" }));
         process.exit(1);
    }

    const data = await fetchSitemap(targetUrl);
    
    // Auto fallback to sitemap_index.xml if sitemap.xml fails and no explicit url was passed
    if (data.status === "error" && !urlArg && targetUrl.endsWith('/sitemap.xml')) {
        const indexUrl = targetUrl.replace('/sitemap.xml', '/sitemap_index.xml');
        const indexData = await fetchSitemap(indexUrl);
        if (indexData.status !== "error") {
            console.log(JSON.stringify(indexData, null, 2));
            process.exit(0);
        }
    }
    
    console.log(JSON.stringify(data, null, 2));
})();
