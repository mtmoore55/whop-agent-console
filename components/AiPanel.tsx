'use client'

import { useEffect, useRef, useState } from 'react'
import { useConsole } from '@/lib/store'
import { useAiChat } from './AiChat'
import { Icon } from './icons'

/** Whop's own starters, minus the ones that only make sense on their dashboard. */
const SUGGESTIONS = [
  'Forecast the next 30 days of revenue',
  'What is actually blocking the goal?',
  'Which proposal should I approve first?',
  'Why is churn up?',
]

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-gray-3 hover:text-ink"
    >
      {children}
    </button>
  )
}

/**
 * The assistant panel, matched to the dashboard's: 400px, a 20px/600 title,
 * 12px-radius suggestion rows, and a 56px composer pinned to the bottom.
 */
export function AiPanel() {
  const { open, messages, busy, close, send, reset } = useAiChat()
  const { state } = useConsole()
  const [draft, setDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  if (!open) return null

  const submit = () => {
    if (!draft.trim() || busy) return
    send(draft)
    setDraft('')
  }

  return (
    <>
      {/* Below lg the panel covers the page rather than squeezing it. */}
      <div
        onClick={close}
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        aria-hidden
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-line bg-ground lg:sticky lg:top-14 lg:z-20 lg:h-[calc(100dvh-3.5rem)] lg:w-[400px] lg:max-w-none lg:shrink-0">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
          <h2 className="text-[20px] font-semibold leading-7 tracking-[-0.025em] text-ink">
            {messages.length ? state.business.name : 'New chat'}
          </h2>
          <div className="flex items-center gap-0.5">
            <IconBtn onClick={reset} label="New chat">
              <Icon name="brief" className="size-4" />
            </IconBtn>
            <IconBtn onClick={close} label="Close">
              <span className="text-[18px] leading-none">×</span>
            </IconBtn>
          </div>
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col justify-center">
              <div className="mb-3 flex items-center justify-center gap-1.5 text-faint">
                <Icon name="sparkle" className="size-3.5" />
                <span className="text-[13px]">Click a suggestion to send</span>
              </div>
              <div className="space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left text-[14px] font-medium text-ink transition-colors hover:border-gray-6 hover:bg-raise"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-xl rounded-br-sm bg-gray-3 px-3.5 py-2.5 text-[14px] leading-[1.55] text-ink">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-brand-text">
                      <Icon name="sparkle" className="size-4" />
                    </span>
                    <div className="min-w-0 whitespace-pre-wrap text-[14px] leading-[1.6] text-ink/90">
                      {m.content ||
                        (busy && i === messages.length - 1 ? (
                          <span className="text-faint">Reading the business…</span>
                        ) : null)}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-line px-2 py-2">
          <div className="flex items-center gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Type what you want done..."
              className="h-10 min-w-0 flex-1 rounded-lg bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-faint"
            />
            <button
              onClick={submit}
              disabled={!draft.trim() || busy}
              aria-label="Send"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-9 text-white transition-colors hover:bg-[#1a5ce8] disabled:bg-gray-3 disabled:text-faint"
            >
              <span className="text-[15px] leading-none">↑</span>
            </button>
          </div>
          <p className="px-3 pb-0.5 pt-1.5 text-[11.5px] leading-snug text-faint">
            Advice only. Anything with consequences goes through the brief.
          </p>
        </div>
      </aside>
    </>
  )
}
