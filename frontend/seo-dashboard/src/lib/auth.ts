import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const VM_API_URL = process.env.NEXT_PUBLIC_VM_API_URL || 'http://localhost:3456'
const VM_API_KEY = process.env.NEXT_PUBLIC_VM_API_KEY || ''

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Call VM API for authentication
          const response = await fetch(`${VM_API_URL}/api/auth/signin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': VM_API_KEY,
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Authentication failed' }))
            console.error('Auth error:', error.error)
            return null
          }

          const data = await response.json()

          // Return user data from API response
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            sessionToken: data.session.token,
            companies: data.companies,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.sessionToken = (user as { sessionToken?: string }).sessionToken
        token.companies = (user as { companies?: string[] }).companies
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string
        (session.user as { sessionToken?: string }).sessionToken = token.sessionToken as string
        (session.user as { companies?: string[] }).companies = token.companies as string[]
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    maxAge: 5 * 60, // 5 minutes
  },
  secret: process.env.NEXTAUTH_SECRET,
}
