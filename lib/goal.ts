import type { BusinessState, Goal } from './types'

/**
 * Pace toward the goal, derived from state rather than asserted. The agent may
 * be wrong about a proposal's contribution; it cannot be wrong about this.
 */
export interface GoalPace {
  current: number
  target: number
  gap: number
  pctOfGoal: number
  /** Observed monthly growth, from the trailing 30-day change. */
  monthlyGrowthPct: number
  /** Months to the target at the observed rate. Null if growth is flat or negative. */
  monthsAtCurrentPace: number | null
  /** Months between today and the target date. */
  monthsRemaining: number
  /** The rate needed to arrive on time. Null once the target is met or the date has passed. */
  requiredMonthlyGrowthPct: number | null
  status: 'met' | 'ahead' | 'behind' | 'stalled'
}

function monthsBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO.slice(0, 10)}T00:00:00Z`)
  const b = new Date(`${toISO.slice(0, 10)}T00:00:00Z`)
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
}

export function goalPace(state: BusinessState, goal: Goal): GoalPace {
  const current = state.revenue.mrr
  const target = goal.target
  const gap = Math.max(0, target - current)
  const growth = state.revenue.mrrChangePct30d / 100
  const monthsRemaining = Math.max(0, monthsBetween(state.business.todayISO, goal.byISO))

  // Growth compounds. Treating a percentage rate as linear flatters the pace
  // badly over a year, which is exactly the horizon this is used on.
  const monthsAtCurrentPace =
    current >= target ? 0 : growth > 0 ? Math.log(target / current) / Math.log(1 + growth) : null

  const requiredMonthlyGrowthPct =
    current >= target || monthsRemaining <= 0 || current <= 0
      ? null
      : ((target / current) ** (1 / monthsRemaining) - 1) * 100

  const status: GoalPace['status'] =
    current >= target
      ? 'met'
      : monthsAtCurrentPace === null
        ? 'stalled'
        : monthsAtCurrentPace <= monthsRemaining
          ? 'ahead'
          : 'behind'

  return {
    current,
    target,
    gap,
    pctOfGoal: target > 0 ? (current / target) * 100 : 0,
    monthlyGrowthPct: state.revenue.mrrChangePct30d,
    monthsAtCurrentPace,
    monthsRemaining,
    requiredMonthlyGrowthPct,
    status,
  }
}

/** The date the goal is reached at the observed rate. */
export function arrivalISO(state: BusinessState, pace: GoalPace): string | null {
  if (pace.monthsAtCurrentPace === null) return null
  const d = new Date(`${state.business.todayISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + Math.round(pace.monthsAtCurrentPace * 30.44))
  return d.toISOString().slice(0, 10)
}

/** What share of the remaining gap a proposal claims to close. */
export function shareOfGap(monthlyDelta: number, pace: GoalPace): number {
  if (pace.gap <= 0) return 0
  return (monthlyDelta / pace.gap) * 100
}
