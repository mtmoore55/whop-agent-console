'use client'

import { useEffect } from 'react'

/**
 * The brief gets opened on phones at odd hours, so a render error must not be
 * the framework's stack-trace page. The most likely cause is stored state the
 * current build cannot read, so the escape hatch clears it.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#111'
  }, [])

  const clearAndReload = () => {
    try {
      window.localStorage.removeItem('whop-agent-console')
    } catch {
      /* private mode — the reload alone may still fix it */
    }
    window.location.reload()
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ground px-6">
      <div className="max-w-[52ch]">
        <h1 className="title text-[24px] leading-tight text-ink">
          Something in this console broke
        </h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-mute">
          Most likely it is demo state saved by an older build of this page. Clearing it
          starts the demo fresh and costs you nothing real — everything here is local.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={clearAndReload}
            className="h-8 rounded-lg bg-blue-9 px-3 text-[14px] font-medium text-white transition-colors hover:bg-[#1a5ce8]"
          >
            Reset demo data
          </button>
          <button
            onClick={reset}
            className="h-8 rounded-lg bg-gray-3 px-3 text-[14px] font-medium text-ink transition-colors hover:bg-gray-4"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
