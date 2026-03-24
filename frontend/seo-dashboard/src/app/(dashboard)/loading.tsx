export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Spinning lightning bolt */}
        <div className="relative">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center shadow-[0_0_24px_rgba(167,139,250,0.3)] animate-pulse">
            <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#FAFAFA]">Loading...</p>
          <p className="text-xs text-[#71717A] mt-0.5">Preparing your dashboard</p>
        </div>
      </div>
    </div>
  )
}
