'use client'

import { useState } from 'react'
import { useConsole } from '@/lib/store'
import { shortDate } from '@/lib/format'
import { WhopMark } from './WhopMark'
import { Btn } from './ui'

/** Mirrors the dashboard's 56px header: mark on the left, actions on the right. */
export function TopBar() {
  const { state, brief, reset } = useConsole()
  const [confirming, setConfirming] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <WhopMark className="h-[21px] w-auto shrink-0 text-ink" />
          <span className="h-4 w-px shrink-0 bg-line" />
          <span className="truncate text-[14px] font-medium text-ink">{state.business.name}</span>
          <span className="hidden truncate text-[14px] text-faint sm:inline">
            Agent brief · {shortDate(brief.generatedAtISO)}
          </span>
        </div>

        {confirming ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden text-[13px] text-mute sm:inline">Wipe all decisions?</span>
            <Btn
              variant="danger"
              onClick={() => {
                reset()
                setConfirming(false)
              }}
            >
              Reset
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirming(false)}>
              Keep
            </Btn>
          </div>
        ) : (
          <Btn variant="ghost" className="shrink-0" onClick={() => setConfirming(true)}>
            Reset demo
          </Btn>
        )}
      </div>
    </header>
  )
}
