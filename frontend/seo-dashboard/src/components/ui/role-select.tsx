'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toaster'
import { updateUser } from '@/lib/api'
import type { User } from '@/lib/api'
import { Shield, UserCog, Eye } from 'lucide-react'

const ROLES = [
  {
    value: 'COMPANY_ADMIN',
    label: 'Admin',
    color: 'purple',
    icon: Shield,
    desc: 'Full access to manage company settings, users, and content',
  },
  {
    value: 'EDITOR',
    label: 'Editor',
    color: 'teal',
    icon: UserCog,
    desc: 'Can manage content, approve drafts, and configure integrations',
  },
  {
    value: 'VIEWER',
    label: 'Viewer',
    color: 'info',
    icon: Eye,
    desc: 'Read-only access to dashboard and reports',
  },
]

export function RoleSelectPopover({
  user,
  trigger,
}: {
  user: User
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [updateRole, setUpdateRole] = useState<string>(user.role)

  const updateMutation = useMutation({
    mutationFn: (role: string) => updateUser(user.id, { role } as any),
    onSuccess: (_data, role) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Role updated', variant: 'success', description: `${user.name || user.email} is now a ${ROLES.find(r => r.value === role)?.label}.` })
      setOpen(false)
    },
    onError: () => toast({ title: 'Failed to update role', variant: 'error' }),
  })

  const currentRole = ROLES.find(r => r.value === user.role)
  const NewRole = ROLES.find(r => r.value === updateRole)

  return (
    <>
      <button onClick={() => setOpen(true)}>{trigger}</button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogClose onClose={() => setOpen(false)} />
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Update the role for {user.name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4 space-y-2">
          {ROLES.map(role => {
            const RoleIcon = role.icon
            const isSelected = updateRole === role.value
            const isCurrent = user.role === role.value

            return (
              <button
                key={role.value}
                onClick={() => setUpdateRole(role.value)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'border-[#A78BFA] bg-[rgba(167,139,250,0.08)]'
                    : 'border-[#27272A] bg-[#111113] hover:border-[#3F3F46]'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  role.color === 'purple' ? 'bg-[rgba(167,139,250,0.12)] text-[#A78BFA]' :
                  role.color === 'teal' ? 'bg-[rgba(45,212,191,0.12)] text-[#2DD4BF]' :
                  'bg-[rgba(59,130,246,0.12)] text-[#3B82F6]'
                }`}>
                  <RoleIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isSelected ? 'text-[#FAFAFA]' : 'text-[#A1A1AA]'}`}>
                      {role.label}
                    </p>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222225] text-[#52525B]">Current</span>
                    )}
                    {isSelected && (
                      <div className="ml-auto w-4 h-4 rounded-full border-2 border-[#A78BFA] bg-[rgba(167,139,250,0.2)] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#52525B] mt-0.5 leading-relaxed">{role.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="purple"
            onClick={() => updateMutation.mutate(updateRole)}
            isLoading={updateMutation.isPending}
            disabled={updateRole === user.role}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
