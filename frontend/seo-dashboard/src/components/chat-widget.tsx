'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { streamChatMessage, sendChatMessage, getChatHistory, clearChatHistory, type ChatMessage } from '@/lib/api'
import { useCompany } from '@/context/company-context'
import { useChatContext } from './chat-context'
import { useToast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import { X, Trash2, Send, MessageSquare } from 'lucide-react'

interface ChatWidgetProps {
  currentFile?: {
    path: string
    content: string
  }
}

export function ChatWidget({ currentFile: propFile }: ChatWidgetProps) {
  const { currentFile: contextFile } = useChatContext()
  const currentFile = contextFile ?? propFile ?? undefined
  const { currentCompany } = useCompany()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { toast } = useToast()

  // Dynamic suggestions based on current route
  const getSuggestions = () => {
    if (pathname?.includes('/tasks')) {
      return ['What tasks are blocked?', 'Any high priority tasks?', 'Summarize my task queue']
    }
    if (pathname?.includes('/content')) {
      return ['What content is in review?', 'Show published content', 'Content pipeline status']
    }
    if (pathname?.includes('/reports')) {
      return ['SEO recommendations for this week', 'What technical issues exist?', 'Keyword performance summary']
    }
    if (pathname?.includes('/analytics')) {
      return ['Traffic trends this month', 'Top performing pages', 'Keyword ranking changes']
    }
    return ['What tasks are running?', 'Show recent content', 'SEO recommendations']
  }

  // Fetch chat history when company changes
  const { data: historyData } = useQuery({
    queryKey: ['chat-history', currentCompany?.slug],
    queryFn: () => getChatHistory(currentCompany!.slug),
    enabled: !!currentCompany?.slug,
  })

  useEffect(() => {
    if (historyData?.history) {
      setMessages(historyData.history)
    }
  }, [historyData])

  const clearMutation = useMutation({
    mutationFn: () => clearChatHistory(currentCompany!.slug),
    onSuccess: () => {
      setMessages([])
      queryClient.invalidateQueries({ queryKey: ['chat-history', currentCompany?.slug] })
    },
  })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Handle streaming chat
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentCompany || isStreaming) return

    const userMessage = input.trim()
    setInput('')
    setIsStreaming(true)
    setStreamingContent('')

    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      let fullResponse = ''
      let useFallback = false

      for await (const event of streamChatMessage(
        currentCompany.slug,
        userMessage,
        currentFile?.path,
        currentFile?.content
      )) {
        if (event.type === 'fallback') { useFallback = true; break }
        if (event.type === 'chunk' && event.content) {
          fullResponse += event.content
          setStreamingContent(fullResponse)
        } else if (event.type === 'done' && event.content) {
          fullResponse = event.content
          setStreamingContent(fullResponse)
        } else if (event.type === 'error') {
          toast({ title: 'Chat error', description: 'Streaming interrupted. Try again.', variant: 'error' })
        }
      }

      if (useFallback) {
        try {
          const result = await sendChatMessage(
            currentCompany.slug, userMessage, currentFile?.path, currentFile?.content
          )
          fullResponse = result.response
          setStreamingContent(fullResponse)
        } catch {
          fullResponse = 'Sorry, I encountered an error. Please try again.'
          setStreamingContent(fullResponse)
        }
      }

      if (fullResponse) {
        setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }])
      }
      queryClient.invalidateQueries({ queryKey: ['chat-history', currentCompany?.slug] })
    } catch {
      toast({ title: 'Chat error', description: 'Failed to get response. Try again.', variant: 'error' })
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
    }
  }

  if (!currentCompany) return null

  const companyName = currentCompany.name?.split(' ')[0] || currentCompany.slug

  return (
    <>
      {/* Floating Button — clean indigo, no gradient/glow */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-[var(--accent)] text-white shadow-md',
          'transition-all duration-200 hover:scale-110 hover:shadow-lg',
          'active:scale-95',
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        )}
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden',
          'w-[380px] h-[560px]',
          'bg-[var(--bg-card)] border border-[var(--border)]',
          'shadow-2xl shadow-black/40',
          'transition-all duration-300',
          isOpen
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            {/* Indigo avatar */}
            <div className="h-8 w-8 rounded-xl bg-[var(--accent)] flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{companyName} Assistant</p>
              <p className="text-[10px] text-[var(--text-disabled)]">AI-powered SEO help</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => clearMutation.mutate()}
              className="p-1.5 rounded-lg text-[var(--text-disabled)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-[var(--text-disabled)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Current file context */}
        {currentFile && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)]">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[10px] font-mono text-[var(--text-disabled)] truncate">{currentFile.path}</span>
          </div>
        )}

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent)]/15 flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-[var(--accent)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Hi, I&apos;m {companyName} Assistant</p>
              <p className="text-xs text-[var(--text-disabled)] leading-relaxed">
                Ask me anything about SEO tasks, content strategy, technical audits, or your workspace.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                {getSuggestions().map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-white rounded-br-md'
                        : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] rounded-bl-md'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="text-sm leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ inline: _inline, className, children, ...props }: any) {
                              // react-markdown v9 removed `inline` from types; cast to any for runtime access
                              const isInline = _inline as boolean | undefined
                              return isInline ? (
                                <code
                                  className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--accent)] font-mono text-xs"
                                  {...props}
                                >
                                  {children}
                                </code>
                              ) : (
                                <pre className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] overflow-x-auto mt-2">
                                  <code className="font-mono text-xs text-[var(--text-secondary)]" {...props}>
                                    {children}
                                  </code>
                                </pre>
                              )
                            },
                            a({ href, children }) {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--accent)] underline"
                                >
                                  {children}
                                </a>
                              )
                            },
                            p({ children }) { return <p className="mb-2 last:mb-0">{children}</p> },
                            ul({ children }) { return <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul> },
                            ol({ children }) { return <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol> },
                            strong({ children }) { return <strong className="font-semibold text-[var(--text-primary)]">{children}</strong> },
                            h1({ children }) { return <h1 className="text-base font-bold text-[var(--text-primary)] mb-2">{children}</h1> },
                            h2({ children }) { return <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1.5">{children}</h2> },
                            h3({ children }) { return <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-1">{children}</h3> },
                            blockquote({ children }) {
                              return (
                                <blockquote className="border-l-2 border-[var(--accent)] pl-3 my-2 text-[var(--text-muted)] italic">
                                  {children}
                                </blockquote>
                              )
                            },
                            table({ children }) {
                              return (
                                <div className="overflow-x-auto my-2">
                                  <table className="text-xs border border-[var(--border)] rounded-lg w-full">{children}</table>
                                </div>
                              )
                            },
                            th({ children }) { return <th className="px-2 py-1 bg-[var(--bg-surface)] border-b border-[var(--border)] text-[var(--text-muted)] font-medium">{children}</th> },
                            td({ children }) { return <td className="px-2 py-1 border-t border-[var(--border)] text-[var(--text-secondary)]">{children}</td> },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[var(--bg-elevated)] border border-[var(--border)] px-4 py-3">
                    {streamingContent ? (
                      <div className="text-sm leading-relaxed text-[var(--text-secondary)]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ inline: _inline, className, children, ...props }: any) {
                              // react-markdown v9 removed `inline` from types; cast to any for runtime access
                              const isInline = _inline as boolean | undefined
                              return isInline ? (
                                <code
                                  className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--accent)] font-mono text-xs"
                                  {...props}
                                >
                                  {children}
                                </code>
                              ) : (
                                <pre className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] overflow-x-auto mt-2">
                                  <code className="font-mono text-xs text-[var(--text-secondary)]" {...props}>
                                    {children}
                                  </code>
                                </pre>
                              )
                            },
                            a({ href, children }) {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--accent)] underline"
                                >
                                  {children}
                                </a>
                              )
                            },
                            p({ children }) { return <p className="mb-2 last:mb-0">{children}</p> },
                            ul({ children }) { return <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul> },
                            ol({ children }) { return <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol> },
                            strong({ children }) { return <strong className="font-semibold text-[var(--text-primary)]">{children}</strong> },
                          }}
                        >
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-4 bg-[var(--bg-card)]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about SEO, tasks, content..."
              className={cn(
                'flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]',
                'px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)]',
                'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30',
                'transition-all duration-150',
                'disabled:opacity-50'
              )}
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
                'bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-95',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
