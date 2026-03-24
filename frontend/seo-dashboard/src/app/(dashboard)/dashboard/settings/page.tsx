'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCompany } from '@/context/company-context'
import { useUser } from '@/context/user-context'
import { PageHero } from '@/components/ui/page-hero'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toaster'
import { getEnvVars, updateEnvVars, getPlans, updatePlanMetrics, updateUser, resetCompanyData, deleteCompany, getScope, updateScope } from '@/lib/api'
import {
  KeyRound,
  Globe,
  BarChart3,
  Search,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Settings,
  User as UserIcon,
  Target,
  Trash2,
  Plus,
  TrendingUp,
} from 'lucide-react'

const CREDENTIAL_CATEGORIES = [
  { key: 'wordpress', label: 'WordPress',            icon: Globe,    color: 'purple' },
  { key: 'gsc',      label: 'Google Search Console', icon: Search,  color: 'teal'   },
  { key: 'ga4',      label: 'Google Analytics 4',    icon: BarChart3, color: 'info'   },
  { key: 'serper',   label: 'Serper (SERP API)',     icon: Search,  color: 'warning'},
]

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState(user?.name ?? '')
  const [password, setPassword] = useState('')

  // Sync name when user changes
  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; password?: string }) =>
      updateUser(user!.id, data),
    onSuccess: () => {
      toast({ title: 'Profile updated', variant: 'success' })
      setPassword('')
    },
    onError: () => toast({ title: 'Failed to update profile', variant: 'error' }),
  })

  const handleSave = () => {
    updateMutation.mutate({
      name: name || undefined,
      ...(password ? { password } : {}),
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{user?.name || 'Your Profile'}</h2>
          <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
          <Badge
            variant={user?.role === 'MASTER' ? 'indigo' : user?.role === 'COMPANY_ADMIN' ? 'teal' : 'info'}
            size="sm"
            className="mt-1"
          >
            {user?.role}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <SectionHeader title="Account Details" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Full Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Email</label>
            <Input defaultValue={user?.email ?? ''} disabled />
            <p className="text-[10px] text-[var(--text-disabled)] mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">
              New Password <span className="text-[var(--text-disabled)]">(optional)</span>
            </label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>
          <div className="pt-2">
            <Button
              variant="indigo"
              size="sm"
              onClick={handleSave}
              isLoading={updateMutation.isPending}
              disabled={!name.trim() && !password}
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Credentials Tab ──────────────────────────────────────────────────────────

function CredentialsTab() {
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: envData, isLoading } = useQuery({
    queryKey: ['envVars', currentCompany?.slug],
    queryFn: () => getEnvVars(currentCompany!.slug),
    enabled: !!currentCompany?.slug,
  })

  const envVars = (envData as { env?: Record<string, string>; error?: string })?.env ?? {}
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const updateMutation = useMutation({
    mutationFn: (vars: Record<string, string>) =>
      updateEnvVars(currentCompany!.slug, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envVars', currentCompany?.slug] })
      toast({ title: 'Credentials saved', variant: 'success' })
      setEditKey(null)
      setEditValue('')
    },
    onError: () => toast({ title: 'Failed to save credentials', variant: 'error' }),
  })

  const toggleReveal = (key: string) => {
    setRevealed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const startEdit = (key: string, currentValue: string) => {
    setEditKey(key)
    setEditValue(currentValue && currentValue !== '********' ? currentValue : '')
  }

  const cancelEdit = () => {
    setEditKey(null)
    setEditValue('')
  }

  const saveEdit = () => {
    if (!editKey) return
    updateMutation.mutate({ [editKey]: editValue })
  }

  // Check which integrations are connected
  const connectedMap: Record<string, boolean> = {
    WP_APP_PASSWORD:   !!(envVars.WP_APP_PASSWORD && envVars.WP_APP_PASSWORD !== '********' && envVars.WP_APP_PASSWORD.length > 0),
    GA4_MEASUREMENT_ID:!!(envVars.GA4_MEASUREMENT_ID && envVars.GA4_MEASUREMENT_ID !== '********' && envVars.GA4_MEASUREMENT_ID.length > 0),
    GSC_PROPERTY_URL:  !!(envVars.GSC_PROPERTY_URL && envVars.GSC_PROPERTY_URL !== '********' && envVars.GSC_PROPERTY_URL.length > 0),
    SERPER_API_KEY:    !!(envVars.SERPER_API_KEY && envVars.SERPER_API_KEY !== '********' && envVars.SERPER_API_KEY.length > 0),
  }

  const credentials = [
    {
      key: 'wordpress',
      label: 'WordPress',
      icon: Globe,
      color: 'purple',
      envKey: 'WP_APP_PASSWORD',
      envUrl: 'WP_SITE_URL',
      desc: 'Used to publish content directly to your WordPress site',
      isConnected: connectedMap.WP_APP_PASSWORD,
      value: envVars.WP_APP_PASSWORD,
    },
    {
      key: 'gsc',
      label: 'Google Search Console',
      icon: Search,
      color: 'teal',
      envKey: 'GSC_PROPERTY_URL',
      envUrl: null,
      desc: 'Tracks search performance, clicks, and impressions',
      isConnected: connectedMap.GSC_PROPERTY_URL,
      value: envVars.GSC_PROPERTY_URL,
    },
    {
      key: 'ga4',
      label: 'Google Analytics 4',
      icon: BarChart3,
      color: 'info',
      envKey: 'GA4_MEASUREMENT_ID',
      envUrl: null,
      desc: 'Tracks website traffic and user behavior',
      isConnected: connectedMap.GA4_MEASUREMENT_ID,
      value: envVars.GA4_MEASUREMENT_ID,
    },
    {
      key: 'serper',
      label: 'Serper (SERP API)',
      icon: Search,
      color: 'warning',
      envKey: 'SERPER_API_KEY',
      envUrl: null,
      desc: 'Provides keyword ranking and SERP data',
      isConnected: connectedMap.SERPER_API_KEY,
      value: envVars.SERPER_API_KEY,
    },
  ]

  const colorMap: Record<string, string> = {
    purple:  'text-[var(--accent)] bg-[var(--accent-subtle)]',
    teal:    'text-[var(--accent-teal)] bg-[var(--accent-teal-subtle)]',
    info:    'text-[var(--status-info)] bg-[var(--status-info-bg)]',
    warning: 'text-[var(--status-warning)] bg-[var(--status-warning-bg)]',
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        title="Connected Integrations"
        description="API credentials for your SEO tools and platforms"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" shimmer />)}
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map(cred => (
            <div key={cred.key} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:border-[var(--border-strong)] transition-colors">
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Icon */}
                <div className={`p-2.5 rounded-xl shrink-0 ${colorMap[cred.color]}`}>
                  <cred.icon className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{cred.label}</p>
                    {cred.isConnected ? (
                      <Badge variant="success" size="sm" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="error" size="sm" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{cred.desc}</p>

                  {/* Value display / edit */}
                  {editKey === cred.envKey ? (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder={`Enter ${cred.label} ${cred.envKey.includes('URL') ? 'URL' : 'API key'}`}
                        className="flex-1"
                        autoFocus
                      />
                      <Button variant="indigo" size="sm" onClick={saveEdit} isLoading={updateMutation.isPending}>
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    cred.value && cred.value !== '********' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-1 rounded border border-[var(--border)] truncate max-w-[300px]">
                          {revealed[cred.envKey] ? cred.value : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => toggleReveal(cred.envKey)}
                          className="text-[var(--text-disabled)] hover:text-[var(--text-muted)] transition-colors"
                        >
                          {revealed[cred.envKey] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!cred.isConnected ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                      onClick={() => startEdit(cred.envKey, cred.value ?? '')}
                    >
                      Configure →
                    </Button>
                  ) : editKey === cred.envKey ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => startEdit(cred.envKey, cred.value ?? '')}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Plan Tab ─────────────────────────────────────────────────────────────────

function PlanTab() {
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['plans', currentCompany?.slug],
    queryFn: () => getPlans(currentCompany!.slug),
    enabled: !!currentCompany?.slug,
    staleTime: 30 * 1000,
  })

  const activePlan = plansData?.active_plan
  const successMetrics = activePlan?.success_metrics ?? {}

  const [localMetrics, setLocalMetrics] = useState<Record<string, { target: string; current: string; done?: boolean }>>({})

  // Sync when metrics load (always sync — including when metrics are cleared)
  useEffect(() => {
    setLocalMetrics(successMetrics)
  }, [Object.keys(successMetrics).join(',')])

  const metricsMutation = useMutation({
    mutationFn: (metrics: Record<string, { target: string; current: string; done?: boolean }>) =>
      updatePlanMetrics(currentCompany!.slug, metrics),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', currentCompany?.slug] })
      toast({ title: 'Metrics updated', variant: 'success' })
    },
    onError: () => toast({ title: 'Failed to update metrics', variant: 'error' }),
  })

  const handleToggle = (key: string) => {
    const current = localMetrics[key]
    if (!current) return
    const updated = { ...localMetrics, [key]: { ...current, done: !current.done } }
    setLocalMetrics(updated)
    metricsMutation.mutate(updated)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-40 rounded-xl" shimmer />
        <Skeleton className="h-60 rounded-xl" shimmer />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Phase info */}
      {activePlan && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <SectionHeader
            title="Current Plan"
            description={activePlan.executive_summary ?? 'Active SEO plan'}
          />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Phase',       value: activePlan.current_phase ?? 'Foundation' },
              { label: 'Week',        value: activePlan.current_week_label ?? 'Week 1' },
              { label: 'Tasks',       value: `${activePlan.total_tasks ?? 0} total` },
              { label: 'Progress',    value: `${activePlan.progress_percent ?? 0}%` },
            ].map(item => (
              <div key={item.label} className="text-center p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
              </div>
            ))}
          </div>
          {activePlan.focus_areas && activePlan.focus_areas.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-[var(--text-disabled)] mb-2">Focus Areas</p>
              <div className="flex flex-wrap gap-2">
                {activePlan.focus_areas.map((area, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-border)]">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Metrics */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <SectionHeader
          title="Success Metrics"
          description="Track your weekly goals"
        />
        <div className="mt-4 space-y-2">
          {Object.entries(localMetrics).length === 0 ? (
            <p className="text-sm text-[var(--text-disabled)] text-center py-6">No success metrics configured yet</p>
          ) : (
            Object.entries(localMetrics).map(([key, metric]) => {
              const isDone = metric.done ?? false
              return (
                <div
                  key={key}
                  onClick={() => handleToggle(key)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                >
                  <div className={isDone ? 'text-[var(--status-success)]' : 'text-[var(--text-disabled)]'}>
                    {isDone
                      ? <CheckCircle2 className="h-5 w-5" />
                      : <div className="h-5 w-5 rounded-full border-2 border-[var(--text-disabled)]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={isDone ? 'text-sm text-[var(--status-success)] line-through opacity-70' : 'text-sm text-[var(--text-secondary)]'}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    {metric.current && metric.target && metric.target !== '—' && (
                      <p className="text-xs text-[var(--text-disabled)] mt-0.5">{metric.current} / {metric.target}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Scope Tab ───────────────────────────────────────────────────────────────

function ScopeTab({ onHasChanges }: { onHasChanges?: (v: boolean) => void }) {
  const { currentCompany } = useCompany()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Load existing scope from API
  const { data: scopeData } = useQuery({
    queryKey: ['companyScope', currentCompany?.slug],
    queryFn: () => getScope(currentCompany!.slug),
    enabled: !!currentCompany?.slug,
  })

  // Initialize state directly from scope data (or company fallback for industry)
  const initialScope = scopeData?.scope as Record<string, unknown> | undefined
  const [websiteUrl, setWebsiteUrl] = useState<string>(() => initialScope ? String(initialScope.website_url ?? '') : '')
  const [industry, setIndustry] = useState<string>(() => initialScope ? String(initialScope.industry ?? '') : (currentCompany?.industry ?? ''))
  const [primaryKeywords, setPrimaryKeywords] = useState<string>(() =>
    initialScope?.primary_keywords && Array.isArray(initialScope.primary_keywords)
      ? (initialScope.primary_keywords as string[]).join(', ')
      : ''
  )
  const [geographicScope, setGeographicScope] = useState(() => initialScope ? String(initialScope.geographic_scope ?? 'national') : 'national')
  const [targetAudience, setTargetAudience] = useState<string>(() => initialScope ? String(initialScope.target_audience ?? '') : '')

  // Capture initial values for hasChanges comparison
  const initialValues = useRef({ websiteUrl: '', industry: '', primaryKeywords: '', geographicScope: 'national', targetAudience: '' })
  useEffect(() => {
    if (scopeData?.scope) {
      const s = scopeData.scope as Record<string, unknown>
      initialValues.current = {
        websiteUrl: s.website_url ? String(s.website_url) : '',
        industry: s.industry ? String(s.industry) : (currentCompany?.industry ?? ''),
        primaryKeywords: s.primary_keywords && Array.isArray(s.primary_keywords) ? (s.primary_keywords as string[]).join(', ') : '',
        geographicScope: s.geographic_scope ? String(s.geographic_scope) : 'national',
        targetAudience: s.target_audience ? String(s.target_audience) : '',
      }
    }
  }, [scopeData, currentCompany])

  // Compute hasChanges whenever form state changes
  useEffect(() => {
    const hasChanges =
      websiteUrl !== initialValues.current.websiteUrl ||
      industry !== initialValues.current.industry ||
      primaryKeywords !== initialValues.current.primaryKeywords ||
      geographicScope !== initialValues.current.geographicScope ||
      targetAudience !== initialValues.current.targetAudience
    onHasChanges?.(hasChanges)
  }, [websiteUrl, industry, primaryKeywords, geographicScope, targetAudience, onHasChanges])

  // Sync state from scope API when data arrives (prevents stale initial values)
  useEffect(() => {
    if (scopeData?.scope) {
      const s = scopeData.scope as Record<string, unknown>
      if (s.website_url) setWebsiteUrl(String(s.website_url))
      if (s.industry) setIndustry(String(s.industry))
      if (s.primary_keywords && Array.isArray(s.primary_keywords)) {
        setPrimaryKeywords((s.primary_keywords as string[]).join(', '))
      }
      if (s.geographic_scope) setGeographicScope(String(s.geographic_scope))
      if (s.target_audience) setTargetAudience(String(s.target_audience))
    }
  }, [scopeData])

  const [saveLoading, setSaveLoading] = useState(false)

  const handleSave = async () => {
    if (!currentCompany) return
    setSaveLoading(true)
    try {
      const scope = {
        website_url: websiteUrl,
        industry,
        primary_keywords: primaryKeywords.split(',').map(k => k.trim()).filter(Boolean),
        geographic_scope: geographicScope,
        target_audience: targetAudience,
      }
      await updateScope(currentCompany.slug, scope)
      toast({ title: 'Scope saved', variant: 'success' })
    } catch {
      toast({ title: 'Failed to save scope', variant: 'error' })
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <SectionHeader
          title="Website & Industry"
          description="Tell the AI about your website and industry for better recommendations"
        />
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Website URL</label>
            <Input
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Industry / Niche</label>
            <Input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g., SaaS, E-commerce, Healthcare"
            />
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <SectionHeader
          title="Geographic Scope"
          description="Define your target geographic market"
        />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { value: 'local', label: 'Local', desc: 'City or region' },
            { value: 'national', label: 'National', desc: 'Country-wide' },
            { value: 'international', label: 'International', desc: 'Global reach' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setGeographicScope(opt.value)}
              className={`p-3 rounded-xl text-center border transition-all ${
                geographicScope === opt.value
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
              }`}
            >
              <p className={`text-sm font-medium ${geographicScope === opt.value ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                {opt.label}
              </p>
              <p className="text-[10px] text-[var(--text-disabled)] mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <SectionHeader
          title="Primary Keywords"
          description="Comma-separated list of your most important SEO keywords"
        />
        <div className="mt-4">
          <Textarea
            value={primaryKeywords}
            onChange={e => setPrimaryKeywords(e.target.value)}
            placeholder="e.g., SEO tools, content marketing, digital marketing agency"
            className="min-h-[80px]"
          />
          <p className="text-[10px] text-[var(--text-disabled)] mt-1.5">Separate keywords with commas</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <SectionHeader
          title="Target Audience"
          description="Brief description of your ideal customer or reader"
        />
        <div className="mt-4">
          <Textarea
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            placeholder="e.g., Marketing managers at B2B SaaS companies with 10-200 employees"
            className="min-h-[80px]"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="indigo" size="sm" onClick={handleSave} isLoading={saveLoading}>
          Save Scope
        </Button>
      </div>
    </div>
  )
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const { currentCompany } = useCompany()
  const { user } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const canManage = user?.role === 'COMPANY_ADMIN' || user?.role === 'MASTER'
  if (!canManage) {
    return (
      <div className="bg-[var(--status-error-bg)] border border-[var(--status-error-border)] rounded-xl p-5 text-center">
        <p className="text-sm text-[var(--text-muted)]">Only Admins can access company danger zone settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-[var(--status-error-bg)] border border-[var(--status-error-border)] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--status-error-bg)] shrink-0">
            <AlertTriangle className="h-5 w-5 text-[var(--status-error)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[var(--status-error)] mb-1">Danger Zone</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              These actions are irreversible. Proceed with caution.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Reset company data</p>
                  <p className="text-xs text-[var(--text-muted)]">Clear all task history and content drafts</p>
                </div>
                <Button variant="destructive-outline" size="sm" onClick={() => setShowResetConfirm(true)}>
                  Reset Data
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Delete company</p>
                  <p className="text-xs text-[var(--text-muted)]">Permanently remove this company and all data</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogHeader>
          <DialogTitle className="text-[var(--status-error)]">Reset Company Data</DialogTitle>
          <DialogDescription>
            This will clear all task history, content drafts, and queue data for <strong>{currentCompany?.name}</strong>.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-4 space-y-3">
          <p className="text-sm text-[var(--text-muted)]">Type <strong className="text-[var(--text-primary)]">RESET</strong> to confirm:</p>
          <Input
            value={resetConfirmText}
            onChange={e => setResetConfirmText(e.target.value)}
            placeholder="RESET"
            className="border-[var(--status-error-border)] focus:border-[var(--status-error)]"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setShowResetConfirm(false); setResetConfirmText('') }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={resetConfirmText !== 'RESET'}
            isLoading={false}
            onClick={async () => {
              try {
                await resetCompanyData(currentCompany!.slug)
                queryClient.invalidateQueries()
                toast({ title: 'Data reset', variant: 'success', description: 'All task history and drafts have been cleared.' })
              } catch {
                toast({ title: 'Reset failed', variant: 'error' })
              }
              setShowResetConfirm(false)
              setResetConfirmText('')
            }}
          >
            <Trash2 className="h-4 w-4" />
            Reset Data
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogHeader>
          <DialogTitle className="text-[var(--status-error)]">Delete Company</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{currentCompany?.name}</strong> and all its data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-4 space-y-3">
          <p className="text-sm text-[var(--text-muted)]">Type <strong className="text-[var(--text-primary)]">DELETE</strong> to confirm:</p>
          <Input
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            className="border-[var(--status-error-border)] focus:border-[var(--status-error)]"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteConfirmText !== 'DELETE'}
            isLoading={false}
            onClick={async () => {
              try {
                await deleteCompany(currentCompany!.slug)
                toast({ title: 'Company deleted', variant: 'success', description: 'Redirecting...' })
                window.location.href = '/dashboard'
              } catch {
                toast({ title: 'Delete failed', variant: 'error' })
              }
              setShowDeleteConfirm(false)
              setDeleteConfirmText('')
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete Permanently
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { currentCompany } = useCompany()
  const [activeTab, setActiveTab] = useState('profile')
  const [hasScopeChanges, setHasScopeChanges] = useState(false)

  const handleTabChange = (tab: string) => {
    if (activeTab === 'scope' && hasScopeChanges) {
      if (!window.confirm('You have unsaved scope changes. Leave without saving?')) return
    }
    setActiveTab(tab)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        name={undefined}
        subtitle={currentCompany ? `Settings for ${currentCompany.name}` : 'Workspace settings'}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="default">
          <TabsTrigger value="profile" className="gap-1.5">
            <UserIcon className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="credentials" className="gap-1.5">
            <KeyRound className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="scope" className="gap-1.5">
            <Target className="h-4 w-4" />
            Scope
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Plan
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-1.5">
            <AlertTriangle className="h-4 w-4 text-[var(--status-error)]" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="credentials" className="mt-0">
          <CredentialsTab />
        </TabsContent>

        <TabsContent value="scope" className="mt-0">
          <ScopeTab onHasChanges={setHasScopeChanges} />
        </TabsContent>

        <TabsContent value="plan" className="mt-0">
          <PlanTab />
        </TabsContent>

        <TabsContent value="danger" className="mt-0">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  )
}
