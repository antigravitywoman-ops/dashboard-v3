'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-[#18181B] border border-[#EF4444]/30 rounded-2xl p-8 text-center shadow-[0_0_24px_rgba(239,68,68,0.1)]">
          {/* Error icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[rgba(239,68,68,0.12)] flex items-center justify-center mb-5">
            <svg className="h-7 w-7 text-[#EF4444]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-[#FAFAFA] mb-2">Something went wrong</h2>
          <p className="text-sm text-[#71717A] mb-6 leading-relaxed">
            {error.message || 'An unexpected error occurred. Your team has been notified.'}
          </p>

          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A78BFA] text-[#0A0A0B] font-semibold text-sm rounded-xl hover:bg-[#7C3AED] transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
