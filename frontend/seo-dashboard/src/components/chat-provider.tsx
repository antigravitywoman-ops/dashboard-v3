'use client'

import dynamic from 'next/dynamic'
import { ChatContextProvider } from './chat-context'

// Dynamic import to avoid SSR issues with chat widget
const ChatWidget = dynamic(() => import('./chat-widget').then(mod => ({ default: mod.ChatWidget })), {
  ssr: false,
  loading: () => null,
})

interface ChatProviderProps {
  children: React.ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  return (
    <ChatContextProvider>
      {children}
      <ChatWidget />
    </ChatContextProvider>
  )
}
