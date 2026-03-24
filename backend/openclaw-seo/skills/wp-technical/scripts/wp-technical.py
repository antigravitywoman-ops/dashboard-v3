#!/usr/bin/env python3
"""
wp-technical.py — WordPress Technical Operations Skill
openclaw-seo | Auth resolution, FSE template editing, Yoast config, cache purge

Usage:
  python3 wp-technical.py <company-slug> --action=<action> [--url=<url>] [--post-id=<id>]
"""

import argparse, base64, http.cookiejar, json, os, re, sys, time
import urllib.error, urllib.parse, urllib.request
import xmlrpc.client
from datetime import datetime


# ── Missing Dependencies Sync ─────────────────────────────────────────────────

def update_missing_deps_status(company_slug, key, status, reason=""):
    """
    Update the Status column of missing-dependencies.md for a specific credential key.
    This is called at runtime when a credential is confirmed as failing.
    Makes the file a derived view of .env rather than a manually maintained file.
    """
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    dep_path = os.path.join(base, "companies", company_slug, "about", "missing-dependencies.md")
    if not os.path.exists(dep_path):
        print(f"  [!] missing-dependencies.md not found — skipping status update for {key}")
        return

    with open(dep_path) as f:
        content = f.read()

    now = datetime.utcnow().isoformat() + "Z"

    # Build the new status string
    display_status = f"{status}" + (f" — {reason}" if reason else "")

    # Find and replace the Status column for the specific KEY row
    # Pattern: | `KEY` | Category | Priority | Status | Blocks |
    key_pattern = re.compile(
        r'^(\|\s*`?' + re.escape(key) + r'`?\s*\|[^|]+\|[^|]+\|)\s*[^*`\n][^|]*?(\s*\|)',
        re.MULTILINE
    )

    def replacer(m):
        return m.group(1) + ' ' + display_status + m.group(2)

    new_content, count = key_pattern.subn(replacer, content)

    if count > 0:
        # Update frontmatter
        new_content = re.sub(r'^last_checked:\s*.*$', f'last_checked: {now}', new_content, flags=re.MULTILINE)
        new_content = re.sub(r'^generated_by:\s*.*$', 'generated_by: runtime-detected', new_content, flags=re.MULTILINE)
        with open(dep_path, 'w') as f:
            f.write(new_content)
        print(f"  [DEPS] Updated missing-dependencies.md: {key} → {display_status}")
    else:
        print(f"  [!] Could not find {key} row in missing-dependencies.md — skipping")


def flag_wp_creds_missing(company_slug, username, password):
    """
    Flag WP_USERNAME and/or WP_APP_PASSWORD as missing in missing-dependencies.md
    based on what's blank or failed during auth resolution.
    """
    if not username or username.strip() == "":
        update_missing_deps_status(company_slug, "WP_USERNAME", "missing", "blank in .env — runtime check")
    if not password or password.strip() == "":
        update_missing_deps_status(company_slug, "WP_APP_PASSWORD", "missing", "blank in .env — runtime check")

# ── Load company .env ──────────────────────────────────────────────────────────
def load_env(company_slug):
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    env_path = os.path.join(base, "companies", company_slug, ".env")
    env = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"')
    return env


# ── Auth Layer ─────────────────────────────────────────────────────────────────
class WPAuth:
    """
    Resolves the best available auth method for a WordPress site.
    Tier 1: REST Basic Auth (Application Password)
    Tier 2: Cookie + Nonce session (login password)
    Tier 3: XML-RPC (login password)
    """
    def __init__(self, site_url, username, password, company_slug=None):
        self.site = site_url.rstrip("/")
        self.username = username
        self.password = password
        self.company_slug = company_slug
        self.tier = None
        self.cookie_header = None
        self.nonce = None
        self.xmlrpc = None
        self.app_password = None

    def resolve(self):
        print("[wp-technical] Resolving auth method...")

        # Pre-check: flag blank credentials immediately so missing-dependencies.md reflects reality
        if not self.username or not self.username.strip():
            print("  [!] WP_USERNAME is blank — flagging as missing")
            if self.company_slug:
                update_missing_deps_status(self.company_slug, "WP_USERNAME", "missing", "blank in .env — runtime check")
        if not self.password or not self.password.strip():
            print("  [!] WP_APP_PASSWORD is blank — flagging as missing")
            if self.company_slug:
                update_missing_deps_status(self.company_slug, "WP_APP_PASSWORD", "missing", "blank in .env — runtime check")
        if not self.username or not self.password or not self.username.strip() or not self.password.strip():
            print("  [!] Cannot proceed with blank credentials — stopping")
            raise RuntimeError("AUTH-BLOCKED: WP_USERNAME and/or WP_APP_PASSWORD are blank in .env. Configure these before running wp-technical.")

        # Tier 1: Application Password
        creds = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
        req = urllib.request.Request(
            f"{self.site}/wp-json/wp/v2/users/me",
            headers={"Authorization": f"Basic {creds}", "User-Agent": "openclaw-seo/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                if r.status == 200:
                    print("  [✓] Tier 1: REST Basic Auth (Application Password)")
                    self.tier = 1
                    self.app_password = self.password
                    return self
        except urllib.error.HTTPError as e:
            body = json.loads(e.read())
            if body.get("code") == "application_passwords_disabled":
                print("  [!] Tier 1: Application Passwords disabled on this install")
            else:
                print(f"  [✗] Tier 1: HTTP {e.code} — {body.get('code','?')}")

        # Tier 2: Cookie + Nonce
        try:
            cj = http.cookiejar.CookieJar()
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
            opener.addheaders = [("User-Agent", "openclaw-seo/1.0")]
            opener.open(f"{self.site}/wp-login.php")  # seed test cookie
            login_data = urllib.parse.urlencode({
                "log": self.username, "pwd": self.password,
                "wp-submit": "Log In", "redirect_to": "/wp-admin/", "testcookie": "1",
            }).encode()
            resp = opener.open(f"{self.site}/wp-login.php", login_data, timeout=15)
            if "/wp-admin/" in resp.geturl() or "wp-admin" in resp.geturl():
                self.cookie_header = "; ".join([f"{c.name}={c.value}" for c in cj])
                # Get nonce
                nr = urllib.request.Request(
                    f"{self.site}/wp-admin/admin-ajax.php?action=rest-nonce",
                    headers={"Cookie": self.cookie_header, "User-Agent": "openclaw-seo/1.0"})
                nonce_resp = urllib.request.urlopen(nr, timeout=10)
                self.nonce = nonce_resp.read().decode().strip()
                if len(self.nonce) >= 8:
                    print("  [✓] Tier 2: Cookie + Nonce session")
                    self.tier = 2
                    # Try to create an Application Password for future use
                    self._try_create_app_password()
                    return self
        except Exception as e:
            print(f"  [✗] Tier 2 failed: {e}")

        # Tier 3: XML-RPC
        try:
            server = xmlrpc.client.ServerProxy(f"{self.site}/xmlrpc.php")
            blogs = server.wp.getUsersBlogs(self.username, self.password)
            if blogs:
                print("  [✓] Tier 3: XML-RPC")
                self.tier = 3
                self.xmlrpc = server
                return self
        except Exception as e:
            print(f"  [✗] Tier 3 failed: {e}")

        # Flag blank credentials in missing-dependencies.md before raising
        if self.company_slug:
            flag_wp_creds_missing(self.company_slug, self.username, self.password)
        raise RuntimeError("AUTH-BLOCKED: All auth tiers failed. Check credentials and site accessibility.")

    def _try_create_app_password(self):
        try:
            s, r = self.rest("POST", "wp/v2/users/1/application-passwords", {"name": "openclaw-seo"})
            if s == 201 and "password" in r:
                self.app_password = r["password"]
                print(f"  [✓] Created Application Password: {self.app_password}")
                return self.app_password
            elif s == 501:
                print("  [!] Application Passwords disabled — continuing with Cookie+Nonce")
        except Exception as e:
            print(f"  [!] App Password creation failed: {e}")
        return None

    def rest(self, method, path, body=None):
        url = f"{self.site}/wp-json/{path}"
        data = json.dumps(body).encode() if body else None
        headers = {"Content-Type": "application/json", "User-Agent": "openclaw-seo/1.0"}
        if self.tier == 1:
            creds = base64.b64encode(f"{self.username}:{self.app_password}".encode()).decode()
            headers["Authorization"] = f"Basic {creds}"
        elif self.tier == 2:
            headers["Cookie"] = self.cookie_header
            headers["X-WP-Nonce"] = self.nonce
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            r = urllib.request.urlopen(req, timeout=20)
            return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read())
            except Exception:
                return e.code, {}

    def xmlrpc_get_post(self, post_id):
        return self.xmlrpc.wp.getPost(1, self.username, self.password, post_id,
                                      ["post_id", "post_title", "post_content", "post_name", "custom_fields"])

    def xmlrpc_edit_post(self, post_id, fields):
        return self.xmlrpc.wp.editPost(1, self.username, self.password, post_id, fields)


# ── Actions ────────────────────────────────────────────────────────────────────

def action_auth_resolve(auth, env, args):
    result = {
        "tier": auth.tier,
        "tier_name": {1: "app-password", 2: "cookie-nonce", 3: "xml-rpc"}.get(auth.tier),
        "app_password_created": bool(auth.app_password and auth.tier == 2),
    }
    if auth.app_password and auth.tier == 2:
        # Update .env
        env_path = args._env_path
        content = open(env_path).read()
        content = re.sub(r"WP_APP_PASSWORD=.*", f"WP_APP_PASSWORD={auth.app_password}", content)
        with open(env_path, "w") as f:
            f.write(content)
        result["env_updated"] = True
        print(f"  [✓] .env updated with new Application Password")
    print(json.dumps(result, indent=2))
    return result


def action_audit_live(auth, env, args):
    site = env["WP_SITE_URL"].rstrip("/")
    pages = getattr(args, "pages", "/,/about-me/,/stoics-mentorship-upsc/").split(",")
    findings = {}
    for path in pages:
        url = f"{site}{path}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=15) as r:
                html = r.read().decode("utf-8", errors="ignore")
            h1s = [re.sub(r"<[^>]+>","",h).strip()
                   for h in re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.DOTALL|re.IGNORECASE)]
            meta = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\']', html, re.IGNORECASE)
            if not meta:
                meta = re.search(r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']description["\']', html, re.IGNORECASE)
            canonical = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)["\']', html, re.IGNORECASE)
            title = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE|re.DOTALL)
            schemas_raw = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
                                     html, re.DOTALL|re.IGNORECASE)
            schema_types = []
            for s in schemas_raw:
                try:
                    schema_types.append(json.loads(s).get("@type","?"))
                except Exception:
                    pass
            findings[path] = {
                "title": re.sub(r"<[^>]+>","",title.group(1)).strip() if title else None,
                "h1s": h1s,
                "meta_desc": meta.group(1) if meta else None,
                "canonical": canonical.group(1) if canonical else None,
                "schemas": schema_types,
                "gaps": [],
            }
            f = findings[path]
            if not f["meta_desc"]: f["gaps"].append("MISSING-META-DESC")
            if not f["canonical"]: f["gaps"].append("MISSING-CANONICAL")
            if not f["schemas"]: f["gaps"].append("ZERO-SCHEMA")
            if len(set(h1s)) == 1 and len(pages) > 1:
                f["gaps"].append("POTENTIAL-DUPLICATE-H1")
        except Exception as e:
            findings[path] = {"error": str(e)}
    print(json.dumps(findings, indent=2))
    return findings


def action_install_yoast(auth, env, args):
    print("[wp-technical] Installing Yoast SEO...")
    if auth.tier == 3:
        print("  [!] XML-RPC only — cannot install plugins. Write review file.")
        return {"status": "waiting-human", "reason": "xml-rpc-cannot-install-plugins"}
    s, r = auth.rest("POST", "wp/v2/plugins", {"slug": "wordpress-seo", "status": "active"})
    if s == 201:
        print("  [✓] Yoast SEO installed and activated")
        time.sleep(3)
        # Trigger indexing
        auth.rest("POST", "yoast/v1/indexing/prepare")
        auth.rest("POST", "yoast/v1/indexing/general")
        return {"status": "installed", "plugin": "wordpress-seo"}
    else:
        print(f"  [✗] Install failed HTTP {s}: {r}")
        return {"status": "waiting-human", "reason": "plugin-install-blocked", "detail": r}


def action_configure_yoast(auth, env, args):
    company_or_person = getattr(args, "company_or_person", "person")
    name = getattr(args, "name", env.get("COMPANY_NAME", ""))
    social = {
        "instagram_url": getattr(args, "instagram", ""),
        "facebook_url": getattr(args, "facebook", ""),
        "linkedin_url": getattr(args, "linkedin", ""),
        "twitter_site": getattr(args, "twitter", ""),
    }
    s, r = auth.rest("POST", "yoast/v1/configuration/site_representation", {
        "company_or_person": company_or_person,
        "company_or_person_user_id": 1,
        "company_name": name,
        "website_name": name,
    })
    print(f"  site_representation: HTTP {s} — {r}")
    s2, r2 = auth.rest("POST", "yoast/v1/configuration/social_profiles",
                       {k: v for k, v in social.items() if v})
    print(f"  social_profiles: HTTP {s2}")
    # Run indexing
    auth.rest("POST", "yoast/v1/indexing/prepare")
    s3, _ = auth.rest("POST", "yoast/v1/indexing/general")
    print(f"  indexing: HTTP {s3}")
    return {"site_representation": s, "social_profiles": s2, "indexing": s3}


def action_fix_h1(auth, env, args):
    print("[wp-technical] Fixing duplicate H1 (site-title block level)...")
    if auth.tier == 3:
        print("  [!] XML-RPC only — cannot edit FSE templates")
        return {"status": "waiting-human", "reason": "xml-rpc-cannot-edit-templates"}
    s, parts = auth.rest("GET", "wp/v2/template-parts?per_page=50")
    if s != 200:
        return {"status": "error", "detail": parts}
    header = next((p for p in parts if p.get("slug") == "header"), None)
    if not header:
        return {"status": "error", "detail": "header template part not found"}
    part_id = header["id"]
    content = header.get("content", {})
    raw = content.get("raw", "") if isinstance(content, dict) else str(content)
    if '"level"' in raw:
        print("  [!] site-title already has level set")
        return {"status": "already-fixed", "level_found": True}
    new_raw = re.sub(r"(<!-- wp:site-title \{)", r'\1"level":2,', raw)
    s2, r2 = auth.rest("POST", f"wp/v2/template-parts/{part_id}", {"content": new_raw})
    if s2 == 200:
        print(f"  [✓] Header template part updated — site-title now level 2")
    else:
        print(f"  [✗] Update failed HTTP {s2}: {r2}")
    return {"status": "ok" if s2 == 200 else "error", "http": s2}


def action_inject_schema(auth, env, args):
    schema_type = getattr(args, "schema_type", "Organization")
    target = getattr(args, "target", "home")  # "home" or a post slug
    schema_file = getattr(args, "schema_file", None)

    if schema_file:
        with open(schema_file) as f:
            schema_obj = json.load(f)
    else:
        print("[wp-technical] No --schema-file provided")
        return {"status": "error", "reason": "schema-file-required"}

    schema_block = (
        "<!-- wp:html -->\n"
        "<script type=\"application/ld+json\">\n"
        + json.dumps(schema_obj, ensure_ascii=False, indent=2)
        + "\n</script>\n<!-- /wp:html -->\n\n"
    )

    if target == "home":
        if auth.tier == 3:
            return {"status": "waiting-human", "reason": "xml-rpc-cannot-edit-templates"}
        s, templates = auth.rest("GET", "wp/v2/templates?per_page=50")
        home = next((t for t in templates if t.get("slug") == "home"), None)
        if not home:
            return {"status": "error", "detail": "home template not found"}
        tpl_id = home["id"]
        content = home.get("content", {})
        raw = content.get("raw", "") if isinstance(content, dict) else str(content)
        if schema_obj.get("@type","") in raw:
            print(f"  [!] {schema_obj.get('@type')} schema already present")
            return {"status": "already-present"}
        new_raw = schema_block + raw
        s2, r2 = auth.rest("POST", f"wp/v2/templates/{tpl_id}", {"content": new_raw})
        print(f"  [{'✓' if s2==200 else '✗'}] Home template schema inject: HTTP {s2}")
        return {"status": "ok" if s2 == 200 else "error", "http": s2}
    else:
        # Inject into a post by slug
        if auth.tier == 3:
            posts = auth.xmlrpc.wp.getPosts(1, auth.username, auth.password,
                                            {"post_type": "post", "number": 50})
            post = next((p for p in posts if p.get("post_name") == target), None)
            if not post:
                return {"status": "error", "detail": f"post slug {target} not found"}
            post_id = int(post["post_id"])
            current = auth.xmlrpc_get_post(post_id)
            new_content = current["post_content"] + "\n" + schema_block.replace("\n\n", "\n")
            result = auth.xmlrpc_edit_post(post_id, {"post_content": new_content})
            print(f"  [✓] Schema injected into post {post_id} via XML-RPC: {result}")
            return {"status": "ok", "post_id": post_id}
        else:
            s, posts = auth.rest("GET", f"wp/v2/posts?slug={target}&per_page=5")
            if not posts:
                return {"status": "error", "detail": f"post slug {target} not found"}
            post_id = posts[0]["id"]
            s2, r2 = auth.rest("GET", f"wp/v2/posts/{post_id}")
            current_content = r2.get("content", {}).get("raw", "") if isinstance(r2.get("content"), dict) else ""
            if schema_obj.get("@type","") in current_content:
                return {"status": "already-present"}
            new_content = current_content + "\n" + schema_block
            s3, r3 = auth.rest("POST", f"wp/v2/posts/{post_id}", {"content": new_content})
            print(f"  [{'✓' if s3==200 else '✗'}] Post {post_id} schema inject: HTTP {s3}")
            return {"status": "ok" if s3 == 200 else "error", "post_id": post_id}


def action_set_meta(auth, env, args):
    post_id = int(getattr(args, "post_id", 0))
    seo_title = getattr(args, "seo_title", "")
    meta_desc = getattr(args, "meta_desc", "")
    new_title = getattr(args, "post_title", "")  # H1 / visible title

    if not post_id:
        print("[wp-technical] --post-id required for set-meta")
        return {"status": "error"}

    if auth.tier in (1, 2):
        fields = {}
        if new_title:
            fields["title"] = new_title
        if seo_title or meta_desc:
            fields["meta"] = {}
            if seo_title:
                fields["meta"]["_yoast_wpseo_title"] = seo_title
            if meta_desc:
                fields["meta"]["_yoast_wpseo_metadesc"] = meta_desc
        s, r = auth.rest("POST", f"wp/v2/posts/{post_id}", fields)
        print(f"  [{'✓' if s==200 else '✗'}] set-meta via REST: HTTP {s}")
        return {"status": "ok" if s == 200 else "error", "http": s}
    elif auth.tier == 3:
        edit_struct = {}
        if new_title:
            edit_struct["post_title"] = new_title
        custom_fields = []
        if seo_title:
            custom_fields.append({"key": "_yoast_wpseo_title", "value": seo_title})
        if meta_desc:
            custom_fields.append({"key": "_yoast_wpseo_metadesc", "value": meta_desc})
        if custom_fields:
            edit_struct["custom_fields"] = custom_fields
        result = auth.xmlrpc_edit_post(post_id, edit_struct)
        print(f"  [✓] set-meta via XML-RPC: {result}")
        return {"status": "ok", "xmlrpc_result": bool(result)}


def action_purge_cache(auth, env, args):
    if auth.tier == 3:
        return {"status": "skipped", "reason": "xml-rpc-cannot-purge-cache"}
    print("[wp-technical] Purging cache...")
    results = {}
    # LiteSpeed
    for ep in ["litespeed/v1/purge/all", "litespeed/v3/purge/all"]:
        s, r = auth.rest("GET", ep)
        if s not in (404, 405):
            results["litespeed"] = s
            print(f"  LiteSpeed purge: HTTP {s}")
            break
    # Admin-ajax LiteSpeed
    if "litespeed" not in results:
        try:
            req = urllib.request.Request(
                f"{auth.site}/wp-admin/admin-ajax.php?action=litespeed_purge_all",
                headers={"Cookie": auth.cookie_header or "", "User-Agent": "openclaw-seo/1.0"})
            r = urllib.request.urlopen(req, timeout=10)
            results["litespeed_ajax"] = r.status
            print(f"  LiteSpeed ajax purge: HTTP {r.status}")
        except Exception as e:
            results["litespeed_ajax"] = str(e)
    return results


def action_read_template(auth, env, args):
    slug = getattr(args, "slug", "home")
    ttype = getattr(args, "template_type", "template")  # "template" or "part"
    endpoint = f"wp/v2/templates?per_page=50" if ttype == "template" else "wp/v2/template-parts?per_page=50"
    s, items = auth.rest("GET", endpoint)
    item = next((t for t in items if t.get("slug") == slug), None)
    if not item:
        return {"status": "error", "detail": f"{ttype} slug={slug} not found"}
    content = item.get("content", {})
    raw = content.get("raw", "") if isinstance(content, dict) else str(content)
    print(raw)
    return {"id": item["id"], "slug": slug, "content": raw}


def action_write_template(auth, env, args):
    template_id = getattr(args, "template_id", None)
    content_file = getattr(args, "content_file", None)
    if not template_id or not content_file:
        return {"status": "error", "reason": "--template-id and --content-file required"}
    ttype = getattr(args, "template_type", "template")
    with open(content_file) as f:
        new_content = f.read()
    endpoint = f"wp/v2/templates/{template_id}" if ttype == "template" else f"wp/v2/template-parts/{template_id}"
    s, r = auth.rest("POST", endpoint, {"content": new_content})
    print(f"  write-template: HTTP {s}")
    return {"status": "ok" if s == 200 else "error", "http": s}


# ── Main ───────────────────────────────────────────────────────────────────────
ACTION_MAP = {
    "auth-resolve":    action_auth_resolve,
    "audit-live":      action_audit_live,
    "install-yoast":   action_install_yoast,
    "configure-yoast": action_configure_yoast,
    "inject-schema":   action_inject_schema,
    "fix-h1":          action_fix_h1,
    "set-meta":        action_set_meta,
    "purge-cache":     action_purge_cache,
    "read-template":   action_read_template,
    "write-template":  action_write_template,
}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("company_slug")
    parser.add_argument("--action", required=True, choices=list(ACTION_MAP.keys()))
    parser.add_argument("--url")
    parser.add_argument("--post-id", dest="post_id")
    parser.add_argument("--seo-title", dest="seo_title")
    parser.add_argument("--meta-desc", dest="meta_desc")
    parser.add_argument("--post-title", dest="post_title")
    parser.add_argument("--schema-file", dest="schema_file")
    parser.add_argument("--schema-type", dest="schema_type")
    parser.add_argument("--target")
    parser.add_argument("--slug")
    parser.add_argument("--template-id", dest="template_id")
    parser.add_argument("--template-type", dest="template_type", default="template")
    parser.add_argument("--content-file", dest="content_file")
    parser.add_argument("--company-or-person", dest="company_or_person", default="person")
    parser.add_argument("--name")
    parser.add_argument("--instagram")
    parser.add_argument("--facebook")
    parser.add_argument("--linkedin")
    args = parser.parse_args()

    env = load_env(args.company_slug)
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    args._env_path = os.path.join(base, "companies", args.company_slug, ".env")

    auth = WPAuth(
        site_url=env["WP_SITE_URL"],
        username=env["WP_USERNAME"],
        password=env["WP_APP_PASSWORD"],
        company_slug=args.company_slug,
    ).resolve()

    result = ACTION_MAP[args.action](auth, env, args)
    print("\n[wp-technical] Done.")
    print(json.dumps({"action": args.action, "result": result}, indent=2, default=str))
