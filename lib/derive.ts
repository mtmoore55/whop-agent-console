import type { ActionParams, ActionType, BusinessState } from './types'

/**
 * Cost and blast radius are derived from an action's real parameters, never
 * asserted. That is what makes Modify meaningful: halve an offer code's
 * discount and the worst case at risk moves with it, on screen, immediately.
 */

/** A yearly plan's monthly-normalised value, the way MRR is counted. */
function monthlyPlanValue(state: BusinessState): number {
  return state.revenue.yearlyPrice / 12
}

function offerAudienceSize(
  state: BusinessState,
  audience: 'expired_trials' | 'lapsed_payers' | 'riders',
): number {
  if (audience === 'expired_trials') return state.trials.expiredNeverPaid
  if (audience === 'riders') return state.members.riders
  return Math.round(state.revenue.mrrLapsing / monthlyPlanValue(state))
}

export interface Derived {
  maxCost: number
  blastRadius: number
}

export function derive<K extends ActionType>(
  type: K,
  params: ActionParams[K],
  state: BusinessState,
): Derived {
  switch (type) {
    case 'swolemates.nudge.campaign': {
      const p = params as ActionParams['swolemates.nudge.campaign']
      return { maxCost: 0, blastRadius: Math.min(p.audienceSize, p.maxSends) }
    }
    case 'swolemates.push.broadcast': {
      const p = params as ActionParams['swolemates.push.broadcast']
      return { maxCost: 0, blastRadius: p.recipientCount }
    }
    case 'swolemates.email.campaign': {
      const p = params as ActionParams['swolemates.email.campaign']
      return { maxCost: 0, blastRadius: p.recipientCount }
    }
    case 'swolemates.offer_code.create': {
      const p = params as ActionParams['swolemates.offer_code.create']
      const perMonth = monthlyPlanValue(state) * (p.discountPct / 100)
      return {
        maxCost: Math.round(p.maxRedemptions * perMonth * p.durationMonths),
        blastRadius: offerAudienceSize(state, p.audience),
      }
    }
    case 'swolemates.pricing.update': {
      const p = params as ActionParams['swolemates.pricing.update']
      const current =
        p.period === 'yearly' ? state.revenue.yearlyPrice : state.revenue.monthlyPrice
      const plans =
        p.period === 'yearly' ? state.revenue.yearlyPlans : state.revenue.monthlyPlans
      const affected = p.appliesTo === 'everyone' ? plans : 0
      const monthlyDelta =
        Math.abs(current - p.newPrice) / (p.period === 'yearly' ? 12 : 1)
      return { maxCost: Math.round(monthlyDelta * affected), blastRadius: affected }
    }
    case 'swolemates.trial.set_length':
      // Everyone currently mid-trial has their deadline moved under them.
      return { maxCost: 0, blastRadius: state.trials.live }
    case 'swolemates.paywall.set_mode': {
      const p = params as ActionParams['swolemates.paywall.set_mode']
      // Everyone in a trial now, plus a month of arrivals, meets the new gate.
      const exposed = state.trials.live + state.members.signups24h * 30
      return { maxCost: 0, blastRadius: p.mode === 'day0' ? exposed : 0 }
    }
    case 'swolemates.badge.schedule_monthly': {
      const p = params as ActionParams['swolemates.badge.schedule_monthly']
      return { maxCost: Math.round(p.months * 240), blastRadius: 0 }
    }
    case 'asa.campaign.create': {
      const p = params as ActionParams['asa.campaign.create']
      return { maxCost: Math.round(p.dailyBudget), blastRadius: 0 }
    }
    case 'asa.campaign.adjust_budget': {
      const p = params as ActionParams['asa.campaign.adjust_budget']
      return { maxCost: Math.round(p.newDailyBudget), blastRadius: 0 }
    }
    case 'asa.campaign.pause':
      return { maxCost: 0, blastRadius: 0 }
    case 'whop.merch.promo.create': {
      const p = params as ActionParams['whop.merch.promo.create']
      const avg =
        state.merch.products.reduce((a, m) => a + m.price, 0) /
        Math.max(1, state.merch.products.length)
      return {
        maxCost: Math.round(p.maxRedemptions * avg * (p.discountPct / 100)),
        blastRadius: 0,
      }
    }
    case 'whop.merch.product.create':
      return { maxCost: 0, blastRadius: 0 }
    default:
      return { maxCost: 0, blastRadius: 0 }
  }
}

/* ------------------------------------------------------------------ */
/* Parameter editors — Modify edits the real params, not a text box.   */
/* ------------------------------------------------------------------ */

export interface FieldDef {
  key: string
  label: string
  kind: 'number' | 'text' | 'select'
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  help?: string
}

const NUDGE_AUDIENCES = [
  { value: 'trial_no_crew', label: 'Trial users with no crew' },
  { value: 'trial_expiring', label: 'Trials expiring in 3 days' },
  { value: 'signed_up_no_trial', label: 'Signed up, never started' },
  { value: 'lapsed_owners', label: 'Lapsed plan owners' },
  { value: 'riders_after_owner_lapse', label: 'Riders whose owner lapsed' },
]

export const PARAM_FIELDS: Record<ActionType, FieldDef[]> = {
  'swolemates.nudge.campaign': [
    { key: 'audience', label: 'Audience', kind: 'select', options: NUDGE_AUDIENCES },
    {
      key: 'maxSends',
      label: 'Max sends',
      kind: 'number',
      min: 1,
      max: 50_000,
      help: 'Caps how many people the campaign can reach, however big the cohort is.',
    },
    { key: 'days', label: 'Runs for', kind: 'number', suffix: 'days', min: 1, max: 90 },
  ],
  'swolemates.push.broadcast': [
    {
      key: 'audience',
      label: 'Audience',
      kind: 'select',
      options: [...NUDGE_AUDIENCES, { value: 'everyone', label: 'Everyone' }],
    },
    { key: 'recipientCount', label: 'Recipients', kind: 'number', min: 1, max: 100_000 },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'text' },
  ],
  'swolemates.email.campaign': [
    { key: 'audience', label: 'Audience', kind: 'select', options: NUDGE_AUDIENCES },
    { key: 'recipientCount', label: 'Recipients', kind: 'number', min: 1, max: 100_000 },
    { key: 'subject', label: 'Subject', kind: 'text' },
  ],
  'swolemates.offer_code.create': [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'discountPct', label: 'Discount', kind: 'number', suffix: '%', min: 5, max: 90, step: 5 },
    {
      key: 'durationMonths',
      label: 'Lasts',
      kind: 'number',
      suffix: 'months',
      min: 1,
      max: 24,
    },
    {
      key: 'audience',
      label: 'Audience',
      kind: 'select',
      options: [
        { value: 'expired_trials', label: 'Trials that never paid' },
        { value: 'lapsed_payers', label: 'Lapsed payers' },
        { value: 'riders', label: 'Crew riders' },
      ],
    },
    {
      key: 'maxRedemptions',
      label: 'Max redemptions',
      kind: 'number',
      min: 1,
      max: 50_000,
      help: 'Apple offer codes are shareable. This is the only thing that bounds the cost.',
    },
  ],
  'swolemates.pricing.update': [
    {
      key: 'period',
      label: 'Plan',
      kind: 'select',
      options: [
        { value: 'yearly', label: 'Yearly' },
        { value: 'monthly', label: 'Monthly' },
      ],
    },
    { key: 'newPrice', label: 'New price', kind: 'number', prefix: '$', min: 1, max: 500 },
    {
      key: 'appliesTo',
      label: 'Applies to',
      kind: 'select',
      options: [
        { value: 'new_only', label: 'New subscribers only' },
        { value: 'everyone', label: 'Everyone (needs Apple consent)' },
      ],
    },
  ],
  'swolemates.trial.set_length': [
    { key: 'days', label: 'Trial length', kind: 'number', suffix: 'days', min: 1, max: 60 },
  ],
  'swolemates.paywall.set_mode': [
    {
      key: 'mode',
      label: 'Gate',
      kind: 'select',
      options: [
        { value: 'server14', label: 'Trial-first (day 14 ask)' },
        { value: 'day0', label: 'Day-0 paywall' },
      ],
    },
  ],
  'swolemates.badge.schedule_monthly': [
    { key: 'months', label: 'Months ahead', kind: 'number', min: 1, max: 12 },
    { key: 'coach', label: 'Coach', kind: 'text' },
  ],
  'asa.campaign.create': [
    { key: 'name', label: 'Campaign', kind: 'text' },
    {
      key: 'placement',
      label: 'Placement',
      kind: 'select',
      options: [
        { value: 'search_results', label: 'Search results' },
        { value: 'search_tab', label: 'Search tab' },
        { value: 'today_tab', label: 'Today tab' },
      ],
    },
    { key: 'dailyBudget', label: 'Daily budget', kind: 'number', prefix: '$', min: 10, max: 5000, step: 10 },
    { key: 'keywordTheme', label: 'Keyword theme', kind: 'text' },
  ],
  'asa.campaign.adjust_budget': [
    { key: 'newDailyBudget', label: 'New daily budget', kind: 'number', prefix: '$', min: 0, max: 5000, step: 10 },
  ],
  'asa.campaign.pause': [],
  'whop.merch.promo.create': [
    { key: 'code', label: 'Code', kind: 'text' },
    { key: 'discountPct', label: 'Discount', kind: 'number', suffix: '%', min: 5, max: 90, step: 5 },
    { key: 'durationDays', label: 'Runs for', kind: 'number', suffix: 'days', min: 1, max: 365 },
    { key: 'maxRedemptions', label: 'Max redemptions', kind: 'number', min: 1, max: 10_000 },
  ],
  'whop.merch.product.create': [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'price', label: 'Price', kind: 'number', prefix: '$', min: 1, max: 500 },
  ],
}
