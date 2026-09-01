'use client'

import { useState } from 'react'
import { money, plural } from '@/lib/format'
import { policySentence } from '@/lib/policy'
import { useConsole } from '@/lib/store'
import { Btn, Eyebrow } from './ui'

/** Approve everything the policy already trusts — with the combined cost first. */
export function BatchBar() {
  const { autoEligible, approveMany, policy, state } = useConsole()
  const [armed, setArmed] = useState(false)

  const combined = autoEligible.reduce((a, b) => a + b.maxCost, 0)
  const remaining = policy.dailySpendCapUSD - state.agentSpendToday
  const spentPct = Math.min(100, (state.agentSpendToday / policy.dailySpendCapUSD) * 100)

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0 max-w-[62ch]">
          <Eyebrow className="mb-1.5">Standing policy</Eyebrow>
          <p className="text-[14px] leading-[1.5] text-mute">{policySentence(policy)}</p>
        </div>

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <div>
            <Eyebrow className="mb-1.5 whitespace-nowrap">Budget left today</Eyebrow>
            <div className="num text-[14px] font-medium text-ink">
              {money(remaining)}{' '}
              <span className="font-normal text-faint">/ {money(policy.dailySpendCapUSD)}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-line" aria-hidden />
          {autoEligible.length === 0 ? (
            <span className="text-[13px] text-faint">Nothing auto-eligible</span>
          ) : armed ? (
            <div className="flex items-center gap-2">
              <span className="num text-[13px] text-mute">
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
            </div>
          ) : (
            <Btn className="whitespace-nowrap" onClick={() => setArmed(true)}>
              Approve {plural(autoEligible.length, 'auto action')} · {money(combined)}
            </Btn>
          )}
        </div>
      </div>

      {/* The budget depleting is a real state change, so it gets motion. */}
      <div className="h-0.5 w-full bg-gray-3">
        <div
          className="h-0.5 bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${spentPct}%` }}
        />
      </div>
    </div>
  )
}
