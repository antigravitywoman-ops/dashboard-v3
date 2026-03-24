'use client'

import { createContext, useContext, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { type Company } from '@/lib/api'

interface UserContextType {
  user: {
    id: string
    email: string
    name: string | null
    role: string
    sessionToken: string | null
    companies: string[] | null
  } | null
  isLoading: boolean
  isAuthenticated: boolean
  isMaster: boolean
  canManageUsers: boolean
  canAccessAllCompanies: boolean
  accessibleCompanies: string[] | null
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  const value = useMemo<UserContextType>(() => {
    const user = session?.user
    const role = (user as { role?: string })?.role
    const sessionToken = (user as { sessionToken?: string })?.sessionToken
    const companies = (user as { companies?: string[] })?.companies

    return {
      user: user ? {
        id: user.email || '',
        email: user.email || '',
        name: user.name || null,
        role: role || 'VIEWER',
        sessionToken: sessionToken ?? null,
        companies: companies ?? null,
      } : null,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      isMaster: role === 'MASTER',
      canManageUsers: role === 'MASTER' || role === 'COMPANY_ADMIN',
      canAccessAllCompanies: role === 'MASTER' || companies === null,
      accessibleCompanies: companies ?? null,
    }
  }, [session, status])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
