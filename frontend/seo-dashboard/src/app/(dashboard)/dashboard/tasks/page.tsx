'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCompany } from '@/context/company-context'
import { PageHero } from '@/components/ui/page-hero'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { SlideOver } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { NewTaskModal } from '@/components/new-task-modal'
import { useToast } from '@/components/ui/toaster'
import { getTasks, updateTask, deleteTask, type Task } from '@/lib/api'
import {
  ChevronRight,
  Zap,
  Filter,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Task Detail SlideOver ────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<string, { label: string; status: string; variant: string }[]> = {
  pending:           [{ label: 'Start',    status: 'in_progress',       variant: 'purple' }],
  in_progress:       [{ label: 'Complete', status: 'completed',         variant: 'success' }, { label: 'Block', status: 'blocked', variant: 'error' }],
  pending_verification: [{ label: 'Verify & Complete', status: 'completed', variant: 'success' }],
  blocked:           [{ label: 'Unblock',  status: 'pending',           variant: 'warning' }],
  completed:         [{ label: 'Re-open',  status: 'pending',           variant: 'outline' }],
  cancelled:         [{ label: 'Re-open',  status: 'pending',           variant: 'outline' }],
}

function TaskDetailPanel({
  task,
  onClose,
}: {
  task: Task | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { currentCompany } = useCompany()

  if (!task) return null

  const updateMutation = useMutation({
    mutationFn: (status: string) => updateTask(currentCompany!.slug, task.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentCompany?.slug] })
      queryClient.invalidateQueries({ queryKey: ['tasksRecent', currentCompany?.slug] })
      toast({ title: 'Status updated', variant: 'success' })
      onClose()
    },
    onError: () => toast({ title: 'Failed to update task', variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(currentCompany!.slug, task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentCompany?.slug] })
      queryClient.invalidateQueries({ queryKey: ['tasksRecent', currentCompany?.slug] })
      toast({ title: 'Task deleted', variant: 'success' })
      onClose()
    },
    onError: () => toast({ title: 'Failed to delete task', variant: 'error' }),
  })

  const transitions = STATUS_TRANSITIONS[task.status] ?? []
  const priorityColors: Record<string, { label: string; dot: string; bg: string }> = {
    critical: { label: 'text-[var(--status-error)]', dot: 'bg-[var(--status-error)]', bg: 'bg-[var(--status-error-bg)]' },
    high:     { label: 'text-[var(--status-warning)]', dot: 'bg-[var(--status-warning)]', bg: 'bg-[var(--status-warning-bg)]' },
    normal:   { label: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]', bg: 'bg-[var(--accent-subtle)]' },
    low:      { label: 'text-[var(--text-disabled)]', dot: 'bg-[var(--text-disabled)]', bg: 'bg-[var(--bg-elevated)]' },
  }
  const priority = priorityColors[task.priority] ?? priorityColors.normal

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  const formatRelative = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <SlideOver
      open={!!task}
      onOpenChange={open => !open && onClose()}
      title={task.hover_label || task.type || 'Task'}
      description={`#${task.id.slice(0, 8)} · ${task.type || 'General'}`}
      width="md"
    >
      <div className="space-y-5">

        {/* ── Header Strip: Status + Priority ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status as any} showBadge />
            <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full', priority.bg)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} />
              <span className={cn('text-xs font-medium capitalize', priority.label)}>
                {task.priority}
              </span>
            </div>
          </div>
          <span className="text-xs text-[var(--text-disabled)] font-mono">{formatRelative(task.updated_at || task.created_at)}</span>
        </div>

        {/* ── Status Transition Buttons ── */}
        {transitions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-[var(--text-disabled)] uppercase tracking-wider font-semibold">Actions</p>
            <div className="flex flex-wrap gap-2">
              {transitions.map(t => (
                <button
                  key={t.status}
                  onClick={() => updateMutation.mutate(t.status)}
                  disabled={updateMutation.isPending}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    t.variant === 'success'  && 'bg-[var(--status-success-bg)] text-[var(--status-success)] hover:bg-[var(--status-success-hover)] border border-[var(--status-success-border)]',
                    t.variant === 'purple'  && 'bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent-hover)] border border-[var(--accent-border)]',
                    t.variant === 'error'   && 'bg-[var(--status-error-bg)] text-[var(--status-error)] hover:bg-[var(--status-error-hover)] border border-[var(--status-error-border)]',
                    t.variant === 'warning' && 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] hover:bg-[var(--status-warning-hover)] border border-[var(--status-warning-border)]',
                    t.variant === 'outline' && 'border border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Meta Grid ── */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Assigned to', value: task.assigned_to || 'Unassigned' },
            { label: 'Created',     value: task.created_at ? formatDate(task.created_at) : '—' },
            { label: 'Updated',     value: task.updated_at ? formatDate(task.updated_at) : '—' },
            { label: 'Status',     value: task.status?.replace(/_/g, ' ') ?? '—' },
          ].map(item => (
            <div key={item.label} className="bg-[var(--bg-surface)] rounded-xl p-3.5 border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-disabled)] mb-1 uppercase tracking-widest font-semibold">{item.label}</p>
              <p className="text-sm text-[var(--text-secondary)] capitalize">{item.value}</p>
            </div>
          ))}
        </div>

        {/* ── Progress ── */}
        {task.progress && (task.progress.total_steps || task.progress.message) && (
          <div className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-disabled)] mb-3 uppercase tracking-widest font-semibold">Progress</p>
            {task.progress.total_steps && task.progress.current_step && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-muted)]">Step {task.progress.current_step} of {task.progress.total_steps}</span>
                  <span className="text-xs font-bold text-[var(--accent)]">
                    {Math.round((task.progress.current_step / task.progress.total_steps) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--accent-hover)] to-[var(--accent)] rounded-full transition-all duration-500"
                    style={{ width: `${(task.progress.current_step / task.progress.total_steps) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {task.progress.message && (
              <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)] leading-relaxed">
                {task.progress.message}
              </p>
            )}
          </div>
        )}

        {/* ── Context ── */}
        {task.context && Object.keys(task.context).length > 0 && (
          <div className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-disabled)] mb-3 uppercase tracking-widest font-semibold">Context</p>
            <div className="space-y-2">
              {Object.entries(task.context).map(([key, value]) => (
                <div key={key} className="flex items-start gap-3 py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                  <span className="text-[10px] text-[var(--text-disabled)] font-mono w-24 shrink-0 mt-0.5 uppercase">{key}</span>
                  <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {task.result && (
          <div className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-[var(--text-disabled)] uppercase tracking-widest font-semibold">Result</p>
              <span className="text-[10px] text-[var(--text-disabled)]">{task.result.length} chars</span>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
              <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed max-h-[30vh] overflow-y-auto">
                {task.result}
              </pre>
            </div>
          </div>
        )}

        {/* ── Danger Zone ── */}
        <div className="pt-4 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] text-[var(--text-disabled)] uppercase tracking-wider font-semibold mb-2">Danger Zone</p>
          <Button
            variant="destructive-outline"
            size="sm"
            onClick={() => {
              if (confirm(`Delete task "${task.hover_label || task.type}"? This cannot be undone.`)) {
                deleteMutation.mutate()
              }
            }}
            disabled={deleteMutation.isPending}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Task
          </Button>
        </div>
      </div>
    </SlideOver>
  )
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onClick,
  isSelected,
  onToggleSelect,
}: {
  task: Task
  onClick: () => void
  isSelected: boolean
  onToggleSelect: (id: string) => void
}) {
  const priorityBorderColors: Record<string, string> = {
    critical: 'border-l-[var(--status-error)]',
    high:     'border-l-[var(--status-warning)]',
    normal:   'border-l-[var(--accent)]',
    low:      'border-l-[var(--text-disabled)]',
  }

  return (
    <div className={cn(
      'flex items-center gap-0 transition-all border-b border-[var(--border-subtle)] last:border-0',
      isSelected ? 'bg-[var(--accent-subtle)]' : 'hover:bg-[var(--bg-card)]',
    )}>
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id) }}
        className="shrink-0 pl-4 pr-3 py-3.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
      >
        {isSelected
          ? <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
          : <Square className="h-4 w-4" />
        }
      </button>

      {/* Priority border */}
      <button
        onClick={onClick}
        className={cn(
          'flex-1 flex items-center gap-4 pl-0 pr-5 py-3.5 border-l-2 transition-all',
          priorityBorderColors[task.priority] ?? priorityBorderColors.normal,
        )}
      >
        {/* Status dot */}
        <div className="shrink-0">
          <StatusBadge status={task.status as any} showDot showLabel={false} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm text-[var(--text-secondary)] truncate">
            {task.hover_label || task.type || task.id}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={task.status as any} showDot={false} showLabel />
            {task.priority && task.priority !== 'normal' && (
              <span className={cn('text-[10px] font-medium uppercase', {
                'text-[var(--status-error)]': task.priority === 'critical',
                'text-[var(--status-warning)]': task.priority === 'high',
                'text-[var(--text-disabled)]': task.priority === 'low',
              })}>
                {task.priority}
              </span>
            )}
          </div>
        </div>

        {/* Type badge */}
        {task.type && (
          <Badge variant="secondary" size="sm" className="shrink-0 hidden sm:inline-flex">
            {task.type}
          </Badge>
        )}

        {/* Time */}
        {task.updated_at && (
          <span className="text-xs text-[var(--text-disabled)] shrink-0 font-mono hidden md:inline">
            {new Date(task.updated_at).toLocaleDateString()}
          </span>
        )}

        <ChevronRight className="h-4 w-4 text-[var(--text-disabled)] shrink-0" />
      </button>
    </div>
  )
}

// ─── Task Row Skeleton ────────────────────────────────────────────────────────

function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-0 border-b border-[var(--border-subtle)] last:border-0">
      {/* Checkbox */}
      <div className="shrink-0 pl-4 pr-3 py-3.5">
        <Skeleton className="h-4 w-4 rounded shrink-0" />
      </div>
      {/* Content */}
      <div className="flex-1 flex items-center gap-4 pl-0 pr-5 py-3.5">
        <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full shrink-0 hidden sm:inline-flex" />
        <Skeleton className="h-3 w-3 shrink-0 hidden md:inline" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'blocked', label: 'Blocked' },
]

export default function TasksPage() {
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState<'status' | 'date' | 'priority'>('status')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks', currentCompany?.slug],
    queryFn: () => getTasks(currentCompany!.slug, {}),
    enabled: !!currentCompany?.slug,
  })

  const filteredTasks = statusFilter === 'all'
    ? allTasks
    : allTasks.filter((t: Task) => t.status === statusFilter)

  const sortedTasks = [...filteredTasks].sort((a: Task, b: Task) => {
    if (sortOrder === 'date') {
      return (b.updated_at ? new Date(b.updated_at).getTime() : 0) -
             (a.updated_at ? new Date(a.updated_at).getTime() : 0)
    }
    if (sortOrder === 'priority') {
      const order: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
    }
    const statusOrder: Record<string, number> = {
      in_progress: 0,
      pending_verification: 1,
      pending: 2,
      blocked: 3,
      cancelled: 4,
      completed: 5,
    }
    return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  })

  // Counts per status
  const statusCounts: Record<string, number> = {
    all: allTasks.length,
    pending: allTasks.filter((t: Task) => t.status === 'pending').length,
    in_progress: allTasks.filter((t: Task) => t.status === 'in_progress').length,
    completed: allTasks.filter((t: Task) => t.status === 'completed').length,
    blocked: allTasks.filter((t: Task) => t.status === 'blocked').length,
  }

  // Bulk complete
  const bulkCompleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedTaskIds)
      const results = await Promise.allSettled(
        ids.map(id => updateTask(currentCompany!.slug, id, { status: 'completed' }))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0 && succeeded === 0) {
        throw new Error(`${failed} task(s) failed to complete`)
      }
      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentCompany?.slug] })
      queryClient.invalidateQueries({ queryKey: ['tasksRecent', currentCompany?.slug] })
      if (failed > 0) {
        toast({ title: `${succeeded} task(s) completed, ${failed} failed`, variant: 'warning' })
      } else {
        toast({ title: `${succeeded} task(s) completed`, variant: 'success' })
      }
      clearSelection()
    },
    onError: (err: Error) => toast({ title: err.message || 'Failed to complete tasks', variant: 'error' }),
  })

  // Bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedTaskIds)
      const results = await Promise.allSettled(ids.map(id => deleteTask(currentCompany!.slug, id)))
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0 && succeeded === 0) {
        throw new Error(`${failed} task(s) failed to delete`)
      }
      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentCompany?.slug] })
      queryClient.invalidateQueries({ queryKey: ['tasksRecent', currentCompany?.slug] })
      if (failed > 0) {
        toast({ title: `${succeeded} task(s) deleted, ${failed} failed`, variant: 'warning' })
      } else {
        toast({ title: `${succeeded} task(s) deleted`, variant: 'success' })
      }
      clearSelection()
    },
    onError: (err: Error) => toast({ title: err.message || 'Failed to delete tasks', variant: 'error' }),
  })

  const toggleSelect = (id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedTaskIds(new Set())

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        name={undefined}
        subtitle={`${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} in queue`}
        actions={
          <Button variant="purple" size="sm" className="gap-1.5" onClick={() => setNewTaskOpen(true)}>
            <Zap className="h-4 w-4" />
            New Task
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-[var(--text-disabled)] shrink-0" />
        {STATUS_FILTERS.map(filter => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border',
              statusFilter === filter.key
                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]'
            )}
          >
            {filter.label}
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              statusFilter === filter.key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)]'
            )}>
              {statusCounts[filter.key] ?? 0}
            </span>
          </button>
        ))}

        {/* Sort Dropdown */}
        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value as any)}
          className="ml-auto shrink-0 px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] cursor-pointer hover:border-[var(--border-strong)]"
        >
          <option value="status">Sort: Status</option>
          <option value="date">Sort: Date Updated</option>
          <option value="priority">Sort: Priority</option>
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedTaskIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] animate-fade-in">
          <span className="text-sm text-[var(--text-secondary)]">{selectedTaskIds.size} selected</span>
          <Button variant="teal" size="sm" onClick={() => bulkCompleteMutation.mutate()} isLoading={bulkCompleteMutation.isPending}>
            Complete All
          </Button>
          <Button variant="destructive-outline" size="sm" onClick={() => {
            if (confirm(`Delete ${selectedTaskIds.size} task(s)? This cannot be undone.`)) {
              bulkDeleteMutation.mutate()
            }
          }} isLoading={bulkDeleteMutation.isPending}>
            Delete All
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {/* Task List */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div>
            {[1, 2, 3, 4, 5].map(i => <TaskRowSkeleton key={i} />)}
          </div>
        ) : sortedTasks.length === 0 ? (
          <EmptyState
            variant="tasks"
            title={statusFilter === 'all' ? 'No tasks yet' : `No ${statusFilter.replace('_', ' ')} tasks`}
            description={statusFilter === 'all'
              ? 'The AI agent will create tasks automatically based on your plan.'
              : `No tasks with "${statusFilter.replace('_', ' ')}" status.`}
            action={statusFilter === 'all' ? {
              label: 'Create Task',
              onClick: () => setNewTaskOpen(true),
            } : undefined}
          />
        ) : (
          <div>
            {sortedTasks.map((task: Task, i: number) => (
              <div
                key={task.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <TaskRow
                  task={task}
                  onClick={() => setSelectedTask(task)}
                  isSelected={selectedTaskIds.has(task.id)}
                  onToggleSelect={toggleSelect}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />

      {/* New Task Modal */}
      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
    </div>
  )
}
