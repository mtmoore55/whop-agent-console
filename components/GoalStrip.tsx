'use client'

import Link from 'next/link'
import { arrivalISO } from '@/lib/goal'
import { money, monthYear } from '@/lib/format'
import { useConsole } from '@/lib/store'
import { Eyebrow, Tag } from './ui'

const TONE = {
  met: { tag: 'green', bar: 'bg-green-9' },
  ahead: { tag: 'green', bar: 'bg-green-9' },
  behind: { tag: 'amber', bar: 'bg-amber-9' },
  stalled: { tag: 'red', bar: 'bg-red-9' },
} as const

const LABEL = {
  met: 'Met',
  ahead: 'On pace',
  behind: 'Behind',
  stalled: 'Stalled',
} as const

/**
 * Pace toward the goal, computed from state. The agent writes the lede and can
 * be wrong; this strip cannot, which is why the two sit next to each other.
 */
export function GoalStrip() {
  const { goal, pace, state } = useConsole()
  const tone = TONE[pace.status]
  const arrives = arrivalISO(state, pace)
  const late = pace.monthsAtCurrentPace !== null && pace.monthsAtCurrentPace - pace.monthsRemaining

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <Eyebrow>Goal</Eyebrow>
          <span className="num text-[14px] text-ink">
            {goal.label} {money(goal.target)}/mo
          </span>
          <span className="text-[13px] text-faint">by {monthYear(goal.byISO)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tag tone={tone.tag}>{LABEL[pace.status]}</Tag>
          <Link
            href="/console"
            className="text-[13px] text-faint transition-colors hover:text-ink"
          >
            Change →
          </Link>
        </div>
      </div>

      <div className="px-4 pb-3.5 sm:px-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-4">
          <div
            className={`h-1.5 rounded-full transition-[width] duration-500 ease-out ${tone.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, pace.pctOfGoal))}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
          <span className="num text-[14px] font-medium text-ink">
            {money(pace.current)}/mo
          </span>
          <span className="num text-[13px] text-faint">
            {pace.pctOfGoal.toFixed(0)}% there · {money(pace.gap)}/mo to go
          </span>

          {pace.requiredMonthlyGrowthPct !== null && (
            <span className="num text-[13px] text-faint">
              needs{' '}
              <span className={pace.status === 'behind' ? 'text-amber-11' : 'text-ink'}>
                +{pace.requiredMonthlyGrowthPct.toFixed(1)}%/mo
              </span>{' '}
              · doing +{pace.monthlyGrowthPct.toFixed(1)}%
            </span>
          )}

          {arrives && (
            <span className="num text-[13px] text-faint">
              arrives {monthYear(arrives)}
              {typeof late === 'number' && late > 0.5
                ? ` · ${Math.round(late)} mo late`
                : ''}
            </span>
          )}
          {!arrives && pace.status === 'stalled' && (
            <span className="text-[13px] text-red-11">not growing — never arrives at this rate</span>
          )}
        </div>
      </div>
    </div>
  )
}
