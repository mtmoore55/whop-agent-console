import type { ActionParams, ActionType, BusinessState } from './types'

/**
 * Cost and blast radius are *derived* from an action's real parameters, never
 * asserted. That is what makes Modify meaningful: drop the discount from 40%
 * to 20% and the worst case at risk moves with it, on screen, immediately.
 */

const COMMUNITY = 'prod_community'

function priceOf(state: BusinessState, productId: string): number {
  return state.products.find((p) => p.id === productId)?.price ?? 32
}

function audienceSize(state: BusinessState, audience: 'lapsed' | 'active' | 'all'): number {
  if (audience === 'lapsed') return state.members.lapsed90d
  if (audience === 'active') return state.members.active
  return state.members.active + state.members.lapsed90d
}

/** Rough 90-day revenue an affiliate program could plausibly touch. */
function referredRevenue90d(state: BusinessState): number {
  const referredMembers = Math.round(state.members.active * 0.025)
  return referredMembers * priceOf(state, COMMUNITY) * 3
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
    case 'whop.pricing.update': {
      const p = params as ActionParams['whop.pricing.update']
      const product = state.products.find((x) => x.id === p.productId)
      const delta = Math.abs((product?.price ?? 0) - p.newPrice)
      const affected = p.appliesTo === 'everyone' ? (product?.activeMembers ?? 0) : 0
      return { maxCost: Math.round(delta * affected), blastRadius: affected }
    }
    case 'whop.promo.create': {
      const p = params as ActionParams['whop.promo.create']
      const months = Math.max(1, Math.ceil(p.durationDays / 30))
      const perMonth = priceOf(state, p.productId) * (p.discountPct / 100)
      return {
        maxCost: Math.round(p.maxRedemptions * perMonth * months),
        blastRadius: audienceSize(state, p.audience),
      }
    }
    case 'whop.affiliate.enable': {
      const p = params as ActionParams['whop.affiliate.enable']
      return { maxCost: Math.round(referredRevenue90d(state) * (p.ratePct / 100)), blastRadius: 0 }
    }
    case 'whop.affiliate.set_rate': {
      const p = params as ActionParams['whop.affiliate.set_rate']
      return { maxCost: Math.round(referredRevenue90d(state) * (p.ratePct / 100)), blastRadius: 0 }
    }
    case 'whop.bounty.create': {
      const p = params as ActionParams['whop.bounty.create']
      return { maxCost: Math.round(p.budget), blastRadius: state.members.active }
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
    case 'whop.treasury.move': {
      const p = params as ActionParams['whop.treasury.move']
      return { maxCost: Math.round(p.amount), blastRadius: 0 }
    }
    case 'whop.payout.schedule': {
      const p = params as ActionParams['whop.payout.schedule']
      return { maxCost: Math.round(p.amount), blastRadius: 1 }
    }
    case 'whop.broadcast.send': {
      const p = params as ActionParams['whop.broadcast.send']
      return { maxCost: 0, blastRadius: p.recipientCount }
    }
    case 'whop.product.create':
      return { maxCost: 0, blastRadius: 0 }
    case 'whop.checkout_link.create':
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

export const PARAM_FIELDS: Record<ActionType, FieldDef[]> = {
  'whop.pricing.update': [
    { key: 'newPrice', label: 'New price', kind: 'number', prefix: '$', min: 1, max: 500 },
    {
      key: 'appliesTo',
      label: 'Applies to',
      kind: 'select',
      options: [
        { value: 'new_members', label: 'New members only' },
        { value: 'everyone', label: 'Everyone' },
      ],
    },
  ],
  'whop.promo.create': [
    { key: 'code', label: 'Code', kind: 'text' },
    { key: 'discountPct', label: 'Discount', kind: 'number', suffix: '%', min: 5, max: 90, step: 5 },
    { key: 'durationDays', label: 'Runs for', kind: 'number', suffix: 'days', min: 7, max: 365, step: 1 },
    {
      key: 'audience',
      label: 'Audience',
      kind: 'select',
      options: [
        { value: 'lapsed', label: 'Lapsed members (312)' },
        { value: 'active', label: 'Active members (1,847)' },
        { value: 'all', label: 'Everyone (2,159)' },
      ],
    },
    {
      key: 'maxRedemptions',
      label: 'Max redemptions',
      kind: 'number',
      min: 1,
      max: 3000,
      help: 'Caps how far the code can spread if it leaks.',
    },
  ],
  'whop.affiliate.enable': [
    { key: 'ratePct', label: 'Commission', kind: 'number', suffix: '%', min: 5, max: 60, step: 1 },
    { key: 'cookieWindowDays', label: 'Cookie window', kind: 'number', suffix: 'days', min: 1, max: 120 },
  ],
  'whop.affiliate.set_rate': [
    { key: 'ratePct', label: 'Commission', kind: 'number', suffix: '%', min: 5, max: 60, step: 1 },
  ],
  'whop.bounty.create': [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'rewardPerConversion', label: 'Reward each', kind: 'number', prefix: '$', min: 1, max: 500 },
    { key: 'budget', label: 'Total budget', kind: 'number', prefix: '$', min: 25, max: 10000, step: 25 },
    { key: 'goal', label: 'Goal', kind: 'text' },
  ],
  'whop.ads.campaign.create': [
    { key: 'name', label: 'Campaign', kind: 'text' },
    {
      key: 'platform',
      label: 'Platform',
      kind: 'select',
      options: [
        { value: 'meta', label: 'Meta' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'x', label: 'X' },
      ],
    },
    { key: 'dailyBudget', label: 'Daily budget', kind: 'number', prefix: '$', min: 10, max: 2000, step: 10 },
  ],
  'whop.ads.campaign.adjust_budget': [
    { key: 'newDailyBudget', label: 'New daily budget', kind: 'number', prefix: '$', min: 0, max: 2000, step: 10 },
  ],
  'whop.ads.campaign.pause': [],
  'whop.treasury.move': [
    { key: 'amount', label: 'Amount', kind: 'number', prefix: '$', min: 0, max: 200000, step: 500 },
    {
      key: 'destination',
      label: 'Destination',
      kind: 'select',
      options: [
        { value: 'yield', label: 'Treasury yield' },
        { value: 'balance', label: 'Back to balance' },
      ],
    },
  ],
  'whop.payout.schedule': [
    { key: 'recipient', label: 'Recipient', kind: 'text' },
    { key: 'amount', label: 'Amount', kind: 'number', prefix: '$', min: 1, max: 100000 },
    { key: 'inDays', label: 'In', kind: 'number', suffix: 'days', min: 0, max: 90 },
  ],
  'whop.broadcast.send': [
    {
      key: 'audience',
      label: 'Audience',
      kind: 'select',
      options: [
        { value: 'lapsed', label: 'Lapsed members' },
        { value: 'active', label: 'Active members' },
        { value: 'all', label: 'Everyone' },
      ],
    },
    { key: 'recipientCount', label: 'Recipients', kind: 'number', min: 1, max: 3000 },
    { key: 'subject', label: 'Subject', kind: 'text' },
  ],
  'whop.product.create': [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'price', label: 'Price', kind: 'number', prefix: '$', min: 1, max: 5000 },
    {
      key: 'billing',
      label: 'Billing',
      kind: 'select',
      options: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'one_time', label: 'One time' },
      ],
    },
  ],
  'whop.checkout_link.create': [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'discountPct', label: 'Discount', kind: 'number', suffix: '%', min: 0, max: 90 },
  ],
}
