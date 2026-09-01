import { derive } from './derive'
import { DEFAULT_POLICY, evaluate } from './policy'
import { SEED_STATE, TODAY } from './seed'
import type {
  ActionParams,
  ActionType,
  ExpectedImpact,
  Observation,
  Proposal,
  ProposedAction,
  Reversibility,
} from './types'

export interface Brief {
  generatedAtISO: string
  /** One sentence. The thing that changed. Not a metric dump. */
  lede: string
  source: 'seed' | 'live' | 'cached'
  proposals: Proposal[]
}

function act<K extends ActionType>(cfg: {
  id: string
  type: K
  params: ActionParams[K]
  headline: string
  rationale: string
  evidence: string[]
  expectedImpact: ExpectedImpact
  reversibility: Reversibility
  conflict?: { label: string; detail: string }
}): ProposedAction {
  const { maxCost, blastRadius } = derive(cfg.type, cfg.params, SEED_STATE)
  const verdict = evaluate(
    { type: cfg.type, maxCost, reversibility: cfg.reversibility, blastRadius },
    DEFAULT_POLICY,
    SEED_STATE.agentSpendToday,
  )
  return {
    kind: 'action',
    id: cfg.id,
    type: cfg.type,
    params: cfg.params,
    headline: cfg.headline,
    rationale: cfg.rationale,
    evidence: cfg.evidence,
    expectedImpact: cfg.expectedImpact,
    maxCost,
    blastRadius,
    reversibility: cfg.reversibility,
    requiresApproval: verdict.requiresApproval,
    conflict: cfg.conflict,
  } as ProposedAction
}

/* The one you should reject. */
const treasury = act({
  id: 'p_treasury_sweep',
  type: 'whop.treasury.move',
  params: { amount: 61000, destination: 'yield' },
  headline: 'Sweep $61,000 of idle cash into Treasury yield at 4.15%',
  rationale:
    'Sixty-one thousand dollars of settled cash has sat outside yield all quarter earning exactly nothing. At 4.15% that is about $211 a month you are handing back to your processor. It is one transfer and the position accrues daily.',
  evidence: [
    '$61,000 idle, $0 in Treasury yield',
    'Settled balance $65,720 of $84,120 total',
    'Treasury yield paying 4.15% APR',
  ],
  expectedImpact: { metric: 'Interest income', direction: 'up', estimate: '+$211/mo', confidence: 'high' },
  reversibility: 'costly',
  conflict: {
    label: 'Payout due in 6 days',
    detail:
      'Money in yield takes longer to come back out than you have before the next payout lands, and most of what stays behind is still inside a clearing window. Check what is actually settled the day the payout runs.',
  },
})

/* The one you should modify. */
const promo = act({
  id: 'p_winback_promo',
  type: 'whop.promo.create',
  params: {
    code: 'COMEBACK40',
    discountPct: 40,
    durationDays: 90,
    audience: 'lapsed',
    maxRedemptions: 312,
    productId: 'prod_community',
  },
  headline: 'Win back lapsed members with 40% off for 90 days',
  rationale:
    'Churn is running at 8.4% against 6.2% a month ago and 312 people have lapsed in the last 90 days. A deep, long discount is the fastest lever to pull a chunk of them back before they resubscribe to someone else.',
  evidence: [
    'Trailing 30-day churn 8.4%, up from 6.2%',
    '312 lapsed members in the last 90 days',
    'Community priced at $32/mo',
  ],
  expectedImpact: {
    metric: 'Reactivated members',
    direction: 'up',
    estimate: '+35 to +60',
    confidence: 'medium',
  },
  reversibility: 'costly',
  conflict: {
    label: 'The code will leak',
    detail:
      'Promo codes are not member-locked. Every active member paying full price can find and use this one, so the discount, the run length and the redemption cap are the only things containing it.',
  },
})

const affiliate = act({
  id: 'p_affiliate_on',
  type: 'whop.affiliate.enable',
  params: { ratePct: 25, cookieWindowDays: 30 },
  headline: 'Turn on affiliates at 25% recurring with a 30-day cookie',
  rationale:
    'Affiliates have never been enabled while paid CAC has drifted from $44 to $61. A recurring 25% pays only on revenue that actually arrives, which moves acquisition from fixed cost to variable cost with nothing spent up front.',
  evidence: [
    'Affiliates: never enabled',
    'Meta CAC $61, up from $44 over 30 days',
    '1,847 active members as a referral base',
  ],
  expectedImpact: { metric: 'Blended CAC', direction: 'down', estimate: '-$8 to -$14', confidence: 'medium' },
  reversibility: 'instant',
})

const bounty = act({
  id: 'p_referral_bounty',
  type: 'whop.bounty.create',
  params: {
    title: 'Bring a trader',
    rewardPerConversion: 25,
    budget: 750,
    goal: '30 verified paid referrals',
  },
  headline: 'Open a $25-per-referral bounty capped at $750',
  rationale:
    'A bounty buys members at $25 against $61 on Meta, and it only pays on verified conversions. Capped at $750 it is a cheap read on whether your own members will sell for you before you spend more on ads.',
  evidence: [
    'Meta CAC $61 vs $25 bounty reward',
    'Bounties: never used',
    '1,847 active members who would see the listing',
  ],
  expectedImpact: { metric: 'New paid members', direction: 'up', estimate: '+10 to +30', confidence: 'low' },
  reversibility: 'costly',
})

const ads = act({
  id: 'p_meta_rebudget',
  type: 'whop.ads.campaign.adjust_budget',
  params: { campaignId: 'camp_meta_1', newDailyBudget: 140 },
  headline: 'Cut the Meta campaign from $240 to $140/day while CAC is drifting',
  rationale:
    'CAC on this campaign moved from $44 to $61 over 30 days with no creative change, so holding the budget flat buys the same member for 39% more. Cutting to $140 keeps the campaign in market and learning without funding the worse cohort.',
  evidence: [
    'Meta CAC $61, up from $44 over 30 days',
    '$240/day budget, $7,140 spent in 30 days',
    '117 conversions in 30 days',
  ],
  expectedImpact: { metric: 'Daily ad spend', direction: 'down', estimate: '-$100/day', confidence: 'high' },
  reversibility: 'instant',
})

const watch: Observation = {
  kind: 'observation',
  id: 'p_watch_checkout',
  headline: 'Do not respond to the mobile conversion dip yet — it looks like a bug',
  rationale:
    'Checkout webhook timeouts are spiking at 41 events in 24 hours and completed mobile checkouts fell in the same window. Any pricing or promo response right now would be treating an engineering failure as a demand problem, and it would poison the churn read for the next 30 days.',
  evidence: [
    'Checkout webhook timeouts: 41 events/24h, spiking',
    'First seen Aug 30, correlated with mobile checkout drop',
    '3 open issues total',
  ],
  recommendation:
    'Ship the webhook fix first. Re-read mobile conversion 24 hours after errors return to baseline, then decide.',
  watchUntil: 'Webhook errors back to baseline',
}

/** Ordered by decision weight — the money you could lose descends down the page. */
export const SEED_BRIEF: Brief = {
  generatedAtISO: `${TODAY}T07:12:00.000Z`,
  lede:
    'Churn jumped to 8.4% from 6.2% while your checkout started timing out on mobile — the two are probably the same story, so treat the revenue number as unreliable until the webhook is fixed.',
  source: 'seed',
  proposals: [treasury, promo, affiliate, bounty, ads, watch],
}

export function freshBrief(): Brief {
  return structuredClone(SEED_BRIEF)
}
