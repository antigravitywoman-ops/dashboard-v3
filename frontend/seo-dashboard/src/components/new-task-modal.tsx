'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCompany } from '@/context/company-context'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toaster'
import { createTask } from '@/lib/api'
import { Zap, AlertCircle, Plus, X } from 'lucide-react'

interface NewTaskModalProps {
  open: boolean
  onClose: () => void
}

const TASK_TYPES = [
  { value: 'content', label: 'Content', desc: 'Generate or edit content' },
  { value: 'technical', label: 'Technical', desc: 'SEO technical fixes' },
  { value: 'keyword_research', label: 'Keyword Research', desc: 'Find new keyword opportunities' },
  { value: 'link_building', label: 'Link Building', desc: 'Build backlinks and citations' },
  { value: 'on_page', label: 'On-Page SEO', desc: 'Meta tags, schema, content optimization' },
  { value: 'audit', label: 'Audit', desc: 'Site audit and analysis' },
  { value: 'report', label: 'Report', desc: 'Generate strategy report' },
  { value: 'outreach', label: 'Outreach', desc: 'Outreach and promotion' },
  { value: 'other', label: 'Other', desc: 'Custom task' },
]

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  { value: 'high', label: 'High', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { value: 'normal', label: 'Normal', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  { value: 'low', label: 'Low', color: '#52525B', bg: '#222225' },
]

export function NewTaskModal({ open, onClose }: NewTaskModalProps) {
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [taskType, setTaskType] = useState('content')
  const [priority, setPriority] = useState('normal')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [keywords, setKeywords] = useState('')

  const resetForm = () => {
    setTaskType('content')
    setPriority('normal')
    setTitle('')
    setDescription('')
    setTargetUrl('')
    setKeywords('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const context: Record<string, unknown> = {}
      if (title) context.title = title
      if (description) context.description = description
      if (targetUrl) context.target_url = targetUrl
      if (keywords) context.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean)

      return createTask(currentCompany!.slug, {
        type: taskType,
        priority,
        context,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', currentCompany?.slug] })
      queryClient.invalidateQueries({ queryKey: ['taskSummary', currentCompany?.slug] })
      toast({ title: 'Task created', variant: 'success', description: 'The task has been queued.' })
      handleClose()
    },
    onError: () => {
      toast({ title: 'Failed to create task', variant: 'error' })
    },
  })

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[rgba(167,139,250,0.12)]">
            <Zap className="h-5 w-5 text-[#A78BFA]" />
          </div>
          <div>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Queue a new task for the AI agent to execute
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="p-6 pt-4 space-y-5 max-h-[60vh] overflow-y-auto">
        {/* Task Type */}
        <div>
          <label className="text-xs font-medium text-[#71717A] block mb-2">Task Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TASK_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setTaskType(t.value)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  taskType === t.value
                    ? 'border-[#A78BFA] bg-[rgba(167,139,250,0.12)]'
                    : 'border-[#27272A] bg-[#111113] hover:border-[#3F3F46]'
                }`}
              >
                <p className={`text-xs font-medium ${
                  taskType === t.value ? 'text-[#A78BFA]' : 'text-[#A1A1AA]'
                }`}>{t.label}</p>
                <p className="text-[10px] text-[#52525B] mt-0.5 leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-medium text-[#71717A] block mb-2">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                  priority === p.value
                    ? 'border-current'
                    : 'border-[#27272A] bg-[#111113] hover:border-[#3F3F46]'
                }`}
                style={{
                  color: priority === p.value ? p.color : '#71717A',
                  backgroundColor: priority === p.value ? p.bg : undefined,
                  borderColor: priority === p.value ? p.color : undefined,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-[#71717A] block mb-1.5">Title (optional)</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Write blog post about SEO best practices"
          />
        </div>

        {/* Target URL */}
        <div>
          <label className="text-xs font-medium text-[#71717A] block mb-1.5">Target URL (optional)</label>
          <Input
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://example.com/page"
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="text-xs font-medium text-[#71717A] block mb-1.5">Keywords (optional)</label>
          <Input
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="keyword 1, keyword 2, keyword 3"
          />
          <p className="text-[10px] text-[#52525B] mt-1">Separate keywords with commas</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-[#71717A] block mb-1.5">Instructions (optional)</label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Any specific instructions or context for the agent..."
            className="min-h-[80px]"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
        <Button
          variant="purple"
          onClick={() => createMutation.mutate()}
          isLoading={createMutation.isPending}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
