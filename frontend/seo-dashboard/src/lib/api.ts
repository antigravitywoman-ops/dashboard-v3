const VM_API_URL = process.env.NEXT_PUBLIC_VM_API_URL || 'http://localhost:3456'
const VM_API_KEY = process.env.NEXT_PUBLIC_VM_API_KEY || ''

// Get session token from session storage (set by NextAuth)
function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('next-auth.session-token')
  return token
}

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
    ...(fetchOptions.headers as Record<string, string>),
  }

  // Add API key if available (primary auth for dashboard)
  if (VM_API_KEY) {
    headers['x-api-key'] = VM_API_KEY
  }

  // Also try to get session token from localStorage (for user-specific requests)
  if (typeof window !== 'undefined') {
    const sessionToken = localStorage.getItem('next-auth.session-token')
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken
    }
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
export async function getTasks(slug: string, opts?: { yearMonth?: string; from?: string; to?: string }) {
  return fetchApi<Task[]>(`/api/companies/${slug}/tasks`, {
    params: opts?.yearMonth ? { yearMonth: opts.yearMonth }
         : opts?.from ? { from: opts.from, to: opts.to || '' }
         : undefined,
  })
}

export async function getTask(slug: string, taskId: string) {
  return fetchApi<Task>(`/api/companies/${slug}/tasks/${taskId}`)
}

export async function getTaskSummary(slug: string, opts?: { yearMonth?: string; from?: string; to?: string }) {
  return fetchApi<TaskSummary>(`/api/companies/${slug}/tasks/summary`, {
    params: opts?.yearMonth ? { yearMonth: opts.yearMonth }
         : opts?.from ? { from: opts.from, to: opts.to || '' }
         : undefined,
  })
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

export async function deleteTask(slug: string, taskId: string): Promise<void> {
  return fetchApi<void>(`/api/companies/${slug}/tasks/${taskId}`, {
    method: 'DELETE',
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
    headers: VM_API_KEY ? { 'x-api-key': VM_API_KEY } : {},
  })

  if (!response.ok) {
    throw new Error('Failed to download report')
  }

  return response.blob()
}

export async function updateReportSheet(slug: string, period: string, num: string, content: string) {
  return fetchApi<{ success: boolean; modified_at: string; content_hash: string }>(
    `/api/companies/${slug}/reports/${period}/sheets/${num}`,
    {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }
  )
}

// Content
export async function getContent(slug: string) {
  return fetchApi<{ content: ContentItem[]; _initialized?: boolean }>(`/api/companies/${slug}/content`)
}

export async function getContentFile(slug: string, filename: string) {
  return fetchApi<{ filename: string; path: string; content: string }>(
    `/api/companies/${slug}/content/${filename}`
  )
}

export async function getContentMeta(slug: string, filename: string) {
  return fetchApi<Record<string, unknown>>(`/api/companies/${slug}/content/${filename}/meta`)
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

export async function publishContent(
  slug: string,
  filename: string,
  channels?: string[],
  scheduledAt?: string | null
) {
  const params = new URLSearchParams()
  if (channels?.length) params.set('channels', channels.join(','))
  if (scheduledAt) params.set('scheduled_at', scheduledAt)
  const query = params.toString()
  const url = `/api/companies/${slug}/content/${filename}/publish${query ? `?${query}` : ''}`
  return fetchApi<{ success: boolean; task: Task; publishing_status: string; publishing_task_id: string; message: string }>(
    url,
    {
      method: 'POST',
    }
  )
}

// Environment
export async function getEnvVars(slug: string) {
  return fetchApi<{ env: Record<string, string>; error?: string }>(`/api/companies/${slug}/env`)
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

export async function getCronLog() {
  return fetchApi<{ log: string; size: number; modified: string }>('/api/state/cron')
}

// Plans
export async function getPlans(slug: string) {
  return fetchApi<{ plans: Plan[]; active_plan: Plan | null; _initialized?: boolean; _has_plans?: boolean; _has_active_plan?: boolean }>(`/api/companies/${slug}/plans`)
}

export async function getPlanFile(slug: string, planPath: string) {
  return fetchApi<{ content: string }>(`/api/companies/${slug}/plans/${planPath}`)
}

export interface PlanMetric {
  target: string
  current: string
  done?: boolean
}

export async function getPlanDetail(slug: string, planPath: string) {
  return fetchApi<{
    content: string
    meta: Record<string, unknown>
    parsed_sections: {
      executive_summary: string | null
      missed_items_note: string | null
      tasks_summary: { total: number; completed: number; pending: number; blocked: number }
    }
  }>(`/api/companies/${slug}/plans/${planPath}`)
}

export async function updatePlanMetrics(
  slug: string,
  metrics: Record<string, PlanMetric>,
  notes?: string
) {
  const body: Record<string, unknown> = {}
  if (metrics) body.success_metrics = metrics
  if (notes !== undefined) body.notes = notes
  return fetchApi<{ success: boolean; success_metrics: Record<string, unknown>; notes?: string }>(
    `/api/companies/${slug}/plans/metrics`,
    { method: 'PATCH', body: JSON.stringify(body) }
  )
}

// Reviews
export async function getReviews(slug: string) {
  return fetchApi<{ reviews: Review[] }>(`/api/companies/${slug}/reviews`)
}

export async function getReviewFile(slug: string, filename: string) {
  return fetchApi<{ filename: string; content: string }>(`/api/companies/${slug}/reviews/${filename}`)
}

export async function getReviewMeta(slug: string, filename: string) {
  return fetchApi<ReviewMeta>(`/api/companies/${slug}/reviews/${filename}/meta`)
}

export async function updateReview(
  slug: string,
  filename: string,
  data: UpdateReviewInput
) {
  return fetchApi<{ success: boolean; meta: ReviewMeta }>(
    `/api/companies/${slug}/reviews/${filename}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )
}

// About
export async function getAboutFiles(slug: string) {
  return fetchApi<{ files: AboutFile[] }>(`/api/companies/${slug}/about`)
}

export async function getAboutFile(slug: string, filename: string) {
  return fetchApi<{ filename: string; path: string; content: string }>(`/api/companies/${slug}/about/${filename}`)
}

export async function getAboutMeta(slug: string, filename: string) {
  return fetchApi<AboutMeta>(`/api/companies/${slug}/about/${filename}/meta`)
}

export async function updateAboutMeta(slug: string, filename: string, meta: Record<string, unknown>) {
  return fetchApi<{ success: boolean; filename: string; meta: Record<string, unknown> }>(
    `/api/companies/${slug}/about/${filename}/meta`,
    {
      method: 'PUT',
      body: JSON.stringify({ meta }),
    }
  )
}

// Chat
export async function sendChatMessage(company: string, message: string, filePath?: string, fileContent?: string) {
  return fetchApi<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ company, message, file_path: filePath, file_content: fileContent }),
  })
}

// Streaming chat using Server-Sent Events (SSE)
export async function* streamChatMessage(
  company: string,
  message: string,
  filePath?: string,
  fileContent?: string
): AsyncGenerator<{ type: string; content?: string; error?: string }> {
  const VM_API_URL = process.env.NEXT_PUBLIC_VM_API_URL || 'http://localhost:3456'
  const VM_API_KEY = process.env.NEXT_PUBLIC_VM_API_KEY || ''

  // Get session token from localStorage
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (VM_API_KEY) {
    headers['x-api-key'] = VM_API_KEY
  }

  if (typeof window !== 'undefined') {
    const sessionToken = localStorage.getItem('next-auth.session-token')
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken
    }
  }

  // Try streaming endpoint first
  try {
    const response = await fetch(`${VM_API_URL}/api/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ company, message, file_path: filePath, file_content: fileContent }),
    })

    // If streaming endpoint returns 404 or not implemented, fall back to non-streaming
    if (response.status === 404 || response.status === 501) {
      yield { type: 'fallback' }
      return
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      // If the error is about the endpoint not existing, fall back
      if (response.status === 404) {
        yield { type: 'fallback' }
        return
      }
      throw new Error(error.error || 'Request failed')
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE messages (separated by double newline)
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            yield data
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } catch (error) {
    // If streaming fails (network error, etc.), fall back to non-streaming
    console.warn('Streaming failed, falling back to non-streaming:', error)
    yield { type: 'fallback' }
  }
}

export async function getChatHistory(company: string) {
  return fetchApi<{ company: string; history: ChatMessage[] }>(`/api/chat/history/${company}`)
}

export async function clearChatHistory(company: string) {
  return fetchApi<{ success: boolean }>(`/api/chat/history/${company}`, {
    method: 'DELETE',
  })
}

export async function getChatSessions(company: string) {
  return fetchApi<{ company: string; sessions: ChatSession[] }>(`/api/chat/sessions/${company}`)
}

export interface ChatSession {
  filename: string
  session_id: string
  message_count: number
  started_at: string
  ended_at?: string
  status: string
  updated_at: string
}

// ============================================
// User Management
// ============================================

// Get all users (MASTER only)
export async function getUsers() {
  return fetchApi<{ users: User[] }>('/api/users')
}

// Get user by ID
export async function getUser(userId: string) {
  return fetchApi<{ user: User }>(`/api/users/${userId}`)
}

// Create new user (MASTER only)
export async function createUser(data: CreateUserInput) {
  return fetchApi<{ user: User }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Update user
export async function updateUser(userId: string, data: UpdateUserInput) {
  return fetchApi<{ user: User }>(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Delete user (MASTER only)
export async function deleteUser(userId: string) {
  return fetchApi<{ success: boolean }>(`/api/users/${userId}`, {
    method: 'DELETE',
  })
}

// Change password
export async function changePassword(userId: string, password: string) {
  return fetchApi<{ success: boolean }>(`/api/users/${userId}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  })
}

// Get user's companies
export async function getUserCompanies(userId: string) {
  return fetchApi<{ role: string; companies: UserCompany[] | null }>(
    `/api/users/${userId}/companies`
  )
}

// Assign company to user (MASTER only)
export async function assignCompanyToUser(userId: string, companyId: string, role: string = 'VIEWER') {
  return fetchApi<{ userCompany: UserCompany }>(`/api/users/${userId}/companies`, {
    method: 'POST',
    body: JSON.stringify({ companyId, role }),
  })
}

// Remove company from user (MASTER only)
export async function removeCompanyFromUser(userId: string, companyId: string) {
  return fetchApi<{ success: boolean }>(`/api/users/${userId}/companies/${companyId}`, {
    method: 'DELETE',
  })
}

// Company data management
export async function resetCompanyData(slug: string) {
  return fetchApi<{ success: boolean; message: string }>(`/api/companies/${slug}/reset`, {
    method: 'POST',
  })
}

export async function deleteCompany(slug: string) {
  return fetchApi<{ success: boolean }>(`/api/companies/${slug}`, {
    method: 'DELETE',
  })
}

// Company scope
export async function getScope(slug: string) {
  return fetchApi<{ scope: Record<string, unknown> }>(`/api/companies/${slug}/scope`)
}

export async function updateScope(slug: string, scope: Record<string, unknown>) {
  return fetchApi<{ success: boolean; scope: Record<string, unknown> }>(
    `/api/companies/${slug}/scope`,
    { method: 'PUT', body: JSON.stringify({ scope }) }
  )
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
  // Human-readable label derived from type + context
  hover_label?: string
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
  sortKey?: string
  type?: 'week' | 'quarter' | 'month'
}

export interface Sheet {
  number: number
  name: string
  filename: string
  sheet_id?: string
  sheet_name?: string
  period?: string
  summary?: string
  highlights?: string[]
  validation_status?: string
  validation_errors?: string[] | null
  keywords_count?: number | null
  competitors_analyzed?: number | null
  gaps_identified?: number | null
  tasks_generated?: number | null
  data_sources?: string[]
  linked_sheets?: string[]
  content_hash?: string | null
  generated_at?: string | null
  generated_by?: string | null
  modified_at?: string | null
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
  gap_id?: string
  priority?: string
  keywords?: string[]
  summary?: string
  highlights?: string[]
  created_at: string
  updated_at: string
  modified: string
  publishing_status: string | null
  publishing_task_id: string | null
  publishing_error: string | null
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
    health_score?: number
    meta_summary?: string
    highlights?: string[]
  }>
  issues: string[]
  snapshot: SnapshotParsed | null
  snapshot_raw: string | null
  _has_audits?: boolean
  _has_issues?: boolean
  _has_snapshot?: boolean
  _initialized?: boolean
}

export interface Plan {
  filename: string
  path: string
  week: string | null
  modified: string
  size: number
  status?: string
  summary?: string
  highlights?: string[]
  progress_percent?: number
  meta?: unknown
  // Fields from weekly .meta.json
  week_start?: string | null
  week_end?: string | null
  total_tasks?: number
  completed_tasks?: number
  pending_tasks?: number
  blocked_tasks?: number
  in_progress_tasks?: number
  focus_areas?: string[]
  gaps_addressed?: string[]
  priority_tasks?: string[]
  notes?: string | null
  last_heartbeat_at?: string | null
  // Fields from active-plan.json
  current_phase?: string
  current_week_label?: string
  current_week?: string
  total_weeks?: string | number
  priority_focus?: string
  success_metrics?: Record<string, PlanMetric>
  executive_summary?: string
  tasks?: PlanTask[]
  _source?: string
}

export interface PlanTask {
  title: string
  status: 'pending' | 'completed' | 'blocked' | 'in-progress'
  priority?: string
  owner?: string
  estimated_hours?: number
}

export interface ReviewHighlight {
  text: string
  plainText: string
  severity: 'critical' | 'warning' | 'passed'
}

export interface Review {
  filename: string
  title: string
  summary: string | null
  highlights?: ReviewHighlight[]
  size: number
  modified: string
  review_type?: string
  status?: string
  score?: number
  // Human decision fields
  human_decision?: string | null
  human_comment?: string | null
  human_reviewer?: string | null
  human_decision_at?: string | null
  humanReadableSummary?: HumanReadableSummary | null
}

export interface HumanReadableSummary {
  whatWasChecked: string
  whatPassed: string[]
  whatFailed: string[]
  nextAction: string
}

export interface ReviewMeta {
  review_type: string
  target_url?: string | null
  status: string
  score?: number | null
  issues_found: number
  issues_resolved: number
  reviewer?: string | null
  target_item?: string | null
  created_at: string
  updated_at: string
  highlights?: ReviewHighlight[]
  humanReadableSummary?: HumanReadableSummary | null
  human_decision?: string | null
  human_comment?: string | null
  human_reviewer?: string | null
  human_decision_at?: string | null
}

export interface UpdateReviewInput {
  human_decision?: 'approved' | 'rejected'
  human_comment?: string
  human_reviewer?: string
}

export interface AboutFile {
  filename: string
  path: string
  title: string
  summary: string | null
  highlights?: string[]
  size: number
  modified: string
  file_type: string
  // Full meta object fields (returned by backend)
  category?: string
  review_status?: string
  version?: number
  author?: string | null
  last_reviewed?: string | null
  linked_sheets?: string[]
  created_at?: string
  updated_at?: string
}

export interface AboutMeta {
  filename: string
  meta_path: string
  meta: Record<string, unknown>
  modified: string
  size: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  response: string
  company: string
  history: ChatMessage[]
}

// User Management Types
export interface User {
  id: string
  email: string
  name: string | null
  role: 'MASTER' | 'COMPANY_ADMIN' | 'EDITOR' | 'VIEWER'
  avatarUrl?: string | null
  createdAt?: string
  updatedAt?: string
  companies?: UserCompany[]
}

export interface UserCompany {
  userId: string
  companyId: string
  role: 'COMPANY_ADMIN' | 'EDITOR' | 'VIEWER'
  assignedAt: string
  assignedBy?: string | null
}

export interface CreateUserInput {
  email: string
  name?: string
  password: string
  role?: 'MASTER' | 'COMPANY_ADMIN' | 'EDITOR' | 'VIEWER'
}

export interface UpdateUserInput {
  name?: string
  avatarUrl?: string
  password?: string
}

export { ApiError }
