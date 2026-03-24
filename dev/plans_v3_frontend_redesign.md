# OpenClaw SEO — Frontend Redesign & Feature Plan v3

**Created:** 2026-03-24
**Status:** Complete — All Phases Done
**Supersedes:** plans_v2.md (frontend section)
**Files Modified:** See Implementation Order at bottom

---

## Overview

Transform the OpenClaw SEO dashboard from a "dark indie game" aesthetic into a **premium SaaS command center** inspired by Linear, Anthropic, and Vercel. Simultaneously close all UX/workflow gaps.

### Design Direction: "Linear-Inspired Premium Dark"

| Aesthetic Pillar | Rule |
|---|---|
| **No glows** | No gradient glows on surfaces. Shadows are subtle and purposeful. |
| **Indigo over Purple** | `#6366F1` as the single primary accent — professional, not playful. |
| **Very dark grays, not pure black** | `#09090B` background gives depth without harshness. |
| **Clean 1px borders everywhere** | Structure through lines, not shadows. |
| **Generous whitespace** | More padding, more breathing room. |
| **Typography does hierarchy work** | Sizes and weights carry meaning. |

### Reference Palettes

| System | Background | Surface | Primary Accent | Border |
|---|---|---|---|---|
| Linear | `#0D0D0D` | `#171717` | `#6366F1` (Indigo) | `#262626` |
| Anthropic | `#0A0A0A` | `#111111` | `#8B5CF6` (Violet) | `#1F1F1F` |
| Vercel | `#000000` | `#111111` | `#000000` | `#222222` |
| **OpenClaw — NEW** | `#09090B` | `#0F0F11` / `#18181B` | `#6366F1` (Indigo) | `#27272A` |

---

## Phase 0 — Design System Foundation

### 0.1 globals.css — Complete Color System Overhaul

**File:** `frontend/seo-dashboard/src/app/globals.css`

| Token | Old Value | New Value |
|---|---|---|
| `--bg-primary` | `#0A0A0B` | `#09090B` |
| `--bg-surface` | `#111113` | `#0F0F11` |
| `--bg-card` | `#18181B` | `#18181B` *(keep)* |
| `--bg-elevated` | `#222225` | `#222228` |
| `--bg-hover` | `#27272A` | `#2A2A2E` |
| `--border-subtle` | `#27272A` | `#1F1F23` |
| `--border` | `#3F3F46` | `#27272A` |
| `--border-strong` | `#52525B` | `#3F3F46` |
| `--accent` | `#A78BFA` | `#6366F1` |
| `--accent-hover` | `#7C3AED` | `#4F46E5` |
| `--accent-subtle` | `rgba(167,139,250,0.12)` | `rgba(99,102,241,0.12)` |
| `--accent-glow` | `rgba(167,139,250,0.25)` | `rgba(99,102,241,0.20)` |
| `--accent-dim` | `rgba(124,58,237,0.6)` | `rgba(79,70,229,0.6)` |
| `--accent-teal` | `#2DD4BF` | `#14B8A6` |

**Remove dead code:**
- Delete `html.dark-bright .accent-glow-bright` rules (lines ~272-278)
- Delete `.glow-purple`, `.glow-teal` utility classes
- Delete `--shadow-glow` and `--shadow-glow-sm`

**Refine shadows** — remove color-tinted glow shadows:
```css
--shadow-glow:       /* DELETE entirely */
--shadow-glow-sm:    /* DELETE entirely */
--shadow-sm:   0 1px 2px rgba(0,0,0,0.5);
--shadow-md:   0 4px 6px rgba(0,0,0,0.5);
--shadow-lg:   0 8px 16px rgba(0,0,0,0.5);
```

### 0.2 Font Setup — Load Inter

**File:** `frontend/seo-dashboard/src/app/layout.tsx`

1. Add `next/font/google` import:
```ts
import { Inter, JetBrains_Mono } from 'next/font/google'
```

2. Configure fonts:
```ts
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
```

3. Update `globals.css` `--font-sans`: from `'Plus Jakarta Sans', ...` to `var(--font-inter), system-ui, sans-serif`

**Note:** `Plus Jakarta Sans` was referenced but never loaded — falls back to system fonts. Inter is loaded via Next.js and is the premium standard (Linear, Vercel, GitHub all use Inter or similar).

### 0.3 Inline Color Audit

Replace ALL hardcoded hex values with CSS variable references across all files:

| File | Inline Colors to Replace |
|---|---|
| `sidebar.tsx` | ~30 hardcoded: `#18181B`, `#27272A`, `#7C3AED`, `#A78BFA`, `#FAFAFA`, `#71717A`, `#EF4444` |
| `header.tsx` | ~25 hardcoded: `#111113`, `#27272A`, `#222225`, `#3F3F46`, `#FAFAFA`, `#A1A1AA`, `#A78BFA`, `#22C55E`, `#52525B` |
| `tasks/page.tsx` | ~20 hardcoded: status colors, priority colors |
| `content/page.tsx` | ~15 hardcoded: `#111113`, `#A78BFA`, `#7C3AED`, `#18181B`, `#27272A` |
| `reports/page.tsx` | ~15 hardcoded: `#18181B`, `#27272A`, `#111113`, status colors |
| `login/page.tsx` | ~10 hardcoded: `#0A0A0B`, `#18181B`, `#27272A`, `#A78BFA`, `#2DD4BF` |
| `chat-widget.tsx` | ~15 hardcoded: `#7C3AED`, `#A78BFA`, gradient |
| `activity-feed.tsx` | ~8 hardcoded |
| `dashboard/page.tsx` | ~5 hardcoded |
| `overview/*` components | Various |
| `dashboard-shell.tsx` | Various |
| `team/page.tsx` | Various |
| `settings/page.tsx` | Various |

---

## Phase 1 — Core UI Components

### 1.1 StatusBadge (`src/components/ui/status-badge.tsx`)

1. Replace ALL hardcoded hex colors with CSS variables:
   - `#A78BFA` → `var(--accent)`
   - `#7C3AED` → `var(--accent-hover)`
   - `#2DD4BF` → `var(--accent-teal)`
   - `#22C55E`, `#F59E0B`, `#EF4444`, `#3B82F6` → CSS vars
2. Update `in-progress` status to Indigo: dot `bg-[var(--accent)]`, pulse `true`
3. Update `pending` and `draft` statuses to Indigo dot

### 1.2 Button (`src/components/ui/button.tsx`)

1. Replace `purple` variant from `#7C3AED/#A78BFA` to Indigo:
   ```css
   purple: 'bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)]
            active:scale-[0.98] shadow-sm hover:shadow-md',
   ```
2. Replace `purple-ghost`: `'bg-transparent text-[var(--accent)] hover:bg-[var(--accent-subtle)]'`
3. Remove `shadow-[#7C3AED]/20` from `purple` and shadow from send button
4. Replace focus ring from `#A78BFA` to `var(--accent)`
5. Add `indigo` variant as alias for `purple`

### 1.3 Badge, Card, Skeleton, MetricCard

- **Badge** (`src/components/ui/badge.tsx`): Replace purple accents with indigo CSS vars
- **Card** (`src/components/ui/card.tsx`): `bg-card` → `var(--bg-card)`
- **Skeleton** (`src/components/ui/skeleton.tsx`): Verify shimmer uses CSS vars
- **MetricCard** (`src/components/ui/metric-card.tsx`): Replace `accentColor="purple"` with indigo, clean up borders

---

## Phase 2 — Layout & Navigation

### 2.1 Sidebar (`src/components/sidebar.tsx`)

1. **Logo**: Remove gradient + glow box. Replace with clean Indigo square:
   ```tsx
   <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
     <Zap className="h-4 w-4 text-white" />
   </div>
   ```
   No glow shadow.
2. **Active nav item**: Replace purple with indigo:
   ```tsx
   isActive
     ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-l-[3px] border-[var(--accent)]'
     : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
   ```
3. **User avatar**: Remove gradient. Replace with `bg-[var(--accent)]`
4. **All hardcoded colors**: Replace with CSS variables

### 2.2 Header (`src/components/header.tsx`)

1. Company dropdown active item: Replace `#A78BFA` with `var(--accent)`
2. System status indicator: Keep green pulse for active. Use CSS vars
3. Background: `var(--bg-surface)` instead of hardcoded `#111113`
4. All inline hex → CSS variables
5. **ThemeToggle**: Wire up dark mode OR remove entirely. Don't leave dead UI.

### 2.3 Analytics Sidebar Link (`src/components/sidebar.tsx`)

**Add to navigation array:**
```tsx
{ name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
```
Import `TrendingUp` from lucide-react. The Analytics page at `analytics/page.tsx` exists but has no sidebar link — this makes it accessible.

### 2.4 Dashboard Shell (`src/components/dashboard-shell.tsx`)

- Replace all hardcoded colors with CSS variables
- Use `var(--bg-surface)` instead of hardcoded `#111113`

### 2.5 Breadcrumbs (NEW — Optional but Recommended)

**Add to `header.tsx`**: Below the company selector, add a breadcrumb showing current page:
```
Overview / Tasks
```
- Use `usePathname()` to detect current route
- Map routes to readable names
- Style with `text-xs text-[var(--text-muted)]` and `/` separators

---

## Phase 3 — Tasks Page

### 3.1 API: Add `deleteTask` (`src/lib/api.ts`)

```ts
export async function deleteTask(slug: string, taskId: string): Promise<void> {
  const VM_API_URL = process.env.NEXT_PUBLIC_VM_API_URL || 'http://localhost:3456'
  const res = await fetch(`${VM_API_URL}/companies/${slug}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) throw new ApiError(res.status, 'Failed to delete task')
}
```

### 3.2 TaskDetailPanel — Add Delete + Re-open

**File:** `src/app/(dashboard)/dashboard/tasks/page.tsx`

**Add to `STATUS_TRANSITIONS`:**
```tsx
completed: [{ label: 'Re-open', status: 'pending', variant: 'outline' }],
cancelled: [{ label: 'Re-open', status: 'pending', variant: 'outline' }],
```

**Add Delete button** (Danger Zone at bottom of panel, below Result section):
```tsx
{/* Danger Zone */}
<div className="pt-4 border-t border-[var(--border-subtle)]">
  <p className="text-[10px] text-[var(--text-disabled)] uppercase tracking-wider font-semibold mb-2">Danger Zone</p>
  <Button
    variant="destructive-outline"
    size="sm"
    onClick={() => {
      if (confirm(`Delete task "${task.hover_label || task.type}"? This cannot be undone.`)) {
        deleteMutation.mutate('__delete__')
      }
    }}
    className="gap-1.5"
  >
    <Trash2 className="h-3.5 w-3.5" />
    Delete Task
  </Button>
</div>
```

**Add deleteMutation:**
```tsx
const deleteMutation = useMutation({
  mutationFn: () => deleteTask(currentCompany!.slug, task!.id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', currentCompany?.slug] })
    queryClient.invalidateQueries({ queryKey: ['tasksRecent', currentCompany?.slug] })
    toast({ title: 'Task deleted', variant: 'success' })
    onClose()
  },
  onError: () => toast({ title: 'Failed to delete task', variant: 'error' }),
})
```

**Import:** `Trash2` from lucide-react, `deleteTask` from `@/lib/api`

### 3.3 Tasks Page — Bulk Actions + Sort

**Add state:**
```tsx
const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
const [sortOrder, setSortOrder] = useState<'status' | 'date' | 'priority'>('status')
```

**Sort dropdown** (add to filter bar):
```tsx
<select
  value={sortOrder}
  onChange={e => setSortOrder(e.target.value as any)}
  className="ml-auto px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)]"
>
  <option value="status">Sort: Status</option>
  <option value="date">Sort: Date Updated</option>
  <option value="priority">Sort: Priority</option>
</select>
```

**Sort logic:**
```tsx
const sortedTasks = [...filteredTasks].sort((a, b) => {
  if (sortOrder === 'date') {
    return (b.updated_at ? new Date(b.updated_at).getTime() : 0) -
           (a.updated_at ? new Date(a.updated_at).getTime() : 0)
  }
  if (sortOrder === 'priority') {
    const order = { critical: 0, high: 1, normal: 2, low: 3 }
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
  }
  const statusOrder = { in_progress: 0, pending_verification: 1, pending: 2, blocked: 3, completed: 4, cancelled: 5 }
  return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
})
```

**Checkbox column on TaskRow** + **Bulk action bar** (appears when `selectedTaskIds.size > 0`):
```tsx
{selectedTaskIds.size > 0 && (
  <div className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
    <span className="text-sm text-[var(--text-secondary)]">{selectedTaskIds.size} selected</span>
    <Button variant="outline" size="sm" onClick={() => bulkComplete()}>Complete All</Button>
    <Button variant="destructive-outline" size="sm" onClick={() => bulkDelete()}>Delete All</Button>
    <Button variant="ghost" size="sm" onClick={() => setSelectedTaskIds(new Set())}>Clear</Button>
  </div>
)}
```

### 3.4 Activity Feed — Open TaskDetailPanel

**File:** `src/components/activity-feed.tsx`

Add `onTaskClick` prop to ActivityFeed. When a task is clicked, show a lightweight popover with status, priority, progress, and a "View Details" link to `/dashboard/tasks?taskId={id}`.

---

## Phase 4 — Content Page

### 4.1 Submit for Review Action

**File:** `src/app/(dashboard)/dashboard/content/page.tsx`, `ContentCard` component

**Add to `ContentCard` actions for draft status:**
```tsx
{item.status === 'draft' && (
  <>
    <Button variant="outline" size="sm" onClick={onSubmitReview} className="gap-1.5">
      <Send className="h-3.5 w-3.5" />
      Submit for Review
    </Button>
    <Button variant="teal-ghost" size="sm" onClick={onApprove} className="gap-1.5">
      <CheckCircle className="h-3.5 w-3.5" />
      Quick Approve
    </Button>
  </>
)}
```

**Add `onSubmitReview` handler:** Mutates status to `in-review`.

### 4.2 Content Scheduling

**File:** `src/app/(dashboard)/dashboard/content/page.tsx`, `PublishModal` component

**Add scheduling state:**
```tsx
const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now')
const [scheduleDate, setScheduleDate] = useState('')
const [scheduleTime, setScheduleTime] = useState('')
```

**Toggle UI:**
```tsx
<div className="flex items-center gap-3 mb-4">
  <button onClick={() => setScheduleMode('now')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
    scheduleMode === 'now' ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-muted)]')}>
    Publish Now
  </button>
  <button onClick={() => setScheduleMode('schedule')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
    scheduleMode === 'schedule' ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'text-[var(--text-muted)]')}>
    Schedule
  </button>
</div>
```

**Date/time inputs** (shown when `scheduleMode === 'schedule'`):
```tsx
{scheduleMode === 'schedule' && (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="text-xs text-[var(--text-secondary)] mb-1 block">Date</label>
      <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm" />
    </div>
    <div>
      <label className="text-xs text-[var(--text-secondary)] mb-1 block">Time</label>
      <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm" />
    </div>
  </div>
)}
```

Update `onConfirm` to pass `scheduledAt: scheduleMode === 'schedule' ? \`${scheduleDate}T${scheduleTime}\` : null`.

### 4.3 Bulk Approve/Reject

**Add selection state + floating action bar:**
```tsx
const [selectedContent, setSelectedContent] = useState<Set<string>>(new Set())

{selectedContent.size > 0 && (
  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3
    bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg z-50">
    <span className="text-sm text-[var(--text-secondary)]">{selectedContent.size} selected</span>
    <Button variant="teal" size="sm" onClick={bulkApprove}>Approve All</Button>
    <Button variant="destructive-outline" size="sm" onClick={bulkReject}>Reject All</Button>
    <Button variant="ghost" size="sm" onClick={() => setSelectedContent(new Set())}>
      <X className="h-4 w-4" />
    </Button>
  </div>
)}
```

Add `bulkApprove` and `bulkReject` mutations using `Promise.all`.

### 4.4 Button Label Fix

**File:** `src/app/(dashboard)/dashboard/content/page.tsx` line ~459
Change "New Task" → "Generate Content" on the button in the PageHero actions.

---

## Phase 5 — Reports Page

### 5.1 Chart Empty States

**File:** Chart components in `src/components/ui/data-charts.tsx`

Wrap chart render areas with empty state:
```tsx
{(!data || data.length === 0) ? (
  <div className="flex flex-col items-center justify-center h-48 text-center">
    <BarChart3 className="h-8 w-8 text-[var(--text-disabled)] mb-2" />
    <p className="text-sm text-[var(--text-muted)]">No data available</p>
    <p className="text-xs text-[var(--text-disabled)] mt-1">Connect GSC to see performance data</p>
  </div>
) : (
  <BarChart ... />
)}
```

### 5.2 GA4 Metrics — Better Display

**File:** `src/app/(dashboard)/dashboard/reports/page.tsx` lines ~528-536

Replace raw grid with structured metric cards:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
  {[
    { key: 'sessions', label: 'Sessions', value: snapshot.ga4.sessions },
    { key: 'users', label: 'Users', value: snapshot.ga4.users },
    { key: 'pageviews', label: 'Page Views', value: snapshot.ga4.pageviews },
    { key: 'bounce_rate', label: 'Bounce Rate', value: snapshot.ga4.bounce_rate },
  ].map(metric => (
    <div key={metric.key} className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">{metric.label}</p>
      <p className="text-2xl font-bold text-[var(--text-primary)]">
        {typeof metric.value === 'number'
          ? metric.key === 'bounce_rate' ? `${metric.value.toFixed(1)}%` : metric.value.toLocaleString()
          : '—'}
      </p>
    </div>
  ))}
</div>
```

Add trend indicators (↑ green / ↓ red) if delta data is available.

### 5.3 Sheet Content — Markdown Render

**Install:**
```bash
npm install react-markdown remark-gfm
```

**Update sheet viewer** in `reports/page.tsx`:
```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

<pre className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg p-4 border border-[var(--border)] max-h-[65vh] overflow-y-auto leading-relaxed">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {sheetContent.content || 'No content'}
  </ReactMarkdown>
</pre>
```

---

## Phase 6 — Chat Widget

### 6.1 Markdown Rendering

**Install:**
```bash
npm install react-markdown remark-gfm
```

**Render messages as markdown** (`src/components/chat-widget.tsx` line ~224):

Replace:
```tsx
<div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
```

With:
```tsx
<div className="text-sm leading-relaxed">
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      code({ inline, className, children, ...props }) {
        return inline ? (
          <code className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--accent)] font-mono text-xs" {...props}>{children}</code>
        ) : (
          <pre className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] overflow-x-auto mt-2">
            <code className="font-mono text-xs text-[var(--text-secondary)]" {...props}>{children}</code>
          </pre>
        )
      },
      a({ href, children }) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">{children}</a>
      },
      p({ children }) { return <p className="mb-2 last:mb-0">{children}</p> },
      ul({ children }) { return <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul> },
      ol({ children }) { return <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol> },
      strong({ children }) { return <strong className="font-semibold text-[var(--text-primary)]">{children}</strong> },
    }}
  >
    {msg.content}
  </ReactMarkdown>
</div>
```

### 6.2 Dynamic Suggestions

Replace hardcoded static array with route-aware suggestions:
```tsx
import { usePathname } from 'next/navigation'

const getSuggestions = () => {
  if (pathname.includes('/tasks')) {
    return ['What tasks are blocked?', 'Any high priority tasks?', 'Summarize my task queue']
  }
  if (pathname.includes('/content')) {
    return ['What content is in review?', 'Show published content', 'Content pipeline status']
  }
  if (pathname.includes('/reports')) {
    return ['SEO recommendations for this week', 'What technical issues exist?', 'Keyword performance summary']
  }
  return ['What tasks are running?', 'Show recent content', 'SEO recommendations']
}
```

### 6.3 Error Feedback

Replace `console.error` calls with toast notifications:
```tsx
onError: () => toast({ title: 'Chat error', description: 'Failed to get response. Try again.', variant: 'error' })
```

### 6.4 FAB Redesign

Replace gradient glow button with clean indigo:
```tsx
<button className="... bg-[var(--accent)] text-white shadow-md hover:shadow-lg ...">
  <MessageSquare className="h-6 w-6" />
</button>
```
Replace `Zap` icon with `MessageSquare`.

---

## Phase 7 — Login Page

### 7.1 Password Visibility Toggle

**Add state:** `const [showPassword, setShowPassword] = useState(false)`

**Replace password input** with:
```tsx
<div className="relative">
  <input type={showPassword ? 'text' : 'password'} ... />
  <button type="button" onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>
```

Import `Eye`, `EyeOff` from lucide-react.

### 7.2 "Remember Me" Checkbox

Add below password field:
```tsx
<div className="flex items-center justify-between">
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-surface)] accent-[var(--accent)]" />
    <span className="text-sm text-[var(--text-secondary)]">Remember me</span>
  </label>
</div>
```

### 7.3 Design Refresh

- Remove `shadow-2xl shadow-black/40` on card
- Remove `bg-[#A78BFA]/5` and `bg-[#2DD4BF]/5` ambient glows
- Replace gradient divider line with simple thin indigo line: `bg-[var(--accent)]`
- Use CSS variables throughout: card `bg-[var(--bg-card)] border border-[var(--border)]`, headings `text-[var(--text-primary)]`, muted `text-[var(--text-muted)]`

---

## Phase 8 — Dashboard Overview

### 8.1 Quick Actions Bar

**File:** `src/app/(dashboard)/dashboard/page.tsx`

Add below SystemStatusBanner (before the 4-metric grid):
```tsx
{/* Quick Actions */}
<div className="flex items-center gap-3">
  <Button variant="purple" size="sm" onClick={() => setNewTaskOpen?.(true)} className="gap-1.5">
    <Zap className="h-4 w-4" /> New Task
  </Button>
  <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
  </Button>
  <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/content')} className="gap-1.5 text-[var(--text-secondary)]">
    <FileText className="h-4 w-4" /> View Content
  </Button>
</div>
```

### 8.2 PhaseProgressBar — Read Real Plan Duration

**File:** `src/components/phase-progress-bar.tsx`

Change `totalWeeks={12}` in `dashboard/page.tsx` to:
```tsx
totalWeeks={Number(activePlan?.total_weeks) || 12}
```

Read from `active-plan.json` if it has a `total_weeks` field.

---

## Phase 9 — Team, Settings, Analytics Pages

### 9.1 Team Page

- Replace all hardcoded colors with CSS variables
- Add "Resend Invite" button next to delete

### 9.2 Settings Page

- **BUG FIX line ~819**: `TargetIcon` → `Target`
- Replace ALL hardcoded inline colors with CSS variables
- Add `hasUnsavedChanges` guard in `ScopeTab`:
  ```tsx
  const [hasChanges, setHasChanges] = useState(false)
  // On route change: if (hasChanges) { if (!confirm('Discard changes?')) e.preventDefault() }
  ```
- Consider moving "Danger Zone" from tab to a fixed bottom section

### 9.3 Analytics Page

- CSS variable cleanup
- Sidebar link added in Phase 2.3 (makes it accessible)

---

## Phase 10 — Global Polish

### 10.1 Empty States → Actionable

| Page | Empty State → Action |
|---|---|
| Tasks | "No tasks" → button opens `NewTaskModal` |
| Content | "No content" → explain pipeline + link to Settings |
| Reports | "No reports" → link to Settings > Scope |

### 10.2 Content Pipeline Mobile Fix

**File:** `src/components/content-pipeline.tsx`

Replace hidden arrows on mobile with vertical flow indicator:
```tsx
{/* Mobile: vertical dots */}
<div className="flex lg:hidden items-center justify-center gap-1">
  {[draftCount, reviewCount, approvedCount, publishedCount].map((count, i) => (
    <div key={i} className="flex flex-col items-center gap-0.5">
      <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      {i < 3 && <div className="h-4 w-px bg-[var(--border-subtle)]" />}
    </div>
  ))}
</div>
```

---

## Implementation Order

```
1.  ✅ globals.css color system + layout.tsx fonts     [DONE]
2.  ✅ StatusBadge + Button + Badge (CSS vars)         [DONE]
3.  ✅ Sidebar (design + Analytics link) + Header      [DONE]
4.  ✅ Tasks: deleteTask API + delete in panel + re-open [DONE]
5.  ✅ Tasks: bulk ops + sort                           [DONE]
6.  ✅ Content: scheduling + submit for review + bulk  [DONE]
7.  ✅ Reports: chart empty states + GA4 cards + markdown [DONE]
8.  ✅ Chat widget: markdown + dynamic suggestions + error toast + FAB [DONE]
9.  ✅ Login: password toggle + remember me + design refresh [DONE]
10. ✅ Dashboard: quick actions bar + PhaseProgressBar total_weeks [DONE]
11. ✅ Team: CSS var sweep + indigo buttons             [DONE]
12. ✅ Settings: CSS var sweep + Target→TrendingUp + hasUnsavedChanges guard [DONE]
13. ✅ Global polish: actionable empty states + ContentPipeline mobile [DONE]
```

---

## Files to Create or Modify

### New Dependencies
| Package | Purpose |
|---|---|
| `react-markdown` | Render markdown in chat + reports |
| `remark-gfm` | GitHub-flavored markdown (tables, code blocks) |

### Files to Modify

| Priority | File | Changes |
|---|---|---|
| P0 | `src/app/globals.css` | Full color system overhaul |
| P0 | `src/app/layout.tsx` | Inter font loading |
| P1 | `src/components/sidebar.tsx` | Indigo design + Analytics link + CSS vars |
| P1 | `src/components/header.tsx` | Clean design + CSS vars |
| P1 | `src/components/ui/status-badge.tsx` | CSS vars + indigo for in-progress |
| P1 | `src/components/ui/button.tsx` | Indigo variant |
| P2 | `src/lib/api.ts` | `deleteTask` function |
| P2 | `src/app/(dashboard)/dashboard/tasks/page.tsx` | Delete + re-open + bulk ops + sort |
| P2 | `src/app/(dashboard)/dashboard/content/page.tsx` | Submit for review + scheduling + bulk |
| P2 | `src/app/(dashboard)/dashboard/reports/page.tsx` | GA4 polish + sheet markdown |
| P3 | `src/components/chat-widget.tsx` | Markdown + dynamic suggestions |
| P3 | `src/app/login/page.tsx` | Password toggle + remember me + design |
| P3 | `src/components/ui/badge.tsx` | CSS vars |
| P3 | `src/app/(dashboard)/dashboard/page.tsx` | Quick actions + real plan weeks |
| P3 | `src/app/(dashboard)/dashboard/settings/page.tsx` | Bug fix + CSS vars |
| P4 | `src/components/activity-feed.tsx` | CSS vars + task click |
| P4 | `src/components/overview/*.tsx` | CSS vars throughout |
| P4 | `src/components/ui/metric-card.tsx` | CSS vars |
| P4 | `src/components/content-pipeline.tsx` | Mobile fix |
| P4 | `src/components/dashboard-shell.tsx` | CSS vars |
| P4 | `src/app/(dashboard)/dashboard/team/page.tsx` | CSS vars + polish |

---

## Excluded from this plan

- Task type filters (explicitly excluded by user)
- Date range filters on tasks
- Pagination / infinite scroll (deferred)
- Testing infrastructure (deferred)
- Service worker / offline support (deferred)
