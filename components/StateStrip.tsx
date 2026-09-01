'use client'

import { useConsole } from '@/lib/store'
import { compactMoney, count, money, pct, signedPct } from '@/lib/format'
import { useFlash, Eyebrow, Tag } from './ui'
import { SparkButton } from './AiChat'

const GOAL_TONE = {
  met: 'green',
  ahead: 'green',
  behind: 'amber',
  stalled: 'red',
} as const

const GOAL_LABEL = {
  met: 'Met',
  ahead: 'On pace',
  behind: 'Behind',
  stalled: 'Stalled',
} as const

function Cell({
  label,
  value,
  sub,
  tone = 'ink',
  tag,
  ask,
  askLabel,
  className = '',
}: {
  label: React.ReactNode
  value: string
  sub: React.ReactNode
  tone?: 'ink' | 'bad'
  tag?: React.ReactNode
  ask: string
  askLabel: string
  className?: string
}) {
  const flash = useFlash(value)
  return (
    <div className={`group/cell min-w-0 bg-card px-4 py-3.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="eyebrow min-w-0 truncate text-faint">{label}</div>
        <div className="flex shrink-0 items-center gap-1">
          {tag}
          <SparkButton ask={ask} label={askLabel} />
        </div>
      </div>
      <div
        className={`num title mt-2 truncate text-[20px] leading-none sm:text-[24px] ${
          tone === 'bad' ? 'text-red-11' : 'text-ink'
        } ${flash}`}
      >
        {value}
      </div>
      <div className="num mt-2 truncate text-[12px] leading-none text-faint">{sub}</div>
    </div>
  )
}

/**
 * State of the business, with the goal folded into the MRR cell rather than
 * stacked above it. The goal used to be its own panel, which pushed the
 * proposals — the actual product — below the fold and printed MRR twice.
 */
export function StateStrip() {
  const { state, goal, pace, brief } = useConsole()
  const camp = state.ads.campaigns[0]
  const spiking = state.issues.filter((i) => i.trend === 'spiking').length
  const churnDelta = state.churn.trailing30dPct - state.churn.priorPct

  const offered = brief.proposals.reduce(
    (a, p) => a + (p.kind === 'action' ? (p.goalContribution?.monthlyDelta ?? 0) : 0),
    0,
  )
  const offeredShare = pace.gap > 0 ? (offered / pace.gap) * 100 : 0

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-line">
      <div className="grid grid-cols-2 gap-px @xl:grid-cols-3 @5xl:grid-cols-6">
        <Cell
          label={<>MRR → {compactMoney(goal.target)}/mo</>}
          value={money(state.revenue.mrr)}
          tag={<Tag tone={GOAL_TONE[pace.status]}>{GOAL_LABEL[pace.status]}</Tag>}
          sub={
            pace.requiredMonthlyGrowthPct === null
              ? `${signedPct(state.revenue.mrrChangePct30d)} · 30d`
              : `${pace.pctOfGoal.toFixed(0)}% · needs +${pace.requiredMonthlyGrowthPct.toFixed(
                  1,
                )}%/mo, doing ${signedPct(state.revenue.mrrChangePct30d)}`
          }
          askLabel="MRR against the goal"
          ask={`We are at ${money(state.revenue.mrr)}/mo against a ${money(
            goal.target,
          )}/mo goal by ${goal.byISO}, growing ${state.revenue.mrrChangePct30d}%/mo when we need ${pace.requiredMonthlyGrowthPct?.toFixed(
            1,
          )}%/mo. What is the fastest realistic path to close that gap?`}
          className="col-span-2"
        />
        <Cell
          label="Churn 30d"
          value={pct(state.churn.trailing30dPct)}
          tone="bad"
          sub={`↑ ${churnDelta.toFixed(1)}pt from ${pct(state.churn.priorPct)}`}
          askLabel="churn"
          ask={`Churn went from ${pct(state.churn.priorPct)} to ${pct(
            state.churn.trailing30dPct,
          )} over 30 days. What is most likely causing it, and what would you check first?`}
        />
        <Cell
          label="CAC"
          value={camp ? money(camp.cac) : '—'}
          tone={camp && camp.cac > camp.cacPrior ? 'bad' : 'ink'}
          sub={camp ? `↑ from ${money(camp.cacPrior)}` : 'no campaigns'}
          askLabel="CAC"
          ask={
            camp
              ? `CAC on the Meta campaign went from ${money(camp.cacPrior)} to ${money(
                  camp.cac,
                )} with no creative change, on ${money(camp.dailyBudget)}/day. Is this worth fixing or should I cut the spend?`
              : 'I have no active ad campaigns. Is paid acquisition worth starting given the goal?'
          }
        />
        <Cell
          label="Balance"
          value={money(state.treasury.balance)}
          sub={
            state.treasury.inYield > 0
              ? `${money(state.treasury.inYield)} in yield`
              : `${money(state.treasury.idle)} idle`
          }
          askLabel="the balance"
          ask={`I hold ${money(state.treasury.balance)}, of which ${money(
            state.treasury.idle,
          )} is idle, with a ${money(
            state.obligations[0]?.amount ?? 0,
          )} payout due in ${state.obligations[0]?.dueInDays ?? 0} days. What should I do with the idle cash?`}
        />
        <Cell
          label="Open issues"
          value={count(state.issues.length)}
          tone={spiking > 0 ? 'bad' : 'ink'}
          sub={spiking > 0 ? `${count(spiking)} spiking` : 'all cooling'}
          askLabel="open issues"
          ask={`${state.issues
            .map((i) => `${i.title} (${i.events24h} events/24h, ${i.trend})`)
            .join('; ')}. How much of my churn could these explain, and which do I fix first?`}
        />
      </div>

      <div className="h-1 w-full bg-gray-4">
        <div
          className={`h-1 transition-[width] duration-500 ease-out ${
            pace.status === 'behind' ? 'bg-amber-9' : pace.status === 'stalled' ? 'bg-red-9' : 'bg-green-9'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, pace.pctOfGoal))}%` }}
        />
      </div>

      {offered > 0 && (
        <div className="bg-raise px-4 py-2.5">
          <span className="num text-[13px] text-mute">
            Today&apos;s brief adds up to{' '}
            <span className="font-semibold text-ink">{money(offered)}/mo</span> —{' '}
            <span className={offeredShare < 25 ? 'text-amber-11' : 'text-ink'}>
              {offeredShare.toFixed(0)}% of the {money(pace.gap)} gap
            </span>
            {offeredShare < 25 && (
              <span className="text-faint">. Closing it needs something the agent cannot propose.</span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

export { Eyebrow }
