'use client'

import { createContext, useContext, useState } from 'react'

export interface ChatFileContext {
  path: string
  content: string
}

interface ChatContextValue {
  currentFile: ChatFileContext | null
  setCurrentFile: (f: ChatFileContext | null) => void
}

const ChatContext = createContext<ChatContextValue>({
  currentFile: null,
  setCurrentFile: () => {},
})

export function ChatContextProvider({ children }: { children: React.ReactNode }) {
  const [currentFile, setCurrentFile] = useState<ChatFileContext | null>(null)
  return (
    <ChatContext.Provider value={{ currentFile, setCurrentFile }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  return useContext(ChatContext)
}
