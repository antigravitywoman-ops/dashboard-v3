'use client'

import { useQuery } from '@tanstack/react-query'
import { useCompany } from '@/context/company-context'
import { getCompany, getTasks, getContent } from '@/lib/api'
import { TrendingUp, Globe, FileText, CheckSquare } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function StatCard({ label, value, icon: Icon }: {
  label: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <div className="p-5 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-[var(--accent-subtle)]">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { currentCompany } = useCompany()

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', currentCompany?.slug],
    queryFn: () => getCompany(currentCompany!.slug),
    enabled: !!currentCompany,
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', currentCompany?.slug],
    queryFn: () => getTasks(currentCompany!.slug),
    enabled: !!currentCompany,
  })

  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ['content', currentCompany?.slug],
    queryFn: () => getContent(currentCompany!.slug),
    enabled: !!currentCompany,
  })

  const isLoading = companyLoading || tasksLoading || contentLoading

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const taskList = (tasks as any[]) ?? []
  const contentList = (content as any)?.content ?? []
  const completedTasks = taskList.filter((t: any) => t.status === 'completed').length
  const activeTasks = taskList.filter((t: any) => ['pending', 'in_progress', 'in_review', 'pending_verification'].includes(t.status)).length
  const publishedContent = contentList.filter((c: any) => c.status === 'published').length
  const totalContent = contentList.length

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Analytics</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Performance overview for {company?.name || currentCompany?.name || 'your company'}
        </p>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
          Quick Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Tasks" value={activeTasks} icon={CheckSquare} />
          <StatCard label="Completed Tasks" value={completedTasks} icon={TrendingUp} />
          <StatCard label="Total Content" value={totalContent} icon={FileText} />
          <StatCard label="Published Content" value={publishedContent} icon={Globe} />
        </div>
      </div>

      {/* SEO Insights Placeholder */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
          SEO Performance
        </h2>
        <div className="p-8 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] text-center">
          <TrendingUp className="h-8 w-8 text-[var(--accent)] mx-auto mb-3" />
          <p className="text-base font-medium text-[var(--text-secondary)] mb-2">SEO Analytics Coming Soon</p>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            Detailed SEO analytics including search impressions, rankings, and click-through rates will appear here once GSC is connected.
          </p>
        </div>
      </div>

      {/* Company Info */}
      {company && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
            Company Profile
          </h2>
          <div className="p-5 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Company</p>
                <p className="text-sm text-[var(--text-primary)] font-medium">{company.name}</p>
              </div>
              {company.industry && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Industry</p>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{company.industry}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
                <p className="text-sm font-medium">
                  <span className={company.status === 'paused' ? 'text-[var(--status-warning)]' : 'text-[var(--status-success)]'}>
                    {company.status === 'paused' ? 'Paused' : 'Active'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
