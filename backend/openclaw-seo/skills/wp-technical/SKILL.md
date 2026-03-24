---
name: wp-technical
description: "WordPress technical operations specialist. Handles auth resolution (App Password → Cookie+Nonce → XML-RPC fallback chain), FSE block theme template editing, SEO plugin detection and configuration (Yoast v22+), schema injection, cache invalidation, and plugin installation. Auto-detects blank credentials and updates missing-dependencies.md at runtime. Use BEFORE cms-wordpress when you hit auth errors, missing SEO plugins, or schema/meta gaps that need infrastructure fixes. NOT for publishing content drafts."
metadata:
  {
    "openclaw": {
      "emoji": "🔧",
      "requires": { "bins": ["python3"] }
    }
  }
---

# WP TECHNICAL Skill

Resolves WordPress infrastructure blockers autonomously. Run this when `cms-wordpress` returns an auth error, a missing SEO plugin, duplicate H1s, or a schema gap.

## Credential Detection

This skill **auto-detects and flags credential failures**:
- Checks for blank `WP_USERNAME` / `WP_APP_PASSWORD` before any auth attempt
- Flags blank credentials as `missing` in `missing-dependencies.md` immediately
- On successful Tier 2 auth → **auto-creates Application Password** and **writes it to `.env`**
- `heartbeat.js` syncs `missing-dependencies.md` every cycle — no manual updates needed

## Quick Start
```bash
cd scripts/ && python3 wp-technical.py <company-slug> --action=<action>
```

## Actions
| Action | Description |
|--------|-------------|
| `auth-resolve` | Detect working auth method, return session config, attempt to create App Password |
| `audit-live` | Scrape live pages for H1, meta_desc, canonical, schema gaps |
| `install-yoast` | Install + activate Yoast SEO via plugins REST endpoint |
| `configure-yoast` | Set Yoast site representation, social profiles, homepage meta |
| `inject-schema` | Inject JSON-LD block into FSE template or post content |
| `fix-h1` | Change site-title block level in header template part |
| `set-meta` | Write Yoast meta title + description for a post via XML-RPC |
| `purge-cache` | Invalidate LiteSpeed / WP Super Cache / W3TC cache |
| `read-template` | Read FSE block template or template part content |
| `write-template` | Update FSE block template or template part content |

---

## Auth Resolution Protocol

**Always resolve auth before any write operation.** Try in order — stop at the first that succeeds.

### Tier 1 — REST API Basic Auth (Application Password)
```
GET /wp-json/wp/v2/users/me
Authorization: Basic base64(WP_USERNAME:WP_APP_PASSWORD)
```
- HTTP 200: valid. Use for all subsequent REST calls.
- HTTP 401 + `application_passwords_disabled`: skip to Tier 3 (App Passwords disabled by filter/plugin).
- HTTP 401 + `rest_not_logged_in`: WP_APP_PASSWORD is the login password, not an App Password. Go to Tier 2.

WordPress Application Passwords format: `xxxx xxxx xxxx xxxx xxxx xxxx` (24 chars, space-separated groups of 4).
Login passwords look like regular passwords — they will NOT work for REST API auth.

### Tier 2 — Cookie + Nonce Session (login password)
```python
import urllib.request, urllib.parse, http.cookiejar

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.addheaders = [("User-Agent", "Mozilla/5.0")]

# Step 1: seed test cookie
opener.open("https://site.com/wp-login.php")

# Step 2: login
login_data = urllib.parse.urlencode({
    "log": WP_USERNAME, "pwd": WP_PASSWORD,
    "wp-submit": "Log In", "redirect_to": "/wp-admin/", "testcookie": "1"
}).encode()
opener.open("https://site.com/wp-login.php", login_data, timeout=15)
cookie_header = "; ".join([f"{c.name}={c.value}" for c in cj])

# Step 3: get REST nonce
req = urllib.request.Request(
    "https://site.com/wp-admin/admin-ajax.php?action=rest-nonce",
    headers={"Cookie": cookie_header, "User-Agent": "Mozilla/5.0"})
nonce = urllib.request.urlopen(req, timeout=10).read().decode().strip()

# Use in all REST calls:
headers = {"Cookie": cookie_header, "X-WP-Nonce": nonce, "Content-Type": "application/json"}
```
Nonce expires in ~12 hours. Re-acquire if calls return 403.

**After Tier 2 succeeds — immediately try to create an Application Password:**
```python
# POST /wp-json/wp/v2/users/1/application-passwords  {"name": "openclaw-seo"}
# HTTP 201: save returned "password" to WP_APP_PASSWORD in .env
# HTTP 501 + application_passwords_disabled: flag for operator, continue with Cookie+Nonce
```

### Tier 3 — XML-RPC (login password, when REST is unavailable)
```python
import xmlrpc.client
server = xmlrpc.client.ServerProxy("https://site.com/xmlrpc.php")

# Auth test (HTTP 405 on GET is normal — XML-RPC needs POST):
server.wp.getUsersBlogs(USERNAME, PASSWORD)  # returns list of blogs if success

# Update post title + Yoast meta fields:
server.wp.editPost(1, USERNAME, PASSWORD, POST_ID, {
    "post_title": "New H1 Title",
    "custom_fields": [
        {"key": "_yoast_wpseo_title",    "value": "SEO Title | Site Name"},
        {"key": "_yoast_wpseo_metadesc", "value": "155-char meta description."},
        {"key": "_yoast_wpseo_canonical","value": "https://site.com/page/"},
    ]
})

# Append schema JSON-LD to post content:
current = server.wp.getPost(1, USERNAME, PASSWORD, POST_ID, ["post_content"])
schema_block = '\n\n<!-- wp:html -->\n<script type="application/ld+json">\n' \
               + json.dumps(schema_obj, ensure_ascii=False, indent=2) \
               + '\n</script>\n<!-- /wp:html -->'
server.wp.editPost(1, USERNAME, PASSWORD, POST_ID, {
    "post_content": current["post_content"] + schema_block
})

# List all posts (any status):
server.wp.getPosts(1, USERNAME, PASSWORD, {"post_type": "post", "number": 50, "post_status": "any"})
server.wp.getPosts(1, USERNAME, PASSWORD, {"post_type": "page", "number": 50, "post_status": "any"})

# Get site options (read-only for most):
server.wp.getOptions(1, USERNAME, PASSWORD, ["blogname", "siteurl", "show_on_front", "page_on_front"])
```
XML-RPC does NOT support: plugin install, FSE template editing, site-wide option writes.
If XML-RPC returns HTTP 403 or 405 with error: declare `auth-blocked`, set task `waiting-human`.

---

## FSE Block Theme Detection + Template Editing

### Detect block theme
```python
# GET /wp-json/wp/v2/themes?status=active
# Response field "is_block_theme": true = FSE / block theme
```

### Fix duplicate H1 — site-title block renders as H1 by default
All pages showing same H1 = theme header uses `wp:site-title` at default level (1).
```python
# 1. GET /wp-json/wp/v2/template-parts?per_page=50
# 2. Find part with area="header" (slug usually "header")
# 3. Read content.raw
# 4. Fix: re.sub(r'(<!-- wp:site-title \{)', r'\1"level":2,', content)
# 5. POST /wp-json/wp/v2/template-parts/{id}  {"content": new_content}
```

### Inject schema into homepage (blog listing — no static page)
```python
# 1. GET /wp-json/wp/v2/templates?per_page=50
# 2. Find template with slug="home"
# 3. Prepend schema block to content:
schema_block = (
    '<!-- wp:html -->\n'
    '<script type="application/ld+json">\n'
    + json.dumps(schema_obj, ensure_ascii=False, indent=2)
    + '\n</script>\n<!-- /wp:html -->\n\n'
)
new_content = schema_block + current_content
# 4. POST /wp-json/wp/v2/templates/{id}  {"content": new_content}
```
Check for existing schemas before injecting: `if "@type" not in current_content`.

### Inject schema into individual post content
```python
schema_block = (
    '\n\n<!-- wp:html -->\n'
    '<script type="application/ld+json">\n'
    + json.dumps(schema_obj, ensure_ascii=False, indent=2)
    + '\n</script>\n<!-- /wp:html -->'
)
# Append via XML-RPC wp.editPost or REST PATCH
# Block themes require schema inside wp:html blocks — raw script tags outside blocks are stripped
```

---

## SEO Plugin Detection + Installation

```python
# Check installed plugins (requires auth):
# GET /wp-json/wp/v2/plugins?per_page=50
# Look for: "yoast", "wordpress-seo", "rank-math", "seopress", "all-in-one-seo"

# Check REST namespaces (no auth needed):
# GET /wp-json/
# namespaces list: "yoast/v1", "rank-math/v1", "seopress/v1"
```

### Install Yoast SEO if no SEO plugin found
```python
# POST /wp-json/wp/v2/plugins  {"slug": "wordpress-seo", "status": "active"}
# HTTP 201 = installed + activated
# HTTP 500 + "plugins_api_failed"/"closed" = server firewall blocks plugin download
```
If install blocked: write PHP snippet to reviews/ and set task `waiting-human`.

---

## Yoast SEO Configuration (v22+ REST API)

After installing Yoast, run `yoast/v1/indexing/prepare` then `yoast/v1/indexing/general` to build indexables.

**Key endpoints (all require Cookie+Nonce auth):**

| Endpoint | Method | Use |
|----------|--------|-----|
| `yoast/v1/get_head?url=<url>` | GET | Verify rendered title, desc, schemas for any URL |
| `yoast/v1/configuration/site_representation` | POST | Set person/company type, name, user ID |
| `yoast/v1/configuration/social_profiles` | POST | Set social profile URLs |
| `yoast/v1/configuration/save_configuration_state` | POST | Mark wizard steps complete |
| `yoast/v1/indexing/prepare` | POST | Prepare indexing |
| `yoast/v1/indexing/general` | POST | Build all indexables |
| `yoast/v1/indexing/posts` | POST | Index posts specifically |
| `yoast/v1/workouts` | GET | Check configuration completion |

### Set per-post Yoast meta (XML-RPC custom_fields):
```python
# After Yoast is installed, these custom field keys are read by Yoast:
# _yoast_wpseo_title     — SEO title shown in SERP (overrides post title)
# _yoast_wpseo_metadesc  — meta description
# _yoast_wpseo_canonical — canonical URL (leave empty to use default)
# Verify with: GET /wp-json/yoast/v1/get_head?url=<post-url>
```

### Configure site as Person (personal brand):
```python
# POST /wp-json/yoast/v1/configuration/site_representation
{
    "company_or_person": "person",
    "company_or_person_user_id": 1,   # WordPress admin user ID
    "company_name": "Author Name Writing",
    "website_name": "Author Name Writing",
}
# Then: POST /wp-json/yoast/v1/indexing/general  (builds Person schema)
```

### Homepage meta description:
Yoast uses WordPress `description` (site tagline) as homepage meta fallback when `metadesc-home-wpseo` is empty.
```python
# Step 1: Check if tagline is visible in the rendered homepage HTML
req = urllib.request.Request("https://site.com/", headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req).read().decode()
tagline_is_visible = "<tagline text>" in html  # check outside of <head>

# Step 2a: If tagline NOT visible in body: safe to set it to the full meta description
# POST /wp-json/wp/v2/settings  {"description": "Full 155-char meta description text."}

# Step 2b: If tagline IS visible in body: keep tagline short, set homepage meta via Yoast admin only
# Write to reviews/ with manual Yoast admin UI steps
```

---

## Cache Invalidation

### LiteSpeed Cache (plugin: litespeed-cache)
```python
# Option A: admin-ajax (requires auth cookie)
# GET /wp-admin/admin-ajax.php?action=litespeed_purge_all  +  Cookie header
# Option B: REST (if litespeed exposes it)
# GET /wp-json/litespeed/v1/purge/all
# Note: updating a post via REST triggers automatic per-post cache invalidation
# Note: schema injected into FSE templates may require full purge to appear
```

### No cache plugin / unknown
Updating a post triggers automatic WP object cache invalidation. For CDN caches, flag for operator.

---

## Review File Template (for waiting-human tasks)

When an operation can't be automated:
```markdown
# Review: <task-type> — <brief description>
**Task ID**: <id>
**Status**: waiting-human — <one-line blocker>
**Generated**: <timestamp>

## Blocker
<specific reason why automation stopped>

## Audit Findings (scraped <date>)
<table of current state vs. target state>

## Ready-to-Apply: <option A — paste in wp-admin>
<exact PHP snippet, curl command, or copy-paste values>

## Step-by-Step Manual Instructions
<numbered steps>

## Re-queue Instructions
<what to fix + how to reset the task to pending>
```
Write to: `companies/<slug>/reviews/<slug>-<task-type>-review.md`
Set task status: `waiting-human` (NOT `blocked` — the work is done, the human presses a button).

---

## Diagnostic Quick Reference

| Symptom | Cause | Fix |
|---------|-------|-----|
| All pages share same H1 | Block theme `wp:site-title` renders as H1 | `fix-h1` action — set level:2 in header template |
| Meta descriptions missing site-wide | No SEO plugin | `install-yoast` action |
| REST writes return 401 | WP_APP_PASSWORD is login password | `auth-resolve` → Tier 2 |
| REST writes return 403 | Nonce expired or CSRF | Re-acquire nonce via admin-ajax |
| App Passwords disabled (HTTP 501) | Security plugin/filter blocks feature | Use Cookie+Nonce; flag for operator |
| Schema stripped from page | Block theme requires `wp:html` wrapper | Wrap JSON-LD in Custom HTML block |
| Plugin install returns HTTP 500 | Server firewall blocks wp.org downloads | Write PHP snippet + waiting-human |
| Homepage has no static page | `show_on_front: posts` — blog listing | Inject schema via `home` FSE template |
| Yoast REST endpoints return 404 | Yoast not installed yet | `install-yoast` first |
