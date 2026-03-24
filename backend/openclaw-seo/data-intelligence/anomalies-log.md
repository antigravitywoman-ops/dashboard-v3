# Anomalies Log — Arpit Sharma Writing

> Append-only log of detected anomalies and recommended actions.
> Written by data-intelligence agent during snapshot cycles.

---

## 2026-03-15T20:00:00Z — WARNING
**Signal**: API credentials missing — snapshot populated via browser fallback
**Metric**: Data Availability — Previous: N/A / Current: Partial / Delta: N/A
**Affected**: GSC, GA4, Serper APIs
**Recommended Action**: Configure GOOGLE_SERVICE_ACCOUNT_JSON, GA4_PROPERTY_ID, GSC_SITE_URL, and SERPER_API_KEY in company .env to enable live data collection

---

## 2026-03-15T20:00:00Z — INFO
**Signal**: First snapshot — baseline established
**Metric**: Snapshot Generation — Previous: None / Current: Created / Delta: N/A
**Affected**: current-snapshot.md
**Recommended Action**: No action needed. This is the first snapshot for the company.
