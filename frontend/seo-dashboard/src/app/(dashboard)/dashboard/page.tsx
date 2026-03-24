'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCompany } from '@/context/company-context'
import { GreetingHero } from '@/components/overview/greeting-hero'
import { SystemStatusBanner } from '@/components/overview/system-status-banner'
import { ThisWeekFocus } from '@/components/overview/this-week-focus'
import { OverviewSkeletons } from '@/components/overview/overview-skeletons'
import { MetricCard } from '@/components/ui/metric-card'
import { ContentPipeline } from '@/components/content-pipeline'
import { PhaseProgressBar } from '@/components/phase-progress-bar'
import { ActivityFeed } from '@/components/activity-feed'
import { SuccessMetricsPanel } from '@/components/success-metrics-panel'
import { NewTaskModal } from '@/components/new-task-modal'
import {
  getTaskSummary,
  getPlans,
  getContent,
  getTasks,
  getHeartbeat,
  type Task,
} from '@/lib/api'
import { CheckSquare, Clock, AlertTriangle, KeyRound, Zap, RefreshCw, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { data: session } = useSession()
  const { currentCompany } = useCompany()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const router = useRouter()

  const { data: taskSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['taskSummary', currentCompany?.slug],
    queryFn: () => getTaskSummary(currentCompany!.slug, {}),
    enabled: !!currentCompany?.slug,
    refetchInterval: 5 * 60 * 1000,
  })

  const { data: plansData, refetch: refetchPlans } = useQuery({
    queryKey: ['plans', currentCompany?.slug],
    queryFn: () => getPlans(currentCompany!.slug),
    enabled: !!currentCompany?.slug,
    staleTime: 30 * 1000,
  })

  const { data: contentData } = useQuery({
    queryKey: ['content', currentCompany?.slug],
    queryFn: () => getContent(currentCompany!.slug),
    enabled: !!currentCompany?.slug,
    staleTime: 30 * 1000,
  })

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasksRecent', currentCompany?.slug],
    queryFn: () => getTasks(currentCompany!.slug, {}),
    enabled: !!currentCompany?.slug,
  })

  const { data: heartbeat } = useQuery({
    queryKey: ['heartbeat'],
    queryFn: getHeartbeat,
    refetchInterval: 5 * 60 * 1000,
  })

  // Derive data
  const activePlan = plansData?.active_plan
  const content = contentData?.content ?? []
  const slug = currentCompany?.slug

  // Sort tasks by updated_at desc and take top 8 for activity feed
  const recentTasks: Task[] = [...allTasks]
    .sort((a, b) => {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 8)

  // Content pipeline counts
  const draftCount     = content.filter(c => c.status === 'draft').length
  const reviewCount    = content.filter(c => c.status === 'in-review').length
  const approvedCount  = content.filter(c => c.status === 'approved').length
  const publishedCount = content.filter(c => c.status === 'published').length

  // Task metrics
  const total       = taskSummary?.total ?? 0
  const completed   = taskSummary?.completed ?? 0
  const blocked     = taskSummary?.blocked ?? 0
  const inProgress  = taskSummary?.in_progress ?? 0
  const pending     = taskSummary?.pending ?? 0

  // Missing credentials (stored on the plan object at runtime)
  const missingCreds = (activePlan as { missing_credentials?: string[] })?.missing_credentials?.length ?? 0

  // Phase context
  const phase       = activePlan?.current_phase ?? 'Foundation'
  const weekLabel   = activePlan?.current_week_label ?? 'Week 1'
  const focusAreas  = activePlan?.focus_areas ?? []
  const priorityFocus = activePlan?.priority_focus
  const successMetrics = activePlan?.success_metrics ?? {}

  // Loading state
  const isLoading = !currentCompany || (!taskSummary && !!slug) || (!activePlan && !!slug)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchSummary(), refetchPlans()])
    setIsRefreshing(false)
  }

  if (isLoading) {
    return <OverviewSkeletons />
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Greeting Hero */}
      <div className="animate-slide-up stagger-1">
        <GreetingHero
          companyName={currentCompany?.name}
          currentPhase={phase}
          currentWeekLabel={weekLabel}
          userName={session?.user?.name?.split(' ')[0]}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>

      {/* 2. System Status Banner */}
      <div className="animate-slide-up stagger-2">
        <SystemStatusBanner
          heartbeatData={heartbeat}
          companySlug={slug}
          contentCount={content.length}
          inProgressCount={inProgress}
        />
      </div>

      {/* 3. Quick Actions */}
      <div className="flex items-center gap-3 animate-slide-up stagger-2">
        <Button variant="indigo" size="sm" onClick={() => setNewTaskOpen(true)} className="gap-1.5">
          <Zap className="h-4 w-4" /> New Task
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/content')} className="gap-1.5 text-[var(--text-secondary)]">
          <FileText className="h-4 w-4" /> View Content
        </Button>
      </div>

      {/* 4. 4-Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-slide-up stagger-2">
          <MetricCard
            title="Tasks Done"
            value={completed}
            total={total}
            icon={CheckSquare}
            variant="ring"
            accentColor="success"
            description={`${total > 0 ? Math.round((completed / total) * 100) : 0}% completion`}
          />
        </div>
        <div className="animate-slide-up stagger-3">
          <MetricCard
            title="In Progress"
            value={inProgress}
            icon={Clock}
            accentColor="purple"
            description={`${pending} pending`}
          />
        </div>
        <div className="animate-slide-up stagger-4">
          <MetricCard
            title="Blocked"
            value={blocked}
            icon={AlertTriangle}
            accentColor={blocked > 0 ? 'error' : 'success'}
            description={blocked > 0 ? 'Needs attention' : 'All clear'}
          />
        </div>
        <div className="animate-slide-up stagger-5">
          <MetricCard
            title="Missing Creds"
            value={missingCreds}
            icon={KeyRound}
            accentColor={missingCreds > 0 ? 'warning' : 'success'}
            description={missingCreds > 0 ? 'Configure in Settings' : 'All connected'}
          />
        </div>
      </div>

      {/* 5. Phase Progress + This Week's Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 animate-slide-up stagger-5">
          <PhaseProgressBar
            phase={phase}
            currentWeek={Number(activePlan?.current_week) || 1}
            totalWeeks={Number(activePlan?.total_weeks) || 12}
            weekLabel={weekLabel}
          />
        </div>
        <div className="animate-slide-up stagger-6">
          <ThisWeekFocus
            focusAreas={focusAreas}
            priorityFocus={priorityFocus}
          />
        </div>
      </div>

      {/* 6. Content Pipeline */}
      <div className="animate-slide-up stagger-7">
        <ContentPipeline
          draft={draftCount}
          review={reviewCount}
          approved={approvedCount}
          published={publishedCount}
        />
      </div>

      {/* 7. Activity + Success Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="animate-slide-up stagger-8">
          <ActivityFeed
            tasks={recentTasks}
          />
        </div>
        <div className="animate-slide-up stagger-9">
          <SuccessMetricsPanel
            metrics={successMetrics}
          />
        </div>
      </div>

      {/* New Task Modal */}
      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
    </div>
  )
}
