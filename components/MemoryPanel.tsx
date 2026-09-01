'use client'

import { ACTION_LABELS } from '@/lib/policy'
import { hardNos } from '@/lib/memory'
import { useConsole } from '@/lib/store'
import { Btn, Eyebrow, Tag } from './ui'

/**
 * Milestone 4. Every rejection and its one-word reason is kept and handed back
 * to the agent on the next run, so the gate trains the thing it is gating.
 */
export function MemoryPanel() {
  const { memory, forgetMemory, agent } = useConsole()
  const heldBack = agent.heldBack ?? []
  const standing = new Set(hardNos(memory))
  if (memory.length === 0 && heldBack.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-card/50 px-4 py-3.5">
        <Eyebrow className="mb-1.5">Agent memory</Eyebrow>
        <p className="max-w-[68ch] text-[13px] leading-[1.55] text-faint">
          Empty. Reject a proposal with a reason and it lands here — the agent is told
          about it before it writes the next brief, so it stops asking.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-4 py-2.5">
        <Eyebrow>Learned from you</Eyebrow>
        <span className="text-[12px] text-faint">
          {agent.memoryApplied === 'prompt'
            ? 'sent to the agent in its system prompt'
            : agent.memoryApplied === 'filter'
              ? 'applied by the cached agent as a filter'
              : 'goes to the agent on its next run'}
        </span>
      </div>

      <ul className="divide-y divide-line-soft">
        {memory.map((m) => (
          <li key={m.id} className="flex items-start gap-x-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              {/* The proposal leads, so two rejections of the same action type
                  stay distinguishable from each other. */}
              <div className="truncate text-[14px] text-ink">{m.headline}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[12px] text-faint">{ACTION_LABELS[m.type]}</span>
                <span className="text-[12px] text-faint">· rejected as</span>
                <span className="text-[12px] font-medium text-red-11">{m.reason}</span>
                {standing.has(m.type) && <Tag tone="red">standing no</Tag>}
              </div>
            </div>
            <Btn
              variant="ghost"
              className="h-7 shrink-0 px-2 text-[13px]"
              onClick={() => forgetMemory(m.id)}
            >
              Forget
            </Btn>
          </li>
        ))}
      </ul>

      {heldBack.length > 0 && (
        <div className="border-t border-line-soft bg-raise px-4 py-3">
          <Eyebrow className="mb-2">Held back on the last run</Eyebrow>
          <ul className="space-y-1.5">
            {heldBack.map((h, i) => (
              <li key={`${h.type}-${i}`} className="text-[13px] leading-snug text-mute">
                <span className="text-ink">{h.headline}</span>
                <span className="text-faint"> — you rejected {ACTION_LABELS[h.type].toLowerCase()} as “{h.reason}”</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
