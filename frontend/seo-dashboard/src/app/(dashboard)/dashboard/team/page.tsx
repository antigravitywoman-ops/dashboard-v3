'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHero } from '@/components/ui/page-hero'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toaster'
import { useUser } from '@/context/user-context'
import { getUsers, createUser, deleteUser } from '@/lib/api'
import type { User } from '@/lib/api'
import { RoleSelectPopover } from '@/components/ui/role-select'
import { Plus, Trash2, Shield, UserCog, Eye, Mail, Settings } from 'lucide-react'

const ROLE_CONFIG: Record<string, { label: string; color: 'purple' | 'teal' | 'info' | 'warning'; icon: React.ElementType }> = {
  MASTER:        { label: 'Admin',   color: 'purple', icon: Shield },
  COMPANY_ADMIN: { label: 'Admin',   color: 'purple', icon: Shield },
  EDITOR:        { label: 'Editor', color: 'teal',   icon: UserCog },
  VIEWER:        { label: 'Viewer', color: 'info',   icon: Eye },
}

// ─── Invite User Modal ───────────────────────────────────────────────────────

function InviteUserModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'MASTER' | 'COMPANY_ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR')
  const { toast } = useToast()
  const generatePassword = () => Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2) + '!1'
  const [password] = useState(generatePassword)

  const { mutate, isPending } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast({ title: 'User invited successfully', variant: 'success' })
      onSuccess()
      onClose()
      setEmail('')
      setName('')
    },
    onError: () => toast({ title: 'Failed to invite user', variant: 'error' }),
  })

  const handleSubmit = () => {
    if (!email.trim()) return
    mutate({ email, name: name || undefined, password, role })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogHeader>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogDescription>
          Send an invitation to add a new user to your workspace.
        </DialogDescription>
      </DialogHeader>

      <div className="p-6 pt-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Email</label>
          <input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Name (optional)</label>
          <input
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">Role</label>
          <div className="flex gap-2">
            {(['COMPANY_ADMIN', 'EDITOR', 'VIEWER'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  role === r
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                }`}
              >
                {ROLE_CONFIG[r]?.label ?? r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="indigo"
          onClick={handleSubmit}
          isLoading={isPending}
          disabled={!email.trim()}
          className="gap-1.5"
        >
          <Mail className="h-4 w-4" />
          Send Invite
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  open,
  onClose,
  user,
  onConfirm,
  isDeleting,
}: {
  open: boolean
  onClose: () => void
  user: User | null
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogHeader>
        <DialogTitle className="text-[var(--status-error)]">Remove User</DialogTitle>
        <DialogDescription>
          Are you sure you want to remove <strong>{user?.name || user?.email}</strong>?
          They will lose access to this workspace immediately.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm} isLoading={isDeleting} className="gap-1">
          <Trash2 className="h-4 w-4" />
          Remove User
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onDelete,
  canManage,
}: {
  user: User
  onDelete: () => void
  canManage: boolean
}) {
  const roleCfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.VIEWER
  const RoleIcon = roleCfg.icon
  const initial = user.name?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-surface)] transition-colors">
      {/* Avatar */}
      <div className="h-10 w-10 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-white">{initial}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {user.name || '—'}
          </p>
          <Badge variant={roleCfg.color} size="sm" className="gap-1">
            <RoleIcon className="h-3 w-3" />
            {roleCfg.label}
          </Badge>
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
      </div>

      {/* Companies */}
      {user.companies && user.companies.length > 0 && (
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end max-w-[200px]">
          {user.companies.slice(0, 2).map(c => (
            <span key={c.companyId} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] truncate max-w-[100px]">
              {c.companyId}
            </span>
          ))}
          {user.companies.length > 2 && (
            <span className="text-[10px] text-[var(--text-disabled)]">+{user.companies.length - 2}</span>
          )}
        </div>
      )}

      {/* Actions */}
      {canManage && user.role !== 'MASTER' && (
        <div className="flex items-center gap-1 shrink-0">
          <RoleSelectPopover
            user={user}
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-[var(--text-muted)] hover:text-[var(--accent)]" title="Change role">
                <Settings className="h-4 w-4" />
              </Button>
            }
          />
          <Button variant="destructive-ghost" size="icon-sm" onClick={onDelete} title="Remove user">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { isMaster } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: isMaster,
  })

  const users: User[] = (usersData as any)?.users ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'User removed', variant: 'success' })
      setDeleteTarget(null)
    },
    onError: () => toast({ title: 'Failed to remove user', variant: 'error' }),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        name={undefined}
        subtitle={`${users.length} team member${users.length !== 1 ? 's' : ''} in your workspace`}
        actions={
          isMaster ? (
            <Button variant="indigo" size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" />
              Invite User
            </Button>
          ) : undefined
        }
      />

      {!isMaster ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="h-10 w-10 text-[var(--text-disabled)] mb-4" />
          <p className="text-sm text-[var(--text-muted)]">Access restricted</p>
          <p className="text-xs text-[var(--text-disabled)] mt-1">Only admins can manage team members</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-[var(--border)]">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-10 w-10 rounded-full" shimmer />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" shimmer />
                    <Skeleton className="h-2 w-48" shimmer />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserCog className="h-10 w-10 text-[var(--text-disabled)] mb-4" />
              <p className="text-sm text-[var(--text-muted)]">No team members yet</p>
              <Button variant="indigo" size="sm" className="mt-4 gap-1.5" onClick={() => setInviteOpen(true)}>
                <Plus className="h-4 w-4" />
                Invite first user
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {users.map((user, i) => (
                <div
                  key={user.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <UserRow
                    user={user}
                    canManage={isMaster}
                    onDelete={() => setDeleteTarget(user)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
