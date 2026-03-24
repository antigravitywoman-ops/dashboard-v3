'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useQuery } from '@tanstack/react-query'
import { useCompany } from '@/context/company-context'
import { PageHero } from '@/components/ui/page-hero'
import { MetricCard } from '@/components/ui/metric-card'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { SlideOver } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SectionHeader } from '@/components/ui/section-header'
import { useToast } from '@/components/ui/toaster'
import { GscMetricsChart, TopQueriesChart, KeywordChangesChart, TopPagesChart } from '@/components/ui/data-charts'
import { getReportPeriods, getReportSheets, getReportSheet, getTechnical, downloadReportExcel } from '@/lib/api'
import type { Period, Sheet } from '@/lib/api'
import {
  FileSpreadsheet,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Activity,
  Database,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react'

// ─── Sheet Validation Dot ─────────────────────────────────────────────────────

function SheetValidationDot({ status }: { status?: string }) {
  if (status === 'validated') return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--status-success)]" />
  if (status === 'failed')    return <AlertTriangle className="h-3.5 w-3.5 text-[var(--status-error)]" />
  return <Minus className="h-3.5 w-3.5 text-[var(--text-disabled)]" />
}

// ─── Report Period Accordion ──────────────────────────────────────────────────

function ReportPeriodAccordion({
  period,
  currentSlug,
  onSelectSheet,
  expandedPeriod,
  onToggle,
}: {
  period: Period
  currentSlug: string
  onSelectSheet: (sheet: Sheet) => void
  expandedPeriod: string | null
  onToggle: (id: string) => void
}) {
  const { data: sheetsData, isLoading } = useQuery({
    queryKey: ['reportSheets', currentSlug, period.id],
    queryFn: () => getReportSheets(currentSlug, period.id),
    enabled: !!currentSlug && expandedPeriod === period.id,
    staleTime: 5 * 60 * 1000,
  })

  const sheets: Sheet[] = (sheetsData as any)?.sheets ?? []
  const isOpen = expandedPeriod === period.id
  const validatedCount = sheets.filter(s => s.validation_status === 'validated').length
  const failedCount    = sheets.filter(s => s.validation_status === 'failed').length

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
      {/* Accordion header */}
      <button
        onClick={() => onToggle(isOpen ? '' : period.id)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-card)] transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="text-[var(--text-muted)]">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{period.label}</span>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-16" shimmer />
            ) : (
              <>
                <span className="text-xs text-[var(--text-muted)]">{sheets.length} sheets</span>
                {validatedCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-[var(--status-success)]">
                    <CheckCircle2 className="h-3 w-3" /> {validatedCount}
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-[var(--status-error)]">
                    <AlertTriangle className="h-3 w-3" /> {failedCount}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        {sheets.length > 0 && !isOpen && (
          <div className="flex gap-1.5 mr-2">
            {sheets.slice(0, 6).map(sheet => (
              <div key={sheet.number} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-mono text-[var(--text-disabled)]">{String(sheet.number).padStart(2, '0')}</span>
                <SheetValidationDot status={sheet.validation_status} />
              </div>
            ))}
            {sheets.length > 6 && (
              <span className="text-[10px] text-[var(--text-disabled)] self-center">+{sheets.length - 6}</span>
            )}
          </div>
        )}
      </button>

      {/* Accordion content */}
      {isOpen && (
        <div className="border-t border-[var(--border)] p-4 space-y-1 animate-fade-in">
          {/* Sheet grid */}
          {sheets.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-4">
              {sheets.map((sheet) => (
                <button
                  key={sheet.number}
                  onClick={() => onSelectSheet(sheet)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <span className="text-xs font-mono text-[var(--text-disabled)]">{String(sheet.number).padStart(2, '0')}</span>
                  <SheetValidationDot status={sheet.validation_status} />
                </button>
              ))}
            </div>
          )}

          {/* Sheet list */}
          {sheets.map(sheet => (
            <button
              key={sheet.number}
              onClick={() => onSelectSheet(sheet)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-left"
            >
              <span className="text-xs font-mono text-[var(--text-disabled)] w-6 shrink-0">
                {String(sheet.number).padStart(2, '0')}
              </span>
              <SheetValidationDot status={sheet.validation_status} />
              <span className="text-sm text-[var(--text-secondary)] flex-1 truncate">
                {sheet.sheet_name || sheet.filename}
              </span>
              {sheet.keywords_count != null && sheet.keywords_count > 0 && (
                <span className="text-xs text-[var(--text-disabled)] shrink-0">{sheet.keywords_count} kw</span>
              )}
              {sheet.validation_status === 'validated' && (
                <Badge variant="success" size="sm" className="shrink-0">Valid</Badge>
              )}
              {sheet.validation_status === 'failed' && (
                <Badge variant="error" size="sm" className="shrink-0">Failed</Badge>
              )}
            </button>
          ))}

          {sheets.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileSpreadsheet className="h-8 w-8 text-[var(--text-disabled)] mb-2" />
              <p className="text-xs text-[var(--text-disabled)]">No sheets in this period</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Technical Audit Card ─────────────────────────────────────────────────────

function TechnicalAuditCard({ audit }: { audit: any }) {
  const [open, setOpen] = useState(false)
  const totalIssues = audit.summary
    ? (audit.summary.critical ?? 0) + (audit.summary.high ?? 0) + (audit.summary.medium ?? 0) + (audit.summary.low ?? 0)
    : audit.critical_issues?.length ?? 0

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-card)] transition-colors"
      >
        <div className="flex items-center gap-3 text-left flex-1 min-w-0">
          <div className="text-[var(--text-muted)]">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {audit.crawl_meta?.start_url
                ? new URL(audit.crawl_meta.start_url).hostname
                : `Audit ${new Date(audit.timestamp || Date.now()).toLocaleDateString()}`}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {audit.crawl_meta?.crawled_at
                ? new Date(audit.crawl_meta.crawled_at).toLocaleDateString()
                : new Date(audit.timestamp || Date.now()).toLocaleDateString()}
              {audit.crawl_meta?.total_pages ? ` · ${audit.crawl_meta.total_pages} pages` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {totalIssues > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--status-error)]">
              <AlertCircle className="h-3.5 w-3.5" />
              {totalIssues} issues
            </span>
          )}
          {audit.health_score != null && (
            <div className={`text-center px-3 py-1 rounded-lg ${
              audit.health_score >= 80 ? 'bg-[var(--status-success-bg)]' :
              audit.health_score >= 50 ? 'bg-[var(--status-warning-bg)]' :
              'bg-[var(--status-error-bg)]'
            }`}>
              <p className={`text-lg font-bold ${
                audit.health_score >= 80 ? 'text-[var(--status-success)]' :
                audit.health_score >= 50 ? 'text-[var(--status-warning)]' :
                'text-[var(--status-error)]'
              }`}>{audit.health_score}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Score</p>
            </div>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] p-4 space-y-4 animate-fade-in">
          {/* Summary grid */}
          {audit.summary && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { label: 'Critical', value: audit.summary.critical ?? 0, color: 'text-[var(--status-error)] bg-[var(--status-error-bg)]' },
                { label: 'High',     value: audit.summary.high ?? 0,     color: 'text-[var(--status-warning)] bg-[var(--status-warning-bg)]' },
                { label: 'Medium',   value: audit.summary.medium ?? 0,   color: 'text-[var(--status-info)] bg-[var(--status-info-bg)]' },
                { label: 'Low',      value: audit.summary.low ?? 0,      color: 'text-[var(--text-muted)] bg-[var(--bg-elevated)]' },
                { label: 'Fixed',    value: audit.summary.fixed ?? 0, color: 'text-[var(--status-success)] bg-[var(--status-success-bg)]' },
              ].map(item => (
                <div key={item.label} className={`text-center p-2 rounded-lg ${item.color}`}>
                  <p className="text-lg font-bold">{item.value ?? 0}</p>
                  <p className="text-[10px] opacity-70">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Issues */}
          {audit.critical_issues?.length > 0 && (
            <div>
              <p className="text-xs text-[var(--text-disabled)] mb-2 font-medium">Critical Issues</p>
              <div className="space-y-2">
                {audit.critical_issues.slice(0, 5).map((issue: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)]">
                    <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                      issue.severity === 'CRITICAL' ? 'bg-[var(--status-error)]' :
                      issue.severity === 'HIGH'     ? 'bg-[var(--status-warning)]' :
                      issue.severity === 'MEDIUM'   ? 'bg-[var(--status-info)]' :
                      'bg-[var(--text-muted)]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-secondary)]">{issue.type}</p>
                      {issue.url && (
                        <p className="text-[10px] text-[var(--text-disabled)] font-mono truncate mt-0.5">{issue.url}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-[var(--text-disabled)] shrink-0">{issue.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null)
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'strategy' | 'technical' | 'data'>('strategy')

  const { data: periodsData, isLoading: periodsLoading } = useQuery({
    queryKey: ['reportPeriods', currentCompany?.slug],
    queryFn: () => getReportPeriods(currentCompany!.slug),
    enabled: !!currentCompany?.slug,
  })

  const { data: technicalData, isLoading: technicalLoading } = useQuery({
    queryKey: ['technical', currentCompany?.slug],
    queryFn: () => getTechnical(currentCompany!.slug),
    enabled: !!currentCompany?.slug && activeTab === 'technical',
    staleTime: 60 * 1000,
  })

  const { data: sheetContent } = useQuery({
    queryKey: ['reportSheet', currentCompany?.slug, selectedSheet?.period, selectedSheet?.number],
    queryFn: () => {
      if (!selectedSheet) return null
      return getReportSheet(currentCompany!.slug, selectedSheet.period || selectedSheet.filename, String(selectedSheet.number))
    },
    enabled: !!selectedSheet,
  })

  const periods: Period[] = periodsData?.periods ?? []
  const tech = technicalData as any
  const audits = tech?.audits ?? []
  const snapshot = tech?.snapshot ?? null

  const handleExport = async (periodId: string) => {
    try {
      const blob = await downloadReportExcel(currentCompany!.slug, periodId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${periodId}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: 'Report exported', variant: 'success' })
    } catch {
      toast({ title: 'Failed to export report', variant: 'error' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        name={undefined}
        subtitle="Strategy reports, technical audits, and performance data"
        actions={
          activeTab === 'strategy' && periods.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const latestPeriod = periods[0]?.id
                if (latestPeriod) handleExport(latestPeriod)
              }}
            >
              <Download className="h-4 w-4" />
              Export Latest
            </Button>
          ) : undefined
        }
      />

      {/* Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Strategy Reports"
          value={periods.length}
          icon={FileSpreadsheet}
          accentColor="purple"
          description={periods.length > 0 ? `Latest: ${periods[0]?.label}` : 'None yet'}
          isLoading={periodsLoading}
          onClick={() => setActiveTab('strategy')}
        />
        <MetricCard
          title="Technical Audits"
          value={audits.length > 0 ? audits.length : '—'}
          icon={Activity}
          accentColor="teal"
          description={audits.length > 0 ? `Latest score: ${audits[0]?.health_score ?? '—'}` : 'None yet'}
          isLoading={activeTab !== 'technical' && technicalLoading}
          onClick={() => setActiveTab('technical')}
        />
        <MetricCard
          title="Data Snapshots"
          value={snapshot ? '1' : '—'}
          icon={Database}
          accentColor="info"
          description={snapshot?.generated_at
            ? `Updated ${new Date(snapshot.generated_at).toLocaleDateString()}`
            : 'None yet'}
          isLoading={activeTab !== 'data' && technicalLoading}
          onClick={() => setActiveTab('data')}
        />
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList variant="default">
          <TabsTrigger value="strategy">Strategy Reports</TabsTrigger>
          <TabsTrigger value="technical">Technical Audits</TabsTrigger>
          <TabsTrigger value="data">Data Snapshots</TabsTrigger>
        </TabsList>

        {/* Strategy Reports */}
        <TabsContent value="strategy" className="mt-0 space-y-3">
          {periodsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" shimmer />)}
            </div>
          ) : periods.length === 0 ? (
            <EmptyState
              variant="reports"
              title="No reports generated yet"
              description="Reports are generated by the AI agent on schedule"
              action={{
                label: 'Configure Scope',
                onClick: () => { window.location.href = '/dashboard/settings' },
              }}
            />
          ) : (
            <>
              {periods.map(period => (
                <div key={period.id} className="space-y-2">
                  {/* Period header with export */}
                  <div className="flex items-center justify-between min-w-0">
                    <span className="text-xs text-[var(--text-disabled)]" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-[var(--text-muted)] hover:text-[var(--accent)] h-7"
                      onClick={() => handleExport(period.id)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </div>
                  <ReportPeriodAccordion
                    period={period}
                    currentSlug={currentCompany!.slug}
                    onSelectSheet={setSelectedSheet}
                    expandedPeriod={expandedPeriod}
                    onToggle={setExpandedPeriod}
                  />
                </div>
              ))}
            </>
          )}
        </TabsContent>

        {/* Technical Audits */}
        <TabsContent value="technical" className="mt-0">
          {technicalLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" shimmer />)}
            </div>
          ) : audits.length > 0 ? (
            <div className="space-y-3">
              {audits.map((audit: any, i: number) => (
                <TechnicalAuditCard key={i} audit={audit} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Activity className="h-10 w-10 text-[var(--text-disabled)] mb-4" />
              <p className="text-sm text-[var(--text-muted)]">No technical audits yet</p>
              <p className="text-xs text-[var(--text-disabled)] mt-1">Audits run automatically when crawl data is available</p>
            </div>
          )}
        </TabsContent>

        {/* Data Snapshots */}
        <TabsContent value="data" className="mt-0">
          {!snapshot ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Database className="h-10 w-10 text-[var(--text-disabled)] mb-4" />
              <p className="text-sm text-[var(--text-muted)]">No data snapshots yet</p>
              <p className="text-xs text-[var(--text-disabled)] mt-1">Connect GSC and GA4 to see performance data</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* GSC Metrics */}
              {snapshot.gsc && (
                <Card>
                  <CardHeader>
                    <SectionHeader
                      title="Google Search Console"
                      description={`Last updated: ${snapshot.generated_at ? new Date(snapshot.generated_at).toLocaleString() : '—'}`}
                    />
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* GSC Bar Chart */}
                    <GscMetricsChart
                      gsc={snapshot.gsc as any}
                      delta={snapshot.delta as any}
                    />

                    {/* Top Queries Chart */}
                    {snapshot.top_queries && snapshot.top_queries.length > 0 && (
                      <div>
                        <p className="text-xs text-[var(--text-disabled)] mb-3 font-medium">Top Queries by Clicks</p>
                        <TopQueriesChart queries={snapshot.top_queries as any} />
                      </div>
                    )}

                    {/* Top Pages Chart */}
                    {snapshot.top_pages && snapshot.top_pages.length > 0 && (
                      <div>
                        <p className="text-xs text-[var(--text-disabled)] mb-3 font-medium">Top Pages by Impressions</p>
                        <TopPagesChart pages={snapshot.top_pages as any} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Keywords */}
              {snapshot.keywords && snapshot.keywords.length > 0 && (
                <Card>
                  <CardHeader>
                    <SectionHeader
                      title="Keyword Performance"
                      description="Position changes over the reporting period"
                    />
                  </CardHeader>
                  <CardContent>
                    <KeywordChangesChart keywords={snapshot.keywords as any} />
                  </CardContent>
                </Card>
              )}

              {/* GA4 Metrics */}
              {snapshot.ga4 && (
                <Card>
                  <CardHeader>
                    <SectionHeader title="Google Analytics 4" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { key: 'sessions', label: 'Sessions', value: snapshot.ga4.sessions },
                        { key: 'users', label: 'Users', value: snapshot.ga4.users },
                        { key: 'pageviews', label: 'Page Views', value: snapshot.ga4.pageviews },
                        { key: 'bounce_rate', label: 'Bounce Rate', value: snapshot.ga4.bounce_rate },
                      ].map(metric => (
                        <div key={metric.key} className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
                          <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                            {metric.label}
                          </p>
                          <p className="text-2xl font-bold text-[var(--text-primary)]">
                            {typeof metric.value === 'number'
                              ? metric.key === 'bounce_rate'
                                ? `${(metric.value as number).toFixed(1)}%`
                                : (metric.value as number).toLocaleString()
                              : '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Items */}
              {snapshot.action_items && snapshot.action_items.length > 0 && (
                <Card>
                  <CardHeader>
                    <SectionHeader title="Action Items" description="Recommended next steps from the AI analysis" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {snapshot.action_items.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${
                            item.done ? 'bg-[var(--status-success)]' :
                            item.priority === 'critical' ? 'bg-[var(--status-error)]' :
                            item.priority === 'high' ? 'bg-[var(--status-warning)]' :
                            'bg-[var(--text-muted)]'
                          }`} />
                          <span className={`text-sm ${
                            item.done ? 'text-[var(--text-disabled)] line-through' : 'text-[var(--text-secondary)]'
                          }`}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet Viewer */}
      <SlideOver
        open={!!selectedSheet}
        onOpenChange={open => !open && setSelectedSheet(null)}
        title={selectedSheet?.sheet_name || 'Report Sheet'}
        description={selectedSheet?.period}
        width="xl"
      >
        {sheetContent ? (
          <div className="space-y-4">
            {/* Sheet meta */}
            <div className="flex flex-wrap gap-2">
              {selectedSheet?.keywords_count != null && selectedSheet.keywords_count > 0 && (
                <Badge variant="secondary" size="sm">{selectedSheet.keywords_count} keywords</Badge>
              )}
              {selectedSheet?.validation_status && (
                <Badge
                  variant={selectedSheet.validation_status === 'validated' ? 'success' : 'error'}
                  size="sm"
                >
                  {selectedSheet.validation_status}
                </Badge>
              )}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-surface)] rounded-lg p-4 border border-[var(--border)] max-h-[65vh] overflow-y-auto leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {sheetContent.content || 'No content'}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-40">
            <Skeleton className="h-40 w-full rounded-xl" shimmer />
          </div>
        )}
      </SlideOver>
    </div>
  )
}
