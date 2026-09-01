'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useConsole } from '@/lib/store'
import { Icon } from './icons'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AiChatApi {
  open: boolean
  messages: Message[]
  busy: boolean
  /** Open the panel. A seed is sent immediately — the sparkle is a question, not a launcher. */
  openWith: (seed?: string) => void
  close: () => void
  send: (text: string) => void
  reset: () => void
}

const Ctx = createContext<AiChatApi | null>(null)

export function useAiChat(): AiChatApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAiChat must be used inside <AiChatProvider>')
  return ctx
}

export function AiChatProvider({ children }: { children: ReactNode }) {
  const { state, goal, policy } = useConsole()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [busy, setBusy] = useState(false)
  // Read the live state at send time, not render time, so an approval made
  // mid-conversation is reflected in the next answer.
  const ctxRef = useRef({ state, goal, policy })
  ctxRef.current = { state, goal, policy }

  // The conversation lives in a ref and state mirrors it. Reading it inside a
  // setState updater meant the fetch fired before React had run the updater,
  // so the first request went out with an empty history.
  const history = useRef<Message[]>([])

  const send = useCallback(async (text: string) => {
    const clean = text.trim()
    if (!clean) return

    setBusy(true)
    const sent: Message[] = [...history.current, { role: 'user', content: clean }]
    history.current = sent
    setMessages([...sent, { role: 'assistant', content: '' }])

    const settle = (content: string) => {
      history.current = [...sent, { role: 'assistant', content }]
      setMessages(history.current)
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: sent, ...ctxRef.current }),
      })
      const reader = res.body?.getReader()
      if (!reader) throw new Error('no stream')

      const dec = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += dec.decode(value, { stream: true })
        setMessages([...sent, { role: 'assistant', content: acc }])
      }
      settle(acc)
    } catch {
      settle('That did not go through. Try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  const api = useMemo<AiChatApi>(
    () => ({
      open,
      messages,
      busy,
      openWith: (seed) => {
        setOpen(true)
        if (seed) void send(seed)
      },
      close: () => setOpen(false),
      send: (t) => void send(t),
      reset: () => {
        history.current = []
        setMessages([])
      },
    }),
    [open, messages, busy, send],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/**
 * The sparkle that appears beside a number or a proposal. Whop puts one in the
 * dashboard header; here it is per-thing, so the question arrives with context
 * already attached.
 */
export function SparkButton({ ask, label }: { ask: string; label: string }) {
  const { openWith } = useAiChat()
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        openWith(ask)
      }}
      title={`Ask about ${label}`}
      aria-label={`Ask about ${label}`}
      // Always present, so the affordance is discoverable without hunting:
      // recessed at rest, lifted while the row is hovered, brand on direct hover.
      className="shrink-0 rounded-md p-1 text-gray-7 transition-colors duration-100 group-hover/cell:text-mute hover:!text-brand-text hover:bg-gray-4"
    >
      <Icon name="sparkle" className="size-4" />
    </button>
  )
}
