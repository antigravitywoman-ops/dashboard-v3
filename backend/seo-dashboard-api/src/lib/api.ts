const VM_API_URL = process.env.NEXT_PUBLIC_VM_API_URL || 'http://localhost:3456'
const VM_API_KEY = process.env.NEXT_PUBLIC_VM_API_KEY || ''

interface FetchOptions extends RequestInit {
  params?: Record<string, string>
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options

  let url = `${VM_API_URL}${endpoint}`

  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  // Add API key if available
  if (VM_API_KEY) {
    headers['X-API-Key'] = VM_API_KEY
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(response.status, error.error || 'Request failed')
  }

  return response.json()
}

// Companies
export async function getCompanies() {
  return fetchApi<{ active: Company[]; paused: Company[]; total: number }>('/api/companies')
}

export async function getCompany(slug: string) {
  return fetchApi<Company>(`/api/companies/${slug}`)
}

// Tasks
export async function getTasks(slug: string) {
  return fetchApi<Task[]>(`/api/companies/${slug}/tasks`)
}

export async function getTask(slug: string, taskId: string) {
  return fetchApi<Task>(`/api/companies/${slug}/tasks/${taskId}`)
}

export async function getTaskSummary(slug: string) {
  return fetchApi<TaskSummary>(`/api/companies/${slug}/tasks/summary`)
}

export async function createTask(slug: string, data: CreateTaskInput) {
  return fetchApi<Task>(`/api/companies/${slug}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTask(slug: string, taskId: string, data: UpdateTaskInput) {
  return fetchApi<Task>(`/api/companies/${slug}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Files
export async function getFolders(slug: string) {
  return fetchApi<{ folders: Folder[] }>(`/api/companies/${slug}/folders`)
}

export async function getFiles(slug: string, path: string) {
  return fetchApi<{ path: string; files: FileInfo[] }>(`/api/companies/${slug}/files`, {
    params: { path },
  })
}

export async function getFile(slug: string, path: string) {
  return fetchApi<{ path: string; content: string; size: number; modified: string }>(
    `/api/companies/${slug}/file`,
    { params: { path } }
  )
}

export async function updateFile(slug: string, path: string, content: string) {
  return fetchApi<{ success: boolean; path: string }>(`/api/companies/${slug}/file`, {
    method: 'PUT',
    body: JSON.stringify({ path, content }),
  })
}

// Reports
export async function getReportPeriods(slug: string) {
  return fetchApi<{ periods: Period[] }>(`/api/companies/${slug}/reports/periods`)
}

export async function getReportSheets(slug: string, period: string) {
  return fetchApi<{ period: string; sheets: Sheet[] }>(
    `/api/companies/${slug}/reports/${period}/sheets`
  )
}

export async function getReportSheet(slug: string, period: string, num: string) {
  return fetchApi<{ period: string; sheet: string; filename: string; content: string }>(
    `/api/companies/${slug}/reports/${period}/sheets/${num}`
  )
}

export async function downloadReportExcel(slug: string, period: string) {
  const response = await fetch(`${VM_API_URL}/api/companies/${slug}/reports/${period}/output`, {
    headers: VM_API_KEY ? { 'X-API-Key': VM_API_KEY } : {},
  })

  if (!response.ok) {
    throw new Error('Failed to download report')
  }

  return response.blob()
}

// Content
export async function getContent(slug: string) {
  return fetchApi<{ content: ContentItem[] }>(`/api/companies/${slug}/content`)
}

export async function getContentFile(slug: string, filename: string) {
  return fetchApi<{ filename: string; path: string; content: string }>(
    `/api/companies/${slug}/content/${filename}`
  )
}

export async function updateContent(slug: string, filename: string, data: UpdateContentInput) {
  return fetchApi<{ success: boolean }>(`/api/companies/${slug}/content/${filename}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function updateContentStatus(slug: string, filename: string, status: string) {
  return fetchApi<{ success: boolean; status: string }>(
    `/api/companies/${slug}/content/${filename}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  )
}

// Environment
export async function getEnvVars(slug: string) {
  return fetchApi<{ env: Record<string, string> }>(`/api/companies/${slug}/env`)
}

export async function updateEnvVars(slug: string, vars: Record<string, string>) {
  return fetchApi<{ success: boolean; env: Record<string, string> }>(
    `/api/companies/${slug}/env`,
    {
      method: 'PUT',
      body: JSON.stringify({ vars }),
    }
  )
}

// Technical
export async function getTechnical(slug: string) {
  return fetchApi<TechnicalOverview>(`/api/companies/${slug}/technical`)
}

// State
export async function getHeartbeat() {
  return fetchApi<Record<string, unknown>>('/api/state/heartbeat')
}

// Types
export interface Company {
  slug: string
  name: string
  industry?: string
  status: 'active' | 'paused'
  folder_exists?: boolean
}

export interface Task {
  id: string
  type: string
  status: string
  priority: string
  assigned_to: string
  company: string
  context?: Record<string, unknown>
  created_at: string
  updated_at: string
  completed_at?: string
  result?: string | null
  progress?: {
    current_step?: number
    total_steps?: number
    message?: string
    updated_at?: string
  } | null
  // Additional fields from queue.json (populated by API from per-company queue.json)
  report_period?: string | null
  iteration?: number
  result_path?: string | null
  attempt_count?: number
}

export interface TaskSummary {
  total: number
  pending: number
  in_progress: number
  pending_verification: number
  completed: number
  blocked: number
  cancelled: number
}

export interface CreateTaskInput {
  type: string
  priority?: string
  context: Record<string, unknown>
  assigned_to?: string
}

export interface UpdateTaskInput {
  status?: string
  result?: string
}

export interface Folder {
  name: string
  path: string
  fileCount: number
}

export interface FileInfo {
  name: string
  path: string
  size: number
  modified: string
}

export interface Period {
  id: string
  label: string
}

export interface Sheet {
  number: number
  name: string
  filename: string
}

export interface ContentItem {
  filename: string
  path: string
  status: string
  title: string
  type: string
  word_count?: number
  seo_score?: number
  target_url?: string
  author?: string
  created_at: string
  updated_at: string
  modified: string
}

export interface UpdateContentInput {
  content?: string
  move_to_status?: string
}

export interface SnapshotParsed {
  generated_at: string | null
  period: string | null
  gsc: Record<string, unknown> | null
  ga4: Record<string, unknown> | null
  delta: Record<string, unknown> | null
  top_pages: Array<{
    url: string
    impressions: number
    clicks: number
    ctr: number
    avg_position: number
  }>
  top_queries: Array<{
    query: string
    impressions: number
    clicks: number
    ctr: number
    avg_position: number
  }>
  keywords: Array<{
    keyword: string
    previous: number
    current: number
    delta: number
    volume: number
    difficulty: number
  }>
  technical_health: number | null
  action_items: Array<{ text: string; done?: boolean; priority?: string }>
  notes: string[]
}

export interface TechnicalOverview {
  audits: Array<{
    filename: string
    timestamp: string
    pages_crawled: number
    summary: {
      total_issues: number
      critical: number
      high: number
      medium: number
      low: number
      fixed: number
    }
  }>
  issues: string[]
  snapshot: SnapshotParsed | null
  snapshot_raw: string | null
}

export { ApiError }
