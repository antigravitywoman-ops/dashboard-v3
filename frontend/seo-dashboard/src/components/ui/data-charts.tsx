'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Empty State Helper ────────────────────────────────────────────────────────

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-center">
      <BarChart3 className="h-8 w-8 text-[var(--text-disabled)] mb-2" />
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
      <p className="text-xs text-[var(--text-disabled)] mt-1">Connect GSC to see performance data</p>
    </div>
  )
}

// ─── GSC Metrics Bar Chart ────────────────────────────────────────────────────

interface GscMetricsChartProps {
  gsc: {
    clicks?: number
    impressions?: number
    ctr?: number
    position?: number
  }
  delta?: Record<string, number | null>
}

export function GscMetricsChart({ gsc, delta }: GscMetricsChartProps) {
  const hasData = (gsc.clicks ?? 0) > 0 || (gsc.impressions ?? 0) > 0

  const data = [
    {
      label: 'Clicks',
      value: gsc.clicks ?? 0,
      delta: delta?.clicks ?? null,
      color: 'var(--accent)',
    },
    {
      label: 'Impressions',
      value: gsc.impressions ?? 0,
      delta: delta?.impressions ?? null,
      color: 'var(--accent-teal)',
    },
    {
      label: 'CTR',
      value: gsc.ctr ? Number(gsc.ctr) * 100 : 0,
      delta: delta?.ctr ? Number(delta.ctr) * 100 : null,
      color: 'var(--status-warning)',
      suffix: '%',
      decimals: 2,
    },
    {
      label: 'Position',
      value: gsc.position ?? 0,
      delta: delta?.position ?? null,
      color: 'var(--status-info)',
      decimals: 1,
      invertDelta: true,
    },
  ]

  const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 1)

  if (!hasData) {
    return <ChartEmptyState message="No GSC data available" />
  }

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, maxValue * 1.15]}
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
                return String(v)
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof data)[0]
                return (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{d.label}</p>
                    <p className="text-sm font-bold" style={{ color: d.color }}>
                      {d.decimals !== undefined
                        ? d.value.toFixed(d.decimals ?? 0)
                        : d.value.toLocaleString()}
                      {d.suffix ?? ''}
                    </p>
                    {d.delta != null && (
                      <p className={cn(
                        'text-[10px] font-medium',
                        (d.invertDelta ? d.delta < 0 : d.delta > 0) ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
                      )}>
                        {d.delta > 0 ? '+' : ''}{typeof d.delta === 'number' ? d.delta.toFixed(2) : d.delta}{d.suffix ?? ''} vs prior period
                      </p>
                    )}
                  </div>
                )
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Delta strip */}
      <div className="grid grid-cols-4 gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex flex-col items-center p-2 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-disabled)] mb-0.5">{d.label}</span>
            <div className="flex items-center gap-1">
              {d.delta == null ? (
                <Minus className="h-3 w-3 text-[var(--text-disabled)]" />
              ) : d.delta === 0 ? (
                <span className="text-[10px] text-[var(--text-muted)]">—</span>
              ) : (d.invertDelta ? d.delta < 0 : d.delta > 0) ? (
                <>
                  <TrendingUp className="h-3 w-3 text-[var(--status-success)]" />
                  <span className="text-[10px] font-medium text-[var(--status-success)]">
                    {Math.abs(d.delta).toFixed(1)}{d.suffix ?? ''}
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-[var(--status-error)]" />
                  <span className="text-[10px] font-medium text-[var(--status-error)]">
                    {Math.abs(d.delta).toFixed(1)}{d.suffix ?? ''}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Top Queries Bar Chart ─────────────────────────────────────────────────────

interface TopQueriesChartProps {
  queries: Array<{
    query: string
    clicks: number
    ctr: number
    avg_position: number
    impressions?: number
  }>
}

export function TopQueriesChart({ queries }: TopQueriesChartProps) {
  const data = queries.slice(0, 8).map(q => ({
    query: q.query.length > 28 ? q.query.slice(0, 28) + '…' : q.query,
    fullQuery: q.query,
    clicks: q.clicks,
    position: q.avg_position,
    ctr: q.ctr ? Number(q.ctr) * 100 : 0,
  }))

  if (data.length === 0) {
    return <ChartEmptyState message="No query data available" />
  }

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="query"
            type="category"
            width={110}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as (typeof data)[0]
              return (
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg max-w-xs">
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-1 break-all">{d.fullQuery}</p>
                  <p className="text-xs text-[var(--accent)]">{d.clicks.toLocaleString()} clicks</p>
                  <p className="text-xs text-[var(--text-muted)]">Pos: {d.position.toFixed(1)} · CTR: {d.ctr.toFixed(1)}%</p>
                </div>
              )
            }}
          />
          <Bar dataKey="clicks" radius={[0, 4, 4, 0]} fill="var(--accent)" fillOpacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Keyword Position Changes Chart ──────────────────────────────────────────

interface KeywordChartProps {
  keywords: Array<{
    keyword: string
    previous: number
    current: number
    delta: number
    volume?: number
    difficulty?: number
  }>
}

export function KeywordChangesChart({ keywords }: KeywordChartProps) {
  const data = keywords.slice(0, 8).map(k => ({
    keyword: k.keyword.length > 24 ? k.keyword.slice(0, 24) + '…' : k.keyword,
    fullKeyword: k.keyword,
    previous: k.previous,
    current: k.current,
    delta: k.delta,
    volume: k.volume,
    improved: k.delta < 0,
  }))

  if (data.length === 0) {
    return <ChartEmptyState message="No keyword data available" />
  }

  return (
    <div className="space-y-2">
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 16, left: 0, bottom: 24 }}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="keyword"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              height={50}
              interval={0}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              reversed
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof data)[0]
                return (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs font-semibold text-[var(--text-primary)] mb-1 break-all">{d.fullKeyword}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Pos: {d.previous} → {d.current} ({d.delta > 0 ? '+' : ''}{d.delta})
                    </p>
                    {d.volume && (
                      <p className="text-xs text-[var(--text-disabled)]">Vol: {d.volume.toLocaleString()}</p>
                    )}
                  </div>
                )
              }}
            />
            <Bar dataKey="current" radius={[4, 4, 0, 0]} fillOpacity={0.85}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.improved ? 'var(--status-success)' : 'var(--status-error)'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-[var(--status-success)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Improved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-[var(--status-error)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Declined</span>
        </div>
      </div>
    </div>
  )
}

// ─── Top Pages Chart ──────────────────────────────────────────────────────────

interface TopPagesChartProps {
  pages: Array<{
    url: string
    impressions: number
    clicks: number
    ctr: number
    avg_position: number
  }>
}

export function TopPagesChart({ pages }: TopPagesChartProps) {
  const data = pages.slice(0, 8).map(p => ({
    page: p.url.replace(/^https?:\/\//, '').slice(0, 36) + (p.url.length > 40 ? '…' : ''),
    fullUrl: p.url,
    impressions: p.impressions,
    clicks: p.clicks,
    position: p.avg_position,
  }))

  if (data.length === 0) {
    return <ChartEmptyState message="No page data available" />
  }

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => {
              if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
              return String(v)
            }}
          />
          <YAxis
            dataKey="page"
            type="category"
            width={150}
            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as (typeof data)[0]
              return (
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-lg max-w-xs">
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-1 break-all">{d.fullUrl}</p>
                  <p className="text-xs text-[var(--accent-teal)]">{d.impressions.toLocaleString()} impressions</p>
                  <p className="text-xs text-[var(--accent)]">{d.clicks.toLocaleString()} clicks</p>
                  <p className="text-xs text-[var(--text-muted)]">Pos: {d.position.toFixed(1)}</p>
                </div>
              )
            }}
          />
          <Bar dataKey="impressions" radius={[0, 4, 4, 0]} fill="var(--accent-teal)" fillOpacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
