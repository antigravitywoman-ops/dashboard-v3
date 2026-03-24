'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCompany } from '@/context/company-context'
import { PageHero } from '@/components/ui/page-hero'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { SlideOver } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toaster'
import { getContent, getContentFile, updateContentStatus, publishContent } from '@/lib/api'
import type { ContentItem } from '@/lib/api'
import { NewTaskModal } from '@/components/new-task-modal'
import { cn } from '@/lib/utils'
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  ExternalLink,
  FileCode,
  X,
  Square,
  CheckSquare,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  draft:            'Draft',
  'in-review':      'In Review',
  approved:         'Approved',
  published:        'Published',
  rejected:         'Rejected',
  'pending-publish':'Pending Publish',
}

type StatusFilter = 'all' | 'draft' | 'in-review' | 'approved' | 'published' | 'rejected'

// ─── View Draft Modal ────────────────────────────────────────────────────────

function ViewDraftModal({
  item,
  open,
  onClose,
}: {
  item: ContentItem | null
  open: boolean
  onClose: () => void
}) {
  const { currentCompany } = useCompany()

  const { data: fileData, isLoading } = useQuery({
    queryKey: ['contentFile', currentCompany?.slug, item?.filename],
    queryFn: () => getContentFile(currentCompany!.slug, item!.filename),
    enabled: !!open && !!item,
  })

  return (
    <SlideOver
      open={open}
      onOpenChange={onClose}
      title={item?.title || item?.filename || 'View Draft'}
      description={item?.type ? `${item.type} · ${item.word_count?.toLocaleString() ?? 0} words` : undefined}
      width="xl"
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-5 w-full rounded" shimmer />
          ))}
        </div>
      ) : fileData?.content ? (
        <div className="space-y-4">
          {/* Meta info bar */}
          {item?.target_url && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)]">
              <span className="text-xs text-[var(--text-disabled)] shrink-0">Target:</span>
              <a
                href={item.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-1 truncate"
              >
                {item.target_url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}

          {/* Keywords */}
          {item?.keywords && item.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-border)]"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          {item?.summary && (
            <div className="px-3 py-2 rounded-lg border border-[rgba(99,102,241,0.15)] bg-[rgba(99,102,241,0.06)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">Summary</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.summary}</p>
            </div>
          )}

          {/* Content */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)]">
              <FileCode className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-mono text-[var(--text-muted)]">{item?.filename}</span>
            </div>
            <pre className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-mono bg-[var(--bg-primary)] p-5 max-h-[60vh] overflow-y-auto">
              {fileData.content}
            </pre>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <FileText className="h-8 w-8 text-[var(--text-disabled)] mb-3" />
          <p className="text-sm text-[var(--text-muted)]">No content available</p>
        </div>
      )}
    </SlideOver>
  )
}

// ─── Publish Modal ─────────────────────────────────────────────────────────────

function PublishModal({
  open,
  onClose,
  item,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  item: ContentItem
  onConfirm: (channels: string[], scheduledAt?: string | null) => void
}) {
  const [channels, setChannels] = useState({
    linkedin: true,
    reddit: true,
    quora: true,
    medium: false,
  })
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  const selectedChannels = Object.entries(channels)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)

  const scheduledAt =
    scheduleMode === 'schedule' && scheduleDate && scheduleTime
      ? `${scheduleDate}T${scheduleTime}`
      : null

  const isScheduleIncomplete =
    scheduleMode === 'schedule' && (!scheduleDate || !scheduleTime)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogHeader>
        <DialogTitle>Publish Content</DialogTitle>
        <DialogDescription>
          Distribute "{item.title || item.filename}" to selected channels.
        </DialogDescription>
      </DialogHeader>

      <div className="p-6 pt-4 space-y-4">
        {/* Schedule toggle */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setScheduleMode('now')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              scheduleMode === 'now'
                ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            Publish Now
          </button>
          <button
            onClick={() => setScheduleMode('schedule')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              scheduleMode === 'schedule'
                ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            Schedule
          </button>
        </div>

        {/* Date/time inputs */}
        {scheduleMode === 'schedule' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Time</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
              />
            </div>
          </div>
        )}

        {/* Distribution channels */}
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Distribution Channels</p>
          {[
            { key: 'linkedin', label: 'LinkedIn', desc: 'Professional network post' },
            { key: 'reddit',   label: 'Reddit',    desc: 'Community sharing' },
            { key: 'quora',   label: 'Quora',     desc: 'Q&A platform' },
            { key: 'medium',  label: 'Medium',    desc: 'Publishing platform' },
          ].map(ch => (
            <label
              key={ch.key}
              className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-[var(--bg-elevated)] rounded-lg px-2 -mx-2 transition-colors"
            >
              <input
                type="checkbox"
                checked={channels[ch.key as keyof typeof channels]}
                onChange={e => setChannels(prev => ({ ...prev, [ch.key]: e.target.checked }))}
                className="h-4 w-4 rounded border-[var(--border-strong)] bg-[var(--bg-surface)] accent-[var(--accent)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{ch.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{ch.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="indigo"
          onClick={() => onConfirm(selectedChannels, scheduledAt)}
          className="gap-1.5"
          disabled={selectedChannels.length === 0 || isScheduleIncomplete}
        >
          <Send className="h-4 w-4" />
          {isScheduleIncomplete ? 'Fill date & time' : scheduleMode === 'schedule' ? 'Schedule' : 'Publish Now'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ─── Content Card ─────────────────────────────────────────────────────────────

function ContentCard({
  item,
  onApprove,
  onReject,
  onPublish,
  onView,
  onSubmitReview,
  isSelected,
  onToggleSelect,
}: {
  item: ContentItem
  onApprove: () => void
  onReject: () => void
  onPublish: () => void
  onView: () => void
  onSubmitReview: () => void
  isSelected: boolean
  onToggleSelect: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      'bg-[var(--bg-card)] border rounded-xl p-5 transition-all duration-150',
      'hover:border-[var(--border-strong)] hover:shadow-md',
      isSelected ? 'border-[var(--accent)] border-2' : 'border-[var(--border)]'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        {/* Selection checkbox */}
        <button
          onClick={onToggleSelect}
          className="mt-0.5 shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug mb-1">
            {item.title || item.filename}
          </h3>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="secondary" size="sm">{item.type || 'Content'}</Badge>
            {item.word_count && (
              <span className="text-xs text-[var(--text-muted)]">{item.word_count.toLocaleString()} words</span>
            )}
            {item.author && (
              <span className="text-xs text-[var(--text-muted)]">by {item.author}</span>
            )}
            <StatusBadge status={item.status as any} showBadge />
          </div>

          {/* Keywords */}
          {item.keywords && item.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {item.keywords.slice(0, 4).map((kw, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]"
                >
                  {kw}
                </span>
              ))}
              {item.keywords.length > 4 && (
                <span className="text-[10px] text-[var(--text-disabled)]">+{item.keywords.length - 4}</span>
              )}
            </div>
          )}

          {/* Summary */}
          {item.summary && (
            <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-2">{item.summary}</p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-[var(--text-disabled)] hover:text-[var(--text-muted)] transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3 animate-fade-in">
          {item.target_url && (
            <div>
              <span className="text-xs text-[var(--text-disabled)] block mb-1">Target URL</span>
              <a
                href={item.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-1"
              >
                {item.target_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {item.highlights && item.highlights.length > 0 && (
            <div>
              <span className="text-xs text-[var(--text-disabled)] block mb-1">Highlights</span>
              <ul className="space-y-1">
                {item.highlights.slice(0, 3).map((h, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)]">{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <Button variant="ghost" size="sm" onClick={onView} className="gap-1.5 text-[var(--text-muted)]">
          <Eye className="h-3.5 w-3.5" />
          View Draft
        </Button>

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

        {(item.status === 'in-review') && (
          <>
            <Button variant="teal-ghost" size="sm" onClick={onApprove} className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button variant="destructive-ghost" size="sm" onClick={onReject} className="gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}

        {item.status === 'approved' && (
          <Button variant="indigo" size="sm" onClick={onPublish} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Publish
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Content Card Skeleton ────────────────────────────────────────────────────

function ContentCardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox + content (mirrors ContentCard header row) */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-3/4" shimmer />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" shimmer />
            <Skeleton className="h-4 w-2/3" shimmer />
          </div>
        </div>
        {/* Expand toggle */}
        <Skeleton className="h-6 w-6 rounded shrink-0" />
      </div>
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all')
  const [viewItem, setViewItem] = useState<ContentItem | null>(null)
  const [publishItem, setPublishItem] = useState<ContentItem | null>(null)
  const [rejectItem, setRejectItem] = useState<ContentItem | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['content', currentCompany?.slug],
    queryFn: () => getContent(currentCompany!.slug),
    enabled: !!currentCompany?.slug,
  })

  const content = data?.content ?? []

  const filteredContent = activeFilter === 'all'
    ? content
    : content.filter(c => c.status === activeFilter)

  const statusCounts: Record<string, number> = {
    all:           content.length,
    draft:         content.filter(c => c.status === 'draft').length,
    'in-review':   content.filter(c => c.status === 'in-review').length,
    approved:      content.filter(c => c.status === 'approved').length,
    published:     content.filter(c => c.status === 'published').length,
    rejected:      content.filter(c => c.status === 'rejected').length,
  }

  const statusMutation = useMutation({
    mutationFn: ({ filename, status }: { filename: string; status: string }) =>
      updateContentStatus(currentCompany!.slug, filename, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', currentCompany?.slug] })
      toast({ title: 'Status updated', variant: 'success' })
      setRejectItem(null)
      setRejectComment('')
    },
    onError: () => toast({ title: 'Failed to update status', variant: 'error' }),
  })

  const publishMutation = useMutation({
    mutationFn: ({
      filename,
      channels,
      scheduledAt,
    }: {
      filename: string
      channels: string[]
      scheduledAt?: string | null
    }) =>
      publishContent(currentCompany!.slug, filename, channels, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', currentCompany?.slug] })
      toast({
        title: 'Publish task created',
        variant: 'success',
        description: 'The AI will distribute this content shortly.',
      })
      setPublishItem(null)
    },
    onError: () => toast({ title: 'Failed to start publishing', variant: 'error' }),
  })

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedContent)
      const results = await Promise.allSettled(
        ids.map(id => updateContentStatus(currentCompany!.slug, id, 'approved'))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['content', currentCompany?.slug] })
      if (failed > 0 && succeeded === 0) {
        toast({ title: `${failed} item(s) failed to approve`, variant: 'error' })
      } else if (failed > 0) {
        toast({ title: `${succeeded} approved, ${failed} failed`, variant: 'warning' })
      } else {
        toast({ title: `${succeeded} item(s) approved`, variant: 'success' })
      }
      clearSelection()
    },
    onError: () => toast({ title: 'Failed to approve items', variant: 'error' }),
  })

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedContent)
      const results = await Promise.allSettled(
        ids.map(id => updateContentStatus(currentCompany!.slug, id, 'rejected'))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['content', currentCompany?.slug] })
      if (failed > 0 && succeeded === 0) {
        toast({ title: `${failed} item(s) failed to reject`, variant: 'error' })
      } else if (failed > 0) {
        toast({ title: `${succeeded} rejected, ${failed} failed`, variant: 'warning' })
      } else {
        toast({ title: `${succeeded} item(s) rejected`, variant: 'success' })
      }
      clearSelection()
    },
    onError: () => toast({ title: 'Failed to reject items', variant: 'error' }),
  })

  const toggleSelect = (filename: string) => {
    setSelectedContent(prev => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }

  const clearSelection = () => setSelectedContent(new Set())

  const handleApprove = (item: ContentItem) => {
    statusMutation.mutate({ filename: item.filename, status: 'approved' })
  }

  const handleSubmitReview = (item: ContentItem) => {
    statusMutation.mutate({ filename: item.filename, status: 'in-review' })
  }

  const handleReject = (item: ContentItem) => {
    setRejectItem(item)
  }

  const confirmReject = () => {
    if (!rejectItem) return
    statusMutation.mutate({ filename: rejectItem.filename, status: 'rejected' })
  }

  const handlePublish = (item: ContentItem) => {
    setPublishItem(item)
  }

  const confirmPublish = (channels: string[], scheduledAt?: string | null) => {
    if (!publishItem) return
    publishMutation.mutate({ filename: publishItem.filename, channels, scheduledAt })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        name={undefined}
        subtitle={`${content.length} content item${content.length !== 1 ? 's' : ''} across ${Object.values(statusCounts).filter((v, i) => v > 0 && i > 0).length} stages`}
        actions={
          <Button variant="indigo" size="sm" className="gap-1.5" onClick={() => setNewTaskOpen(true)}>
            <Plus className="h-4 w-4" />
            Generate Content
          </Button>
        }
      />

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={v => setActiveFilter(v as StatusFilter)}>
        <TabsList variant="default">
          {(['all', 'draft', 'in-review', 'approved', 'published', 'rejected'] as StatusFilter[]).map(status => (
            <TabsTrigger key={status} value={status} className="gap-1.5">
              {STATUS_LABELS[status] ?? status}
              {statusCounts[status] > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                  {statusCounts[status]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Bulk action bar */}
        {selectedContent.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3
            bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg z-50 animate-fade-in">
            <span className="text-sm text-[var(--text-secondary)]">{selectedContent.size} selected</span>
            <Button
              variant="teal"
              size="sm"
              onClick={() => bulkApproveMutation.mutate()}
              isLoading={bulkApproveMutation.isPending}
            >
              Approve All
            </Button>
            <Button
              variant="destructive-outline"
              size="sm"
              onClick={() => {
                if (confirm(`Reject ${selectedContent.size} item(s)?`)) {
                  bulkRejectMutation.mutate()
                }
              }}
              isLoading={bulkRejectMutation.isPending}
            >
              Reject All
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content List */}
        <TabsContent value={activeFilter} className="mt-0 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredContent.length === 0 ? (
            <EmptyState
              variant="content"
              title="No content here yet"
              description={
                activeFilter === 'all'
                  ? 'AI generates content based on your plan. Configure your scope in Settings to guide content direction.'
                  : `No items with status "${STATUS_LABELS[activeFilter] || activeFilter}"`
              }
              action={activeFilter === 'all' ? {
                label: 'Configure Scope',
                onClick: () => { window.location.href = '/dashboard/settings' },
              } : undefined}
            />
          ) : (
            <div className="space-y-3">
              {filteredContent.map((item, i) => (
                <div
                  key={item.filename}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <ContentCard
                    item={item}
                    onApprove={() => handleApprove(item)}
                    onReject={() => handleReject(item)}
                    onPublish={() => handlePublish(item)}
                    onView={() => setViewItem(item)}
                    onSubmitReview={() => handleSubmitReview(item)}
                    isSelected={selectedContent.has(item.filename)}
                    onToggleSelect={() => toggleSelect(item.filename)}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Draft Modal */}
      <ViewDraftModal
        item={viewItem}
        open={!!viewItem}
        onClose={() => setViewItem(null)}
      />

      {/* Publish Modal */}
      {publishItem && (
        <PublishModal
          open={!!publishItem}
          item={publishItem}
          onClose={() => setPublishItem(null)}
          onConfirm={confirmPublish}
        />
      )}

      {/* Reject Modal */}
      <Dialog open={!!rejectItem} onOpenChange={open => !open && setRejectItem(null)}>
        <DialogHeader>
          <DialogTitle>Reject Content</DialogTitle>
          <DialogDescription>
            Are you sure you want to reject "{rejectItem?.title || rejectItem?.filename}"?
            Add a comment to explain why.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-4">
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectComment}
            onChange={e => setRejectComment(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setRejectItem(null)}>Cancel</Button>
          <Button variant="destructive" onClick={confirmReject} isLoading={statusMutation.isPending}>
            Reject
          </Button>
        </DialogFooter>
      </Dialog>

      {/* New Task Modal */}
      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
    </div>
  )
}
