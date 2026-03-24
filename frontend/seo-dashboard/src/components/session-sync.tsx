'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function SessionSync() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Store session token in localStorage for API calls
      const sessionToken = (session.user as { sessionToken?: string })?.sessionToken
      if (sessionToken) {
        localStorage.setItem('next-auth.session-token', sessionToken)
      }
    } else if (status === 'unauthenticated') {
      // Remove session token on logout
      localStorage.removeItem('next-auth.session-token')
    }
  }, [session, status])

  return null
}
