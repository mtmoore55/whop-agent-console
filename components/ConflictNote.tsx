'use client'

import { count, money } from '@/lib/format'
import { useConsole } from '@/lib/store'
import type { ActionParams, ProposedAction } from '@/lib/types'
import { Eyebrow } from './ui'

function Row({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[13px] text-mute">{label}</span>
      <span className={`num text-[13px] ${hot ? 'font-semibold text-amber-11' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  )
}

/**
 * The conflict the console surfaces next to the numbers an action touches.
 * It is never used to block. The human catches it — that is the whole point.
 */
export function ConflictNote({ action }: { action: ProposedAction }) {
  const { state } = useConsole()
  if (!action.conflict) return null

  let ledger: React.ReactNode = null

  if (action.type === 'swolemates.paywall.set_mode') {
    const p = action.params as ActionParams['swolemates.paywall.set_mode']
    ledger = p.mode === 'day0' ? (
      <div className="mt-3 divide-y divide-line-soft border-t border-line-soft pt-1">
        <Row label="Non-invitee signups that met the day-0 wall" value="262 of 268" hot />
        <Row label="Finished onboarding under it" value="14%" hot />
        <Row label="Trials mid-flight right now" value={count(state.trials.live)} />
        <Row label="Arrivals over the next 30 days" value={count(state.members.signups24h * 30)} />
        <Row label="Reverted to trial-first on" value="Aug 18, 2026" />
      </div>
    ) : null
  }

  if (action.type === 'swolemates.offer_code.create') {
    const p = action.params as ActionParams['swolemates.offer_code.create']
    const monthly = state.revenue.yearlyPrice / 12
    ledger = (
      <div className="mt-3 divide-y divide-line-soft border-t border-line-soft pt-1">
        <Row label="Intended audience" value={`${count(action.blastRadius)} people`} />
        <Row
          label="Could redeem it if the code spreads"
          value={`${count(state.members.people)} members`}
          hot
        />
        <Row label="Discount" value={`${p.discountPct}% for ${p.durationMonths} months`} />
        <Row label="Redemption cap" value={count(p.maxRedemptions)} />
        <Row
          label="Worst case if fully redeemed"
          value={money(action.maxCost)}
          hot
        />
        <Row label="Full price per plan" value={`${money(monthly, { cents: true })}/mo`} />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-9/25 bg-amber-surface/70 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full bg-amber-9" />
        <Eyebrow className="text-amber-11">{action.conflict.label}</Eyebrow>
      </div>
      <p className="mt-2 text-[13px] leading-[1.55] text-mute">{action.conflict.detail}</p>
      {ledger}
    </div>
  )
}
