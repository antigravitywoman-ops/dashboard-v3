/**
 * crawl-browser.js — OpenClaw SEO Full-Site Crawler (SPA-aware)
 *
 * Modes:
 *   auto (default) — HTTP crawl first, detect SPA, JS-navigate broken routes
 *   http           — HTTP direct only (fast, static sites)
 *   spa            — JS navigation only (force SPA mode)
 *
 * Usage:
 *   node crawl-browser.js <company-slug> --url=<homepage> [--limit=150] [--mode=auto]
 *
 * Output:
 *   companies/<slug>/technical/audits/<YYYY-MM-DD>-onboarding-crawl.json
 *   companies/<slug>/technical/issues-log.md  (critical issues appended)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const slug   = args[0];
const getArg = (name) => {
  const a = args.find(a => a.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};
const startUrl  = getArg('url');
const pageLimit = parseInt(getArg('limit') || '150', 10);
const mode      = getArg('mode') || 'auto';

if (!slug || !startUrl) {
  console.error('Usage: node crawl-browser.js <company-slug> --url=<homepage> [--limit=150] [--mode=auto|http|spa]');
  process.exit(1);
}

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT       = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const AUDITS_DIR = path.join(ROOT, 'companies', slug, 'technical', 'audits');
const ISSUES_LOG = path.join(ROOT, 'companies', slug, 'technical', 'issues-log.md');
const PW_CACHE   = '/home/dev/.cache/ms-playwright';

// ── Helpers ───────────────────────────────────────────────────────────────────
function sameDomain(url, baseDomain) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    return h === baseDomain.replace(/^www\./, '');
  } catch { return false; }
}

function normalizeUrl(base, href) {
  if (!href || /^(mailto:|tel:|javascript:|#)/.test(href)) return null;
  try {
    const r = new URL(href, base);
    if (!['http:', 'https:'].includes(r.protocol)) return null;
    r.hash = '';
    return r.href;
  } catch { return null; }
}

function isSpaSignal(html) {
  // React/Next/Vue/Angular bundle markers
  return /_next\/|__webpack_require__|react-dom|vue\.runtime|angular\/core|<div id="root"|<div id="app"/.test(html);
}

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}

// Extract SEO metadata from a Playwright page
async function extractMeta(page) {
  return page.evaluate(() => {
    const getMeta = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.getAttribute('content') || el.getAttribute('href') || '').trim() : '';
    };
    const getH1 = () => {
      const el = document.querySelector('h1');
      return el ? (el.innerText || el.textContent || '').trim() : '';
    };
    const getWordCount = () => {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script,style,noscript').forEach(e => e.remove());
      return (clone.innerText || clone.textContent || '').trim().split(/\s+/).filter(w => w).length;
    };
    const getLinks = () =>
      Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(Boolean);
    return {
      title:     (document.title || '').slice(0, 200),
      h1:        getH1().slice(0, 200),
      meta_desc: (getMeta('meta[name="description"]') || getMeta('meta[property="og:description"]')).slice(0, 300),
      canonical: getMeta('link[rel="canonical"]'),
      word_count: getWordCount(),
      links:     getLinks(),
    };
  });
}

// ── HTTP crawl phase ──────────────────────────────────────────────────────────
async function httpCrawl(browser, startUrl, baseDomain, limit) {
  const visited = new Set();
  const queue   = [startUrl];
  const results = [];
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; OpenClaw-SEO-Crawler/1.0)',
  });

  while (queue.length && results.length < limit) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    const page = await context.newPage();
    let status = null, finalUrl = url, rawHtml = '';
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      status   = resp ? resp.status() : null;
      finalUrl = page.url();
      rawHtml  = await page.content();

      const meta  = await extractMeta(page);
      const links = [];
      for (const href of meta.links) {
        const resolved = normalizeUrl(finalUrl, href);
        if (resolved && sameDomain(resolved, baseDomain) && !visited.has(resolved)) {
          queue.push(resolved);
          links.push(resolved);
        }
      }
      results.push({
        url: finalUrl, status,
        url_type: status === 200 ? 'HTTP_200' : ('HTTP_' + (status || 'ERROR')),
        title: meta.title, h1: meta.h1, meta_desc: meta.meta_desc,
        canonical: meta.canonical, word_count: meta.word_count,
        internal_links: [...new Set(links)].slice(0, 50),
        raw_html_snippet: rawHtml.slice(0, 8000),
      });
    } catch (e) {
      results.push({ url, status, url_type: 'ERROR', title: '', h1: '', meta_desc: '',
        canonical: '', word_count: 0, internal_links: [], error: e.message.slice(0, 200) });
    } finally { await page.close(); }

    await new Promise(r => setTimeout(r, 400));
  }

  await context.close();
  return results;
}

// ── SPA JS-navigation crawl phase ────────────────────────────────────────────
// Strategy: intercept all 404 responses and serve homepage HTML instead.
// This simulates a properly configured server-side catch-all rewrite rule.
// React Router will then handle the URL client-side and render the correct component.
async function spaNavigatePage(browser, homepageUrl, targetUrl, baseDomain) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; OpenClaw-SEO-Crawler/1.0)',
  });
  const page = await context.newPage();
  let result = null;

  try {
    // Step 1: fetch homepage HTML to use as catch-all fallback
    let homeHtml = '';
    const homeResp = await page.goto(homepageUrl, { waitUntil: 'networkidle', timeout: 25000 });
    homeHtml = await homeResp.text();
    const homeContentType = homeResp.headers()['content-type'] || 'text/html';

    // Step 2: install route interception — serve homepage HTML for any 404
    // This is equivalent to adding `/* /index.html 200` in Netlify _redirects
    await page.route('**/*', async (route) => {
      try {
        const resp = await route.fetch();
        if (resp.status() === 404) {
          const reqUrl = route.request().url();
          // Only intercept HTML document requests (not CSS/JS/images)
          const isDoc = !reqUrl.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)(\?|$)/i);
          if (isDoc) {
            await route.fulfill({ status: 200, body: homeHtml, contentType: homeContentType });
            return;
          }
        }
        await route.fulfill({ response: resp });
      } catch {
        await route.continue();
      }
    });

    // Step 3: navigate directly to the target URL — now 404 is intercepted → React app loads
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 20000 });
    // Give React Router time to re-render the component
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const meta  = await extractMeta(page);
    const links = [];
    for (const href of meta.links) {
      const resolved = normalizeUrl(homepageUrl, href);
      if (resolved && sameDomain(resolved, baseDomain)) links.push(resolved);
    }

    const hasContent = meta.word_count > 30 || !!meta.h1 || (meta.title && meta.title !== (await page.evaluate(() => document.title) || '').split('|')[0].trim() === '404');

    result = {
      url: targetUrl,
      status: 404,  // real HTTP status — document accurately
      url_type: hasContent ? 'JS_ROUTE_ONLY' : 'DEAD_ROUTE',
      spa_content_found: hasContent,
      title: meta.title, h1: meta.h1, meta_desc: meta.meta_desc,
      canonical: meta.canonical, word_count: meta.word_count,
      internal_links: [...new Set(links)].slice(0, 50),
      note: hasContent
        ? 'Content found via SPA simulation (catch-all intercept). Server returns 404 for direct HTTP requests. Fix server routing to make this page indexable.'
        : 'No content rendered even via SPA simulation. This route may not exist as a React component, or the component requires data that fails to load.',
    };
  } catch (e) {
    result = {
      url: targetUrl, status: 404, url_type: 'JS_NAV_ERROR', spa_content_found: false,
      title: '', h1: '', meta_desc: '', canonical: '', word_count: 0, internal_links: [],
      error: e.message.slice(0, 300),
      note: 'JS navigation failed. Could be a deep React error, auth wall, or network issue.',
    };
  } finally {
    await page.close();
    await context.close();
  }

  return result;
}

// ── Critical issues detector ──────────────────────────────────────────────────
function detectCriticalIssues(pages, baseDomain) {
  const issues = [];
  const home   = pages.find(p => p.url_type === 'HTTP_200');
  const non404 = pages.filter(p => p.url_type === 'HTTP_200').length;
  const jsOnly = pages.filter(p => p.url_type === 'JS_ROUTE_ONLY').length;
  const dead   = pages.filter(p => ['HTTP_404', 'DEAD_ROUTE', 'HTTP_ERROR'].includes(p.url_type)).length;
  const total  = pages.length;

  // Server routing broken
  if (jsOnly > 0) {
    issues.push({
      type: 'SERVER_ROUTING_BROKEN',
      severity: 'CRITICAL',
      priority: 'critical',
      message: `${jsOnly} page(s) return HTTP 404 from server but render content via JS navigation. ` +
               `This is a React/SPA with missing server-side catch-all routing. ` +
               `Google cannot crawl or index these pages.`,
      affected_count: jsOnly,
      affected_urls: pages.filter(p => p.url_type === 'JS_ROUTE_ONLY').map(p => p.url),
      fix: 'Add catch-all rewrite: serve index.html for all non-asset routes. ' +
           'Netlify: _redirects → /* /index.html 200. Nginx: try_files $uri /index.html. ' +
           'Vercel: rewrites in vercel.json.',
      seo_impact: 'All affected pages are invisible to search engines. Only the homepage can be indexed.',
    });
  }

  // Dead routes
  if (dead > 0) {
    issues.push({
      type: 'DEAD_ROUTES',
      severity: 'HIGH',
      priority: 'high',
      message: `${dead} URL(s) return 404 and show no content even via JS navigation. These may be broken links or deleted pages.`,
      affected_urls: pages.filter(p => ['HTTP_404', 'DEAD_ROUTE'].includes(p.url_type)).map(p => p.url),
    });
  }

  // Homepage title typo check (simple heuristic)
  if (home) {
    if (!home.h1) issues.push({ type: 'MISSING_H1_HOMEPAGE', severity: 'HIGH', priority: 'high',
      message: 'Homepage has no H1 tag.', url: home.url });
    if (!home.canonical) issues.push({ type: 'MISSING_CANONICAL_HOMEPAGE', severity: 'MEDIUM', priority: 'medium',
      message: 'Homepage has no canonical tag.', url: home.url });
    if (home.meta_desc && home.meta_desc.length < 50) issues.push({ type: 'THIN_META_DESC_HOMEPAGE', severity: 'MEDIUM', priority: 'medium',
      message: `Homepage meta description is only ${home.meta_desc.length} chars — likely a tagline, not a keyword-rich description.`, url: home.url });
  }

  return issues;
}

// ── Write issues-log.md ───────────────────────────────────────────────────────
function writeIssuesToLog(issues, crawlDate) {
  if (!fs.existsSync(ISSUES_LOG)) {
    fs.writeFileSync(ISSUES_LOG, `# Issues Log — ${slug}\n\n`, 'utf-8');
  }
  const lines = [
    `\n---\n## Crawl Issues — ${crawlDate}\n\n`,
    `> Source: crawl-browser (SPA-aware) | ${new Date().toISOString()}\n\n`,
  ];
  for (const issue of issues) {
    lines.push(`### [${issue.severity}] ${issue.type}\n`);
    lines.push(`- **Message**: ${issue.message}\n`);
    if (issue.fix)         lines.push(`- **Fix**: ${issue.fix}\n`);
    if (issue.seo_impact)  lines.push(`- **SEO Impact**: ${issue.seo_impact}\n`);
    if (issue.affected_urls?.length) lines.push(`- **Affected URLs** (${issue.affected_urls.length}): ${issue.affected_urls.slice(0, 5).join(', ')}\n`);
    lines.push('\n');
  }
  fs.appendFileSync(ISSUES_LOG, lines.join(''), 'utf-8');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(AUDITS_DIR, { recursive: true });

  const baseDomain = new URL(startUrl).hostname.replace(/^www\./, '');
  console.log(`[crawl-browser] slug=${slug} url=${startUrl} limit=${pageLimit} mode=${mode}`);
  console.log(`[crawl-browser] baseDomain=${baseDomain}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: undefined,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: PW_CACHE },
  });

  let pages = [];
  let spaDetected = false;
  let serverRoutingBroken = false;

  try {
    // ── Phase 1: HTTP crawl (always) ──────────────────────────────────────
    if (mode !== 'spa') {
      console.log('[crawl-browser] Phase 1: HTTP crawl...');
      pages = await httpCrawl(browser, startUrl, baseDomain, pageLimit);
      console.log(`[crawl-browser] HTTP crawl done. ${pages.length} pages. HTTP-200: ${pages.filter(p => p.url_type === 'HTTP_200').length}`);
    }

    // ── Phase 2: SPA detection via probe ─────────────────────────────────────
    if (mode === 'auto' || mode === 'spa') {
      const nonHomePages = pages.filter(p => {
        try { return new URL(p.url).pathname !== '/' && new URL(p.url).pathname !== ''; }
        catch { return false; }
      });
      const nonHome404 = nonHomePages.filter(p => p.url_type?.startsWith('HTTP_4'));

      // Condition 1: majority of non-home pages return 4xx
      const statusSignal = nonHome404.length > 0 && nonHome404.length >= Math.max(1, nonHomePages.length * 0.4);

      // Condition 2: homepage HTML has SPA markers (check larger snippet)
      const homeHtml = pages[0]?.raw_html_snippet || '';
      const htmlSignal = isSpaSignal(homeHtml);

      // Condition 3: probe JS navigation on first 404 route — most reliable
      let probeConfirmed = false;
      if (statusSignal && nonHome404.length > 0) {
        const probeUrl = nonHome404[0].url;
        console.log(`[crawl-browser] SPA probe: JS-navigating ${probeUrl} to check if SPA renders content...`);
        try {
          const probe = await spaNavigatePage(browser, startUrl, probeUrl, baseDomain);
          probeConfirmed = probe.spa_content_found === true;
          console.log(`[crawl-browser] SPA probe result: content_found=${probe.spa_content_found}, words=${probe.word_count}, h1="${probe.h1}"`);
        } catch (e) {
          console.log(`[crawl-browser] SPA probe failed: ${e.message}`);
        }
      }

      if (mode === 'spa' || probeConfirmed || (statusSignal && htmlSignal)) {
        spaDetected = true;
        serverRoutingBroken = nonHome404.length > 0;
        console.log(`[crawl-browser] SPA confirmed (probe=${probeConfirmed}, htmlSignal=${htmlSignal}). ${nonHome404.length} routes need JS navigation.`);

        // Phase 2: JS-navigate each 404 route
        const toNavigate = mode === 'spa' ? pages : nonHome404;

        for (const p of toNavigate) {
          if (pages.length >= pageLimit) break;
          console.log(`[crawl-browser] SPA-nav: ${p.url}`);
          const spaResult = await spaNavigatePage(browser, startUrl, p.url, baseDomain);
          const idx = pages.findIndex(x => x.url === p.url);
          if (idx >= 0) pages[idx] = spaResult;
          else pages.push(spaResult);
          await new Promise(r => setTimeout(r, 500));
        }
      } else if (statusSignal) {
        console.log(`[crawl-browser] Status signal suggests SPA but probe found no JS content. Treating 404s as genuinely dead routes.`);
      }
    }
  } finally {
    await browser.close();
  }

  // Clean up raw_html_snippet from final output (was only needed for SPA detection)
  pages.forEach(p => delete p.raw_html_snippet);

  // ── Detect critical issues ─────────────────────────────────────────────────
  const criticalIssues = detectCriticalIssues(pages, baseDomain);

  // ── Build output ──────────────────────────────────────────────────────────
  const crawlDate = dateStr();
  const output = {
    crawl_meta: {
      start_url: startUrl,
      company: slug,
      crawled_at: new Date().toISOString(),
      total_pages: pages.length,
      page_limit: pageLimit,
      crawler: 'openclaw-seo/crawl-browser',
      version: '2.0',
      mode,
      spa_detected: spaDetected,
      server_routing_broken: serverRoutingBroken,
      summary: {
        http_200:      pages.filter(p => p.url_type === 'HTTP_200').length,
        js_route_only: pages.filter(p => p.url_type === 'JS_ROUTE_ONLY').length,
        dead_route:    pages.filter(p => p.url_type === 'DEAD_ROUTE').length,
        http_4xx:      pages.filter(p => p.url_type?.startsWith('HTTP_4')).length,
        errors:        pages.filter(p => p.url_type === 'ERROR' || p.url_type?.includes('ERROR')).length,
      },
    },
    critical_issues: criticalIssues,
    pages,
  };

  const outFile = path.join(AUDITS_DIR, `${crawlDate}-onboarding-crawl.json`);
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n[crawl-browser] Saved to ${outFile}`);

  // ── Write issues to issues-log.md ─────────────────────────────────────────
  if (criticalIssues.length) writeIssuesToLog(criticalIssues, crawlDate);

  // ── Print summary ─────────────────────────────────────────────────────────
  const { summary } = output.crawl_meta;
  console.log(`\n=== CRAWL SUMMARY ===`);
  console.log(`Total pages    : ${pages.length}`);
  console.log(`HTTP 200       : ${summary.http_200}`);
  console.log(`JS Route Only  : ${summary.js_route_only}  ← server 404 but SPA renders content`);
  console.log(`Dead Route     : ${summary.dead_route}  ← 404 + no JS content`);
  console.log(`SPA detected   : ${spaDetected}`);
  console.log(`Server routing broken: ${serverRoutingBroken}`);

  if (criticalIssues.length) {
    console.log(`\n=== CRITICAL ISSUES (${criticalIssues.length}) ===`);
    criticalIssues.forEach(i => console.log(`  [${i.severity}] ${i.type}: ${i.message.slice(0, 120)}`));
  }

  console.log(`\n=== PAGE INVENTORY ===`);
  pages.forEach(p => {
    const flag = p.url_type === 'JS_ROUTE_ONLY' ? ' [SPA-ONLY]' : p.url_type === 'DEAD_ROUTE' ? ' [DEAD]' : '';
    console.log(`  [${p.status || '???'}/${p.url_type}]${flag} ${p.url}`);
    if (p.title) console.log(`    title : ${p.title.slice(0, 80)}`);
    if (p.h1)    console.log(`    h1    : ${p.h1.slice(0, 80)}`);
    console.log(`    words : ${p.word_count}`);
  });
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
