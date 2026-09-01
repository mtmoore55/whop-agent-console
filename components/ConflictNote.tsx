'use client'

import { count, daysFromNow, money, shortDate } from '@/lib/format'
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

  if (action.type === 'whop.treasury.move') {
    const p = action.params as ActionParams['whop.treasury.move']
    const t = state.treasury
    const settledAfter = p.destination === 'yield' ? t.settled - p.amount : t.settled + p.amount
    const soonest = state.obligations.slice().sort((a, b) => a.dueInDays - b.dueInDays)[0]
    const short = soonest ? settledAfter < soonest.amount : false

    ledger = (
      <div className="mt-3 divide-y divide-line-soft border-t border-line-soft pt-1">
        <Row label="Settled cash today" value={money(t.settled)} />
        <Row label="Settled after this move" value={money(settledAfter)} hot={short} />
        {soonest && (
          <Row
            label={`${soonest.label} · ${shortDate(daysFromNow(state.business.todayISO, soonest.dueInDays))}`}
            value={`−${money(soonest.amount)}`}
            hot={short}
          />
        )}
        <Row
          label={`Clears in ${count(t.pendingClearsInDays)} days (unsettled)`}
          value={money(t.pendingClearance)}
        />
        <Row
          label="Money back out of yield"
          value={`${count(t.yieldSettlementDays)} days`}
          hot={soonest ? t.yieldSettlementDays > soonest.dueInDays : false}
        />
      </div>
    )
  }

  if (action.type === 'whop.promo.create') {
    const p = action.params as ActionParams['whop.promo.create']
    const seenBy =
      p.audience === 'lapsed'
        ? state.members.lapsed90d
        : p.audience === 'active'
          ? state.members.active
          : state.members.active + state.members.lapsed90d
    // A code sent to lapsed members is still visible to everyone paying full price.
    const reachable = state.members.active + state.members.lapsed90d

    ledger = (
      <div className="mt-3 divide-y divide-line-soft border-t border-line-soft pt-1">
        <Row label="Sent to" value={`${count(seenBy)} members`} />
        <Row label="Can actually use it if it leaks" value={`${count(reachable)} members`} hot />
        <Row label="Live for" value={`${count(p.durationDays)} days`} />
        <Row label="Redemption cap" value={count(p.maxRedemptions)} />
        <Row label="Worst case if fully redeemed" value={money(action.maxCost)} hot />
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
