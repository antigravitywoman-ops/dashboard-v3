'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { CompanyProvider } from '@/context/company-context'
import { UserProvider } from '@/context/user-context'
import { SessionSync } from '@/components/session-sync'
import { ToasterProvider } from '@/components/ui/toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <ToasterProvider>
      <SessionProvider basePath="/api/auth">
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <CompanyProvider>
              <SessionSync />
              {children}
            </CompanyProvider>
          </UserProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ToasterProvider>
  )
}
