import type { ActionParams, ActionType, BusinessState } from './types'

/**
 * Cost and blast radius are derived from an action's real parameters, never
 * asserted. That is what makes Modify meaningful: halve an offer code's
 * discount and the worst case at risk moves with it, on screen, immediately.
 */

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
    case 'whop.plan.create': {
      const p = params as ActionParams['whop.plan.create']
      // Nothing is spent listing a plan; the exposure is the fee difference on
      // whatever moves to it, which is upside rather than risk.
      return { maxCost: 0, blastRadius: p.seats > 0 ? 0 : 0 }
    }
    case 'whop.promo.create':
    case 'whop.merch.promo.create': {
      const p = params as ActionParams['whop.promo.create']
      const unit =
        'appliesTo' in p && p.appliesTo === 'merch'
          ? state.merch.products.reduce((a, m) => a + m.price, 0) /
            Math.max(1, state.merch.products.length)
          : state.revenue.yearlyPrice
      return {
        maxCost: Math.round(p.maxRedemptions * unit * (p.discountPct / 100)),
        blastRadius: state.whop.reachableMembers,
      }
    }
    case 'whop.app.publish':
      return { maxCost: 0, blastRadius: 0 }
    case 'whop.affiliate.enable':
    case 'whop.affiliate.set_rate': {
      const p = params as ActionParams['whop.affiliate.enable']
      // 90 days of commission on the plans an affiliate channel plausibly moves.
      const referredPlans = Math.round(state.members.payingPlans * 0.05)
      const gross = referredPlans * state.revenue.yearlyPrice
      return { maxCost: Math.round(gross * (p.ratePct / 100)), blastRadius: 0 }
    }
    case 'whop.bounty.create': {
      const p = params as ActionParams['whop.bounty.create']
      return { maxCost: Math.round(p.budget), blastRadius: state.whop.reachableMembers }
    }
    case 'whop.ads.campaign.create': {
      const p = params as ActionParams['whop.ads.campaign.create']
      return { maxCost: Math.round(p.dailyBudget), blastRadius: 0 }
    }
    case 'whop.ads.campaign.adjust_budget': {
      const p = params as ActionParams['whop.ads.campaign.adjust_budget']
      return { maxCost: Math.round(p.newDailyBudget), blastRadius: 0 }
    }
    case 'whop.ads.campaign.pause':
      return { maxCost: 0, blastRadius: 0 }
    case 'whop.notification.send': {
      const p = params as ActionParams['whop.notification.send']
      return { maxCost: 0, blastRadius: p.recipientCount }
    }
    case 'swolemates.paywall.set_mode': {
      const p = params as ActionParams['swolemates.paywall.set_mode']
      const exposed = state.trials.live + state.members.signups24h * 30
      return { maxCost: 0, blastRadius: p.mode === 'day0' ? exposed : 0 }
    }
    case 'swolemates.nudge.campaign': {
      const p = params as ActionParams['swolemates.nudge.campaign']
      return { maxCost: 0, blastRadius: Math.min(p.audienceSize, p.maxSends) }
    }
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


export const PARAM_FIELDS: Record<ActionType, FieldDef[]> = {
  'whop.plan.create': [
    { key: 'name', label: 'Plan name', kind: 'text' },
    { key: 'price', label: 'Price', kind: 'number', prefix: '$', min: 1, max: 500 },
    {
      key: 'billing',
      label: 'Billing',
      kind: 'select',
      options: [
        { value: 'yearly', label: 'Yearly' },
        { value: 'monthly', label: 'Monthly' },
      ],
    },
    { key: 'seats', label: 'Seats', kind: 'number', min: 1, max: 20 },
  ],
  'whop.promo.create': [
    { key: 'code', label: 'Code', kind: 'text' },
    { key: 'discountPct', label: 'Discount', kind: 'number', suffix: '%', min: 5, max: 90, step: 5 },
    { key: 'durationDays', label: 'Runs for', kind: 'number', suffix: 'days', min: 1, max: 365 },
    {
      key: 'maxRedemptions',
      label: 'Max redemptions',
      kind: 'number',
      min: 1,
      max: 50_000,
      help: 'Whop promo codes are shareable. This is the only thing that bounds the cost.',
    },
    {
      key: 'appliesTo',
      label: 'Applies to',
      kind: 'select',
      options: [
        { value: 'plan', label: 'The Swolemates plan' },
        { value: 'merch', label: 'Merch only' },
      ],
    },
  ],
  'whop.app.publish': [
    { key: 'name', label: 'App name', kind: 'text' },
    { key: 'category', label: 'Category', kind: 'text' },
    { key: 'blurb', label: 'Blurb', kind: 'text' },
  ],
  'whop.affiliate.enable': [
    { key: 'ratePct', label: 'Commission', kind: 'number', suffix: '%', min: 5, max: 60, step: 5 },
    { key: 'cookieWindowDays', label: 'Cookie window', kind: 'number', suffix: 'days', min: 1, max: 180 },
  ],
  'whop.affiliate.set_rate': [
    { key: 'ratePct', label: 'Commission', kind: 'number', suffix: '%', min: 5, max: 60, step: 5 },
  ],
  'whop.bounty.create': [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'rewardPerConversion', label: 'Reward each', kind: 'number', prefix: '$', min: 1, max: 200 },
    { key: 'budget', label: 'Escrowed budget', kind: 'number', prefix: '$', min: 50, max: 50_000, step: 50 },
    { key: 'goal', label: 'Goal', kind: 'text' },
  ],
  'whop.ads.campaign.create': [
    { key: 'name', label: 'Campaign', kind: 'text' },
    {
      key: 'placement',
      label: 'Placement',
      kind: 'select',
      options: [
        { value: 'discover', label: 'Whop Discover' },
        { value: 'feed', label: 'Community feed' },
        { value: 'checkout', label: 'Checkout cross-sell' },
      ],
    },
    { key: 'dailyBudget', label: 'Daily budget', kind: 'number', prefix: '$', min: 10, max: 5000, step: 10 },
    { key: 'audience', label: 'Audience', kind: 'text' },
  ],
  'whop.ads.campaign.adjust_budget': [
    { key: 'newDailyBudget', label: 'New daily budget', kind: 'number', prefix: '$', min: 0, max: 5000, step: 10 },
  ],
  'whop.ads.campaign.pause': [],
  'whop.notification.send': [
    {
      key: 'audience',
      label: 'Audience',
      kind: 'select',
      options: [
        { value: 'whop_members', label: 'Everyone on Whop' },
        { value: 'plan_holders', label: 'Plan holders' },
        { value: 'merch_buyers', label: 'Merch buyers' },
      ],
    },
    { key: 'recipientCount', label: 'Recipients', kind: 'number', min: 1, max: 100_000 },
    { key: 'subject', label: 'Subject', kind: 'text' },
  ],
  'whop.merch.promo.create': [
    { key: 'code', label: 'Code', kind: 'text' },
    { key: 'discountPct', label: 'Discount', kind: 'number', suffix: '%', min: 5, max: 90, step: 5 },
    { key: 'durationDays', label: 'Runs for', kind: 'number', suffix: 'days', min: 1, max: 365 },
    { key: 'maxRedemptions', label: 'Max redemptions', kind: 'number', min: 1, max: 10_000 },
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
  'swolemates.nudge.campaign': [
    {
      key: 'audience',
      label: 'Audience',
      kind: 'select',
      options: [
        { value: 'trial_no_crew', label: 'Trial users with no crew' },
        { value: 'trial_expiring', label: 'Trials expiring in 3 days' },
        { value: 'signed_up_no_trial', label: 'Signed up, never started' },
        { value: 'lapsed_owners', label: 'Lapsed plan owners' },
        { value: 'riders_after_owner_lapse', label: 'Riders whose owner lapsed' },
      ],
    },
    { key: 'maxSends', label: 'Max sends', kind: 'number', min: 1, max: 50_000 },
    { key: 'days', label: 'Runs for', kind: 'number', suffix: 'days', min: 1, max: 90 },
  ],
}
