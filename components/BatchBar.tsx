'use client'

import { useState } from 'react'
import Link from 'next/link'
import { count, money, plural } from '@/lib/format'
import { useConsole } from '@/lib/store'
import { Btn } from './ui'

/**
 * Counts, budget, and the batch control on one line.
 *
 * This used to restate the whole standing policy in a paragraph above the
 * proposals. That is settings copy — it lives on the Console. What belongs
 * over the brief is only what you act on: how much room is left today, and
 * the one button that spends it.
 */
export function BatchBar() {
  const { autoEligible, approveMany, policy, state, brief, statusOf } = useConsole()
  const [armed, setArmed] = useState(false)

  const combined = autoEligible.reduce((a, b) => a + b.maxCost, 0)
  const remaining = policy.dailySpendCapUSD - state.agentSpendToday
  const actions = brief.proposals.filter((p) => p.kind === 'action')
  const decided = actions.filter(
    (p) => statusOf(p.id) === 'executed' || statusOf(p.id) === 'rejected',
  )

  return (
    <div className="mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
      <span className="eyebrow text-mute">
        {count(brief.proposals.length)} items · {count(actions.length)} decisions
      </span>

      <Link
        href="/console"
        className="num text-[12px] text-faint transition-colors hover:text-ink"
        title="Daily agent spend cap — set on the Console"
      >
        {money(remaining)} left today
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <span className="num text-[12px] text-faint">
          {count(decided.length)}/{count(actions.length)} decided
        </span>

        {autoEligible.length > 0 &&
          (armed ? (
            <>
              <span className="num text-[12.5px] text-mute">
                {plural(autoEligible.length, 'action')} · {money(combined)}?
              </span>
              <Btn
                variant="primary"
                onClick={() => {
                  approveMany(autoEligible.map((a) => a.id))
                  setArmed(false)
                }}
              >
                Confirm
              </Btn>
              <Btn variant="ghost" onClick={() => setArmed(false)}>
                Cancel
              </Btn>
            </>
          ) : (
            <Btn className="whitespace-nowrap" onClick={() => setArmed(true)}>
              Approve {plural(autoEligible.length, 'auto action')} · {money(combined)}
            </Btn>
          ))}
      </div>
    </div>
  )
}
