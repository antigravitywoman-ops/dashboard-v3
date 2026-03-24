#!/usr/bin/env node

/**
 * PAGESPEED FETCH SKILL
 * Integrates with Google PageSpeed Insights API to retrieve Core Web Vitals.
 */

const https = require('https');

function fetchPageSpeed(url, apiKey, strategy = 'mobile') {
    return new Promise((resolve, reject) => {
        let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`;
        if (apiKey) {
            apiUrl += `&key=${apiKey}`;
        }

        https.get(apiUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    try {
                        const errorResponse = JSON.parse(data);
                        return resolve({
                            url: url,
                            error: errorResponse.error?.message || `HTTP Error ${res.statusCode}`
                        });
                    } catch (e) {
                         return resolve({
                            url: url,
                            error: `HTTP Error ${res.statusCode}`
                        });
                    }
                }

                try {
                    const parsed = JSON.parse(data);
                    const metrics = parsed.lighthouseResult?.audits || {};
                    const crux = parsed.loadingExperience?.metrics || {};

                    const result = {
                        url: url,
                        timestamp: new Date().toISOString(),
                        field_data: {
                            lcp: crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile || null,
                            cls: crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile ? (crux.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100) : null,
                            inp: crux.INTERACTION_TO_NEXT_PAINT?.percentile || null,
                            category: parsed.loadingExperience?.overall_category || 'UNKNOWN'
                        },
                        lab_data: {
                            lcp: metrics['largest-contentful-paint']?.numericValue || null,
                            cls: metrics['cumulative-layout-shift']?.numericValue || null,
                            tbt: metrics['total-blocking-time']?.numericValue || null,
                            speed_index: metrics['speed-index']?.numericValue || null,
                            performance_score: parsed.lighthouseResult?.categories?.performance?.score ? Math.round(parsed.lighthouseResult.categories.performance.score * 100) : null
                        }
                    };
                    resolve(result);
                } catch (e) {
                    resolve({ url: url, error: `Parse error: ${e.message}` });
                }
            });
        }).on('error', (e) => {
            resolve({ url: url, error: `Request error: ${e.message}` });
        });
    });
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log(JSON.stringify({ error: "Usage: node pagespeed-fetch.js <url> <company-slug> [--strategy=mobile|desktop]" }));
    process.exit(1);
}

const targetUrl = args[0];
const companySlug = args[1];

let strategy = 'mobile';
const strategyArg = args.find(a => a.startsWith('--strategy='));
if (strategyArg) {
    strategy = strategyArg.split('=')[1];
}

const apiKey = process.env.PAGESPEED_API_KEY || null;

fetchPageSpeed(targetUrl, apiKey, strategy).then(result => {
    result.strategy = strategy;
    console.log(JSON.stringify(result, null, 2));
});
