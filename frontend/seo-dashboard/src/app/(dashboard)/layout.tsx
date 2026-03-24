import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ChatProvider } from '@/components/chat-provider'
import { DashboardShell } from '@/components/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <ChatProvider>
      <div className="min-h-screen bg-[#0A0A0B]">
        <DashboardShell>{children}</DashboardShell>
      </div>
    </ChatProvider>
  )
}
