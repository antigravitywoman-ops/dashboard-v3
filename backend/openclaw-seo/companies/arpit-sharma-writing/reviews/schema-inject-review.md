# Review: schema-inject — Person + Organization + WebSite Schema
**Task ID**: task-arpit-sharma-writing-schema-inject-1773585000000
**Status**: waiting-human — WP Application Password not configured
**Generated**: 2026-03-15T15:00:00.000Z
**Agent**: model-local (seo-orchestrator proxy)

---

## Blocker

`WP_APP_PASSWORD` in `.env` is the account login password — WordPress REST API rejects login passwords.

**To unblock:**
1. Go to **wp-admin → Users → Profile → scroll to "Application Passwords"**
2. Create one named `openclaw-seo` → copy the generated key (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
3. Update `/home/dev/openclaw-seo/companies/arpit-sharma-writing/.env`:
   ```
   WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
   ```
4. Also update `about/missing-dependencies.md` — mark `WP_APP_PASSWORD` status to `present`

---

## Audit Findings (live site, scraped 2026-03-15)

| Page | Schemas Found | Status |
|------|--------------|--------|
| / (homepage) | 0 | MISSING |
| /about-me/ | 0 | MISSING |
| /stoics-mentorship-upsc/ | 0 | MISSING |

**Gap IDs addressed**: ZERO-SCHEMA-MARKUP, NO-PERSON-SCHEMA, NO-AUTHOR-CREDENTIALS-PAGE

---

## Option A: PHP Snippet (apply now, no API needed)

Install the "Code Snippets" plugin (free) → New Snippet → paste → Activate.
OR: wp-admin → Appearance → Theme File Editor → functions.php → paste at end → Save.

```php
<?php
/**
 * Arpit Sharma Writing — SEO Schema Baseline
 * Injected by: openclaw-seo model-local 2026-03-15
 * Schemas: Person (/about-me/), Organization + WebSite (/)
 */
function openclaw_inject_schema() {
    $schemas = [];

    if ( is_front_page() || is_home() ) {
        $schemas[] = array(
            '@context'    => 'https://schema.org',
            '@type'       => 'Organization',
            'name'        => 'Arpit Sharma Writing',
            'url'         => 'https://arpitsharmawriting.com',
            'description' => 'Personal brand of Arpit Sharma — Indian author and UPSC mentor from Bhopal. Home to his books, blog on personal development, and Stoics Mentorship for UPSC 2027.',
            'founder'     => array( '@type' => 'Person', 'name' => 'Arpit Sharma' ),
            'sameAs'      => array(
                'https://medium.com/@arpitsharmawriting',
                'https://www.instagram.com/arpitsharmawriting',
                'https://www.facebook.com/arpitsharmawrites',
                'https://linktr.ee/iarpitspeaks',
            ),
        );
        $schemas[] = array(
            '@context'        => 'https://schema.org',
            '@type'           => 'WebSite',
            'url'             => 'https://arpitsharmawriting.com/',
            'name'            => 'Arpit Sharma Writing',
            'potentialAction' => array(
                '@type'       => 'SearchAction',
                'target'      => array(
                    '@type'       => 'EntryPoint',
                    'urlTemplate' => 'https://arpitsharmawriting.com/?s={search_term_string}',
                ),
                'query-input' => 'required name=search_term_string',
            ),
        );
    }

    if ( is_singular() && 'about-me' === get_post_field( 'post_name', get_the_ID() ) ) {
        $schemas[] = array(
            '@context'    => 'https://schema.org',
            '@type'       => 'Person',
            'name'        => 'Arpit Sharma',
            'url'         => 'https://arpitsharmawriting.com/about-me/',
            'jobTitle'    => 'Author, Journalist & UPSC Mentor',
            'description' => 'Indian author from Bhopal. Published debut novel Far From Pretension at 17. Author of The Answers Within (4.69/5 on Goodreads, 123+ reviews). Former Junior Editor at TelecomTalk with 20M+ page views. Founder of Stoics Mentorship for UPSC 2027.',
            'address'     => array(
                '@type'           => 'PostalAddress',
                'addressLocality' => 'Bhopal',
                'addressRegion'   => 'Madhya Pradesh',
                'addressCountry'  => 'IN',
            ),
            'sameAs' => array(
                'https://medium.com/@arpitsharmawriting',
                'https://www.instagram.com/arpitsharmawriting',
                'https://www.facebook.com/arpitsharmawrites',
                'https://linktr.ee/iarpitspeaks',
            ),
            'knowsAbout' => array( 'Self-Help', 'Personal Development', 'UPSC Preparation', 'Creative Writing', 'Mentorship' ),
        );
    }

    foreach ( $schemas as $schema ) {
        echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>' . "\n";
    }
}
add_action( 'wp_head', 'openclaw_inject_schema', 5 );
```

---

## Option B: Once WP_APP_PASSWORD is fixed

Re-queue this task: set `status` back to `pending` in `companies/<slug>/memory/tasks/queue.json` and run heartbeat.
The cms-wordpress skill will handle injection automatically via REST API.

---

## Validation (after applying either option)

1. https://search.google.com/test/rich-results → test `https://arpitsharmawriting.com/`
   - Expect: Organization type, WebSite type — zero errors
2. https://search.google.com/test/rich-results → test `https://arpitsharmawriting.com/about-me/`
   - Expect: Person type — zero errors
