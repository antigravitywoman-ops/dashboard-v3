# OpenClaw SEO — Dev Changelog

All notable platform development changes are logged here.

---

## [Unreleased]

### Frontend Redesign — Phase 0–10 Complete

#### Tasks Page (Phase 3)
- **`api.ts`**: Added `deleteTask(slug, taskId)` — DELETE endpoint for task removal
- **`tasks/page.tsx`**: Massive overhaul
  - **Delete button**: Added `deleteMutation` + "Danger Zone" section in `TaskDetailPanel` with `Trash2` icon
  - **Re-open tasks**: `completed` and `cancelled` tasks now show "Re-open" action in detail panel
  - **Bulk actions**: Checkbox column added to every task row; bulk action bar (Complete All / Delete All / Clear) appears when selection is active
  - **Sort options**: Sort dropdown added to filter bar — Status (default), Date Updated, Priority
  - **CSS var sweep**: All hardcoded hex colors replaced — status badges, priority indicators, borders, backgrounds, text throughout the page
- **`activity-feed.tsx`**: CSS var sweep + `onTaskClick` prop added
  - All hardcoded hex colors → CSS vars
  - Rows now clickable — calls `onTaskClick(task)` when clicked (for opening TaskDetailPanel)
- **`globals.css`**: Added status hover/border tokens for CSS var sweep
  - `--status-success-hover`, `--status-success-border`
  - `--status-warning-hover`, `--status-warning-border`
  - `--status-error-hover`, `--status-error-border`
  - `--accent-border`

#### Content Page (Phase 4)
- **`api.ts`**: `publishContent` now accepts `scheduledAt?: string | null` — passes `scheduled_at` query param to API
- **`content/page.tsx`**: Complete overhaul
  - **Submit for Review**: Draft items now show "Submit for Review" (→ `in-review`) + "Quick Approve" buttons in ContentCard
  - **Scheduling**: PublishModal now has Publish Now / Schedule toggle with date + time native inputs; `scheduledAt` passed to API
  - **Bulk approve/reject**: Checkbox column added to ContentCard rows; fixed bottom floating action bar (Approve All / Reject All / Clear) with `Promise.allSettled` partial-failure handling
  - **Button label fix**: Hero "New Task" → "Generate Content"
  - **CSS var sweep**: Complete — every hardcoded hex across ViewDraftModal, PublishModal, ContentCard, ContentCardSkeleton, and the main page replaced with CSS vars
  - `indigo` variant used for primary publish button
  - `accent-border` CSS token used for keyword pill borders

#### Reports Page (Phase 5)
- **`data-charts.tsx`**: Complete overhaul
  - **Empty states**: All 4 chart components (`GscMetricsChart`, `TopQueriesChart`, `KeywordChangesChart`, `TopPagesChart`) now show `ChartEmptyState` UI (icon + message + CTA) instead of silent `return null`
  - `GscMetricsChart`: Guards on `hasData` before rendering; empty state shown when no GSC data
  - **CSS var sweep**: All hardcoded hex replaced — tooltips, grid strokes, axis ticks, delta indicators, bar fills, legend dots, hover backgrounds
  - Bar fills updated: `#A78BFA` → `var(--accent)`, `#2DD4BF` → `var(--accent-teal)`, status fills → `var(--status-success)` / `var(--status-error)`
#### Login Page (Phase 7)
- **`login/page.tsx`**: Complete overhaul
  - **Password visibility toggle**: `Eye`/`EyeOff` button inside absolute-positioned input; `showPassword` state drives `type` attr
  - **Remember me checkbox**: Below password field with `accent-[var(--accent)]` checkbox styling
  - **Design refresh**: Removed `shadow-2xl shadow-black/40` from card; removed `bg-[#A78BFA]/5` and `bg-[#2DD4BF]/5` ambient glow divs; replaced gradient divider `from-#A78BFA to-#2DD4BF` with clean `bg-[var(--accent)]` line
  - **Button variant**: `purple` → `indigo` (consistent with Phase 1 button system)
  - **CSS var sweep**: Complete — card bg, borders, headings, labels, inputs, placeholders, error state, focus rings all → CSS vars; error state uses `--status-error`, `--status-error-bg`, `--status-error-border`

#### Reports Page (Phase 5)
  - **ReactMarkdown**: Sheet content now renders via `ReactMarkdown` + `remarkGfm` — supports GFM tables, strikethrough, task lists in report sheets
  - **GA4 metrics**: Replaced raw `Object.entries()` loop with structured metric cards — Sessions, Users, Page Views, Bounce Rate; bounce rate formatted as `%`
  - **CSS var sweep**: Complete — every hardcoded hex across `SheetValidationDot`, `ReportPeriodAccordion`, `TechnicalAuditCard`, `AuditSummaryCard`, `ActionItems`, empty states, sheet viewer replaced with CSS vars
  - Status severity badges use `--status-success` / `--status-error` / `--status-warning` / `--status-info`
  - Fixed: `<pre>` wrapper on ReactMarkdown → `<div className="font-mono">` (blocks inside pre are invalid HTML)
  - Fixed: 2 bar fill colors `#F59E0B` / `#3B82F6` in `data-charts.tsx` → `var(--status-warning)` / `var(--status-info)`
  - Fixed: 4 hardcoded `rgba(...)` backgrounds in audit health/summary → `var(--status-xxx-bg)` tokens

#### Chat Widget (Phase 6)
- **`chat-widget.tsx`**: Complete overhaul
  - **Markdown rendering**: Assistant messages now render via `ReactMarkdown` + `remarkGfm` — custom components for code (inline vs block), links, headings, lists, blockquotes, tables, strong; applied to both static messages and streaming content
  - **TypeScript fix**: `code` component uses `inline: _inline` + `as any` cast — `inline` prop was removed from react-markdown v9 types
  - **Dynamic suggestions**: `usePathname` drives route-aware suggestions — `/tasks`, `/content`, `/reports`, `/analytics` each get contextual prompts; default for all other routes
  - **Error feedback**: Both `console.error` calls replaced with `toast()` — streaming error and chat error each show error toast
  - **FAB redesign**: `Zap` → `MessageSquare` icon; gradient `from-#7C3AED to-#A78BFA` + glow shadow → clean `bg-[var(--accent)]`; shadow-lg/shadow-xl/glow stripped
  - **Header avatar**: `Zap` → `MessageSquare`; gradient → `bg-[var(--accent)]`; glow shadow removed
  - **CSS var sweep**: Complete — every hardcoded hex across FAB, chat panel, header, messages, input, suggestions replaced with CSS vars

#### Design System (Phase 0)
- **`globals.css`**: Complete color system overhaul — Linear-Inspired Premium Dark
  - `--bg-primary`: `#0A0A0B` → `#09090B` (rich dark)
  - `--bg-surface`: `#111113` → `#0F0F11`
  - `--accent`: `#A78BFA` → `#6366F1` (purple → indigo)
  - `--accent-hover`: `#7C3AED` → `#4F46E5`
  - `--accent-teal`: `#2DD4BF` → `#14B8A6` (warmer teal)
  - All borders refined: `--border-subtle`, `--border`, `--border-strong`
  - All shadows cleaned: glow/tint shadows removed, pure dark shadows only
  - Dead code removed: `html.dark-bright`, `.glow-purple`, `.glow-teal`, `--shadow-glow`
  - Tailwind mapping layer kept and updated with CSS vars
  - Stagger utilities extended: stagger-7 through stagger-12
- **`layout.tsx`**: Inter font loaded via `next/font/google` (replaces Plus Jakarta Sans)
  - Favicon updated to indigo gradient

#### Core Components (Phase 1)
- **`status-badge.tsx`**: 100+ hardcoded hex strings replaced with CSS vars
  - `in-progress`, `pending`, `draft`, `in-review`: purple → indigo
  - All status dot/badge/text colors: CSS var references
- **`button.tsx`**: Indigo as primary variant
  - `indigo` variant added: `bg-[var(--accent)]` → `#6366F1`
  - `indigo-ghost` variant added
  - Focus ring updated: `#A78BFA` → `var(--accent)`
  - All variant colors: CSS var references
  - `teal` and `teal-ghost` updated to warmer teal
  - Legacy `purple` / `purple-ghost` kept as aliases (backwards compatible)
- **`badge.tsx`**: CSS var sweep
  - All hardcoded colors → CSS var references
  - `indigo` variant added as alias for default
  - `teal` updated to warmer teal
  - `secondary`: `#222225` → `var(--bg-elevated)`

#### Layout & Navigation (Phase 2)
- **`sidebar.tsx`**: Complete CSS var sweep + indigo design
  - Logo: Removed gradient `from-#7C3AED to-#A78BFA` + glow shadow → clean `bg-[var(--accent)]` indigo square
  - Active nav item: `bg-[rgba(167,139,250,0.12)] text-[#A78BFA]` → `bg-[var(--accent-subtle)] text-[var(--accent)]`
  - Border-left accent: `#A78BFA` → `var(--accent)`
  - Inactive nav: `#71717A` → `var(--text-secondary)`, hover `#A1A1AA` → `var(--text-primary)`, hover bg `#222225` → `var(--bg-elevated)`
  - User avatar: Removed gradient + glow → `bg-[var(--accent)]`
  - All text colors: `#FAFAFA` → `var(--text-primary)`, `#71717A` → `var(--text-muted)`, `#52525B` → `var(--text-disabled)`
  - Sign out hover: `text-[#EF4444]` → `var(--status-error)`, `bg-[rgba(239,68,68,0.08)]` → `var(--status-error-bg)`
  - Background: `#18181B` → `var(--bg-card)`, borders `#27272A` → `var(--border)`
  - **Analytics nav link added**: `TrendingUp` icon, href `/dashboard/analytics`
- **`header.tsx`**: Complete CSS var sweep
  - Background: `#111113` → `var(--bg-surface)`
  - Company selector bg: `#222225` → `var(--bg-elevated)`, hover `#222225` → `var(--bg-elevated)`
  - Company selector border: `#3F3F46` → `var(--border-strong)`
  - All text: `#FAFAFA` → `var(--text-primary)`, `#71717A` → `var(--text-muted)`, `#A1A1AA` → `var(--text-secondary)`
  - Active dropdown item: `bg-[rgba(167,139,250,0.12)] text-[#A78BFA]` → `bg-[var(--accent-subtle)] text-[var(--accent)]`
  - Status indicator: `#22C55E` → `var(--status-success)`, `#52525B` → `var(--text-disabled)`
  - Dropdown border: `#27272A` → `var(--border)`, `#3F3F46` → `var(--border-strong)`
  - Paused label: `#52525B` → `var(--text-disabled)`
  - Industry text: `#71717A` → `var(--text-muted)`
- **`theme-toggle.tsx`**: CSS var sweep
  - `text-[#71717A]` → `var(--text-muted)`, `hover:text-[#A78BFA]` → `hover:text-[var(--accent)]`
  - Hover bg: `#222225` → `var(--bg-elevated)`
  - Active glow: `#A78BFA` → `var(--accent)`, glow color updated to indigo
- **`dashboard-shell.tsx`**: Mobile backdrop `bg-black/60` → `bg-[var(--bg-primary)]/60`

#### Team Page (Phase 9)
- **`team/page.tsx`**: Complete CSS var sweep
  - Avatar: `bg-gradient-to-br from-#7C3AED to-#A78BFA` + glow shadow → `bg-[var(--accent)]`
  - InviteUserModal: All inputs/labels/text → CSS vars; focus rings → `var(--accent)`; role buttons active/inactive → `var(--accent-subtle)` / `var(--border)` / `var(--border-strong)`
  - UserRow: hover bg → `var(--bg-surface)`, name → `var(--text-primary)`, email → `var(--text-muted)`, company pills → `var(--bg-elevated)` / `var(--border)`, settings button → `var(--text-muted)` / `var(--accent)`
  - RoleSelectPopover trigger: `text-[#71717A]` → `var(--text-muted)`
  - All card/border/divider backgrounds → `var(--bg-card)` / `var(--border)`
  - Empty state icons: `#52525B` → `var(--text-disabled)`, text → `var(--text-muted)`
  - `Badge variant="purple"` → `Badge variant="indigo"` throughout
  - `DialogTitle` for remove: `text-[#EF4444]` → `var(--status-error)`

#### Settings Page (Phase 9)
- **`settings/page.tsx`**: Complete CSS var sweep + bug fixes
  - ProfileTab: Avatar `from-#7C3AED to-#A78BFA` → `bg-[var(--accent)]`, all text → CSS vars, `Badge variant="purple"` → `"indigo"`, labels → `var(--text-muted)`, email note → `var(--text-disabled)`
  - CredentialsTab: `colorMap` rgba values → CSS var references (`var(--accent-subtle)`, `var(--accent-teal-subtle)`, `var(--status-info-bg)`, `var(--status-warning-bg)`); all cards/borders → `var(--bg-card)` / `var(--border)`; description text → `var(--text-muted)`; edit button → `var(--accent)` / `var(--accent-hover)`; inline code values → `var(--bg-surface)` / `var(--border)`
  - PlanTab: All card backgrounds → `var(--bg-card)`; phase metric cards → `var(--bg-surface)` / `var(--border)` / `var(--text-muted)` / `var(--text-primary)`; focus area pills → `var(--accent-subtle)` / `var(--accent)` / `var(--accent-border)`; success metrics bg → `var(--bg-card)`; toggle icons/line-through → `var(--status-success)` / `var(--text-disabled)`; secondary metric text → `var(--text-secondary)`
  - ScopeTab: All card backgrounds → `var(--bg-card)`; geographic scope buttons active → `var(--accent-subtle)` / `var(--border)`; inactive → `var(--bg-surface)` / `var(--border-strong)`; text → `var(--text-muted)` / `var(--text-secondary)` / `var(--text-disabled)`
  - DangerZone: Error bg/border → `var(--status-error-bg)` / `var(--status-error-border)`; icon → `var(--status-error)`; `h3` → `var(--status-error)`; text → `var(--text-muted)` / `var(--text-primary)`; input focus → `var(--status-error-border)` / `var(--status-error)`
  - Danger tab trigger icon: `text-[#EF4444]` → `var(--status-error)`
  - **Bug fix**: Plan tab trigger used `Target` icon (same as Scope) → `TrendingUp` (correct for plan context)
  - **Bug fix**: `ScopeTab` now has `hasUnsavedChanges` guard — `useRef` captures initial values, `useEffect` computes dirty state, `onHasChanges` prop notifies parent; `SettingsPage` intercepts tab switch with `window.confirm()` when leaving Scope tab with unsaved changes
  - `Button variant="purple"` → `Button variant="indigo"` throughout

#### Global Polish (Phase 10)
- **`empty-state.tsx`**: Complete CSS var sweep — all 6 SVG icons (content, reports, team, tasks, settings, generic) replaced hardcoded hex fills/strokes with CSS vars; glow div → `var(--accent-subtle)`; title `text-[#A1A1AA]` → `var(--text-secondary)`; description `text-[#52525B]` → `var(--text-disabled)`; `Button variant="purple"` → `Button variant="indigo"`
- **`tasks/page.tsx`**: EmptyState now shows "Create Task" action button when `statusFilter === 'all'` — opens `NewTaskModal`
- **`reports/page.tsx`**: "No reports" empty state replaced inline div → `EmptyState` component with "Configure Scope" action linking to `/dashboard/settings`
- **`content/page.tsx`**: "No content" empty state replaced inline div → `EmptyState` component with contextual description (pipeline explanation when `activeFilter === 'all'`, otherwise status-specific message) and "Configure Scope" action
- **`content-pipeline.tsx`**: Complete CSS var sweep + mobile redesign
  - All hardcoded hex: `#18181B` → `var(--bg-card)`, `#27272A` → `var(--border)`, `#111113` → `var(--bg-surface)`, `#71717A` → `var(--text-muted)`, `#FAFAFA` → `var(--text-primary)`, `#A78BFA` / `#7C3AED` → `var(--accent)` / `var(--accent-hover)`, `#22C55E` → `var(--status-success)`, `#2DD4BF` → `var(--accent-teal)`, `#3F3F46` → `var(--border-strong)`, `#7C3AED` glow → `var(--accent-subtle)` / `var(--accent-border)`
  - Stage config: `color`/`activeColor` fields removed from `stages[]` array (CSS handles all colors)
  - Desktop connector: `text-[#27272A]` → `text-[var(--border)]`
  - Mobile dots: vertical flow indicator replaces hidden arrows on mobile — `lg:hidden` dots with `bg-[var(--accent)]` when count > 0, `bg-[var(--border)]` when 0; connector lines use `bg-[var(--border-subtle)]`; entire desktop section wrapped in `hidden lg:flex`
  - Arrow icon: `text-[#A78BFA]` → `var(--accent)`, `hover:text-[#7C3AED]` → `hover:var(--accent-hover)`

#### Dashboard Overview (Phase 8)
- **`dashboard/page.tsx`**: Quick Actions Bar added between `SystemStatusBanner` and 4-metric grid
  - **New Task**: `Button variant="indigo"` + `Zap` icon, opens `NewTaskModal` directly on dashboard
  - **Refresh**: Outline button with `RefreshCw` + spin animation on `isRefreshing`
  - **View Content**: Ghost button with `FileText` icon, navigates to `/dashboard/content`
  - `NewTaskModal` imported and rendered at bottom of page
  - `totalWeeks` prop on `PhaseProgressBar` now reads `Number(activePlan?.total_weeks) || 12`
  - Sections renumbered (4-metric grid → 4, Content Pipeline → 6, Activity+Metrics → 7)
- **`phase-progress-bar.tsx`**: Complete CSS var sweep + badge update
  - All hardcoded hex replaced: card bg, border, text-primary, text-secondary, text-muted, text-disabled, accent
  - Phase segments: `from-#22C55E to-#2DD4BF` → `from-[var(--status-success)] to-[var(--accent-teal)]`; current `from-#A78BFA` → `bg-[var(--accent)]`; future `bg-[#27272A]` → `bg-[var(--border)]`
  - Week progress bar: gradient → `from-[var(--accent)] to-[var(--accent-teal)]`
  - `Badge variant="purple"` → `Badge variant="indigo"`
- **`overview/greeting-hero.tsx`**: CSS var sweep
  - Gradient accent line `from-#A78BFA to-#2DD4BF` → `bg-[var(--accent)]`
  - `text-[#FAFAFA]` → `text-[var(--text-primary)]`
  - `text-[#71717A]` → `text-[var(--text-muted)]`
  - Button ghost variant default styles (removed inline overrides)
- **`api.ts`**: Added `total_weeks?: string | number` to `Plan` interface — reads from `active-plan.json`

### Fixed
- **`globals.css`**: Critical Tailwind typo — `@tailwind utilities';` → `@tailwind utilities;` (would silently break Tailwind compilation)
- **`globals.css`**: Restructured `:root` (tokens) to top-level, `@layer base` (reset) placed after — fixes CSS specificity issue that gave `:root` unusual `(0,2,0)` specificity instead of standard `(0,1,0)`
- **`globals.css`**: Added missing `--accent-teal-hover: #0D9488;` token
- **`button.tsx`**: Teal variant hover — `hover:bg-[#0D9488]` → `hover:bg-[var(--accent-teal-hover)]` (now uses CSS var token)

### Added
- `dev/` folder for platform versioning and developer context
  - `plans_v1.md` — initial platform scope
  - `plans_v2.md` — backend/platform maintenance plan
  - `plans_v3_frontend_redesign.md` — **current priority**: frontend redesign + feature gaps
  - `CONTEXT.md` — quick reference for platform developers
  - `CHANGELOG.md` — this file
