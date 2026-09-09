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
  goalContribution?: { monthlyDelta: number; basis: string }
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
    goalContribution: cfg.goalContribution,
    conflict: cfg.conflict,
  } as ProposedAction
}

/* The biggest structural move available, and it is a Whop one. */
const sellOnWhop = act({
  id: 'p_whop_plan',
  type: 'whop.plan.create',
  params: { name: 'Swolemates — crew plan', price: 69.99, billing: 'yearly', seats: 5 },
  headline: 'Sell the crew plan on Whop as well as the App Store',
  rationale:
    'Every plan sold through Apple loses 15% before it reaches you. The same plan on Whop keeps all but the platform fee, and it puts a real web checkout in front of the people already buying merch from you. Nothing changes for existing subscribers.',
  evidence: [
    'Apple takes 15% of $69.99 under the Small Business Program',
    '4,475 paying plans, all billed through Apple today',
    '8,400 people reachable on Whop already',
  ],
  expectedImpact: {
    metric: 'Kept per plan',
    direction: 'up',
    estimate: '+$8.40 of every $69.99',
    confidence: 'high',
  },
  reversibility: 'instant',
  goalContribution: {
    monthlyDelta: 1240,
    basis:
      'If two fifths of the book renews on Whop instead of Apple, the fee difference on 4,475 plans is about $1,240/mo — revenue you already earned and were giving away.',
  },
  conflict: {
    label: 'Two billing systems, one entitlement',
    detail:
      'Crew seats and rider access are keyed to the Apple original transaction id. A plan bought on Whop has no such id, so entitlement, the rider cascade and the 3-day grace all need a second path before anyone can actually buy one.',
  },
})

/* The one you should modify. */
const affiliates = act({
  id: 'p_whop_affiliates',
  type: 'whop.affiliate.enable',
  params: { ratePct: 50, cookieWindowDays: 30 },
  headline: 'Turn on Whop affiliates at 50% recurring for fitness creators',
  rationale:
    'Whop is full of fitness creators who already sell to exactly the people a crew product needs, and they only get paid when a plan does. It moves acquisition from fixed cost to variable with nothing spent up front — which matters while Whop Ads CPA is drifting.',
  evidence: [
    'Affiliates: never enabled',
    'Whop Ads CPA $38, up from $27 over 30 days',
    '4,475 paying plans as a base to pay commission from',
  ],
  expectedImpact: {
    metric: 'Blended cost per plan',
    direction: 'down',
    estimate: '-$9 to -$16',
    confidence: 'medium',
  },
  reversibility: 'instant',
  goalContribution: {
    monthlyDelta: 2980,
    basis:
      'Roughly 220 referred plans over a quarter at $69.99, net of commission, is about $2,980/mo of added run-rate.',
  },
  conflict: {
    label: '50% is recurring, not one-off',
    detail:
      'A Whop affiliate rate applies to every renewal for as long as the member stays, so half of a $69.99 plan leaves every year, not just the first. The rate is the whole decision here.',
  },
})

const bounty = act({
  id: 'p_whop_bounty',
  type: 'whop.bounty.create',
  params: {
    title: 'Bring a crew',
    rewardPerConversion: 10,
    budget: 2400,
    goal: '240 verified paid plans',
  },
  headline: 'Open a $10-per-plan bounty on Whop capped at $2,400',
  rationale:
    'A bounty buys a plan at $10 against $38 on Whop Ads, and only pays on verified conversions. Whop escrows the pool up front, so the exposure is exactly the budget and nothing more.',
  evidence: [
    'Whop Ads CPA $38 vs a $10 bounty reward',
    'Bounties: never used',
    '8,400 people reachable on Whop',
  ],
  expectedImpact: {
    metric: 'New paying plans',
    direction: 'up',
    estimate: '+120 to +240',
    confidence: 'low',
  },
  reversibility: 'costly',
  goalContribution: {
    monthlyDelta: 1050,
    basis: '180 verified plans at $69.99, minus the $2,400 escrow, is about $1,050/mo of new run-rate.',
  },
})

const adsCut = act({
  id: 'p_whop_ads_rebudget',
  type: 'whop.ads.campaign.adjust_budget',
  params: { campaignId: 'whop_discover', newDailyBudget: 120 },
  headline: 'Cut Whop Discover from $180 to $120/day while CPA is drifting',
  rationale:
    'CPA on this campaign moved from $27 to $38 over 30 days with no creative change, so holding the budget flat buys the same plan for 41% more. Cutting to $120 keeps it in market and learning without funding the worse cohort.',
  evidence: [
    'CPA $38, up from $27 over 30 days',
    '$5,240 spent in 30 days for 138 plans',
    '$180/day current budget',
  ],
  expectedImpact: {
    metric: 'Daily ad spend',
    direction: 'down',
    estimate: '-$60/day',
    confidence: 'high',
  },
  reversibility: 'instant',
  goalContribution: {
    monthlyDelta: 0,
    basis:
      'Cutting spend adds no MRR. It stops $60/day buying plans at a CPA that no longer pays back inside a year, which protects the runway the goal needs.',
  },
})

/* The one you should reject — and the one thing here Whop cannot touch. */
const paywall = act({
  id: 'p_paywall_day0',
  type: 'swolemates.paywall.set_mode',
  params: { mode: 'day0' },
  headline: 'Move the in-app ask back to day 0 so trials start with a card on file',
  rationale:
    'Server trials never auto-convert — every one ends in a manual ask that 69% of people decline. A day-0 StoreKit gate collects the payment method up front and lets Apple renew silently, which is how almost every subscription app in the category monetises.',
  evidence: [
    'Server trial → paid 31.4%, down from 38.1%',
    '1,240 expired trials that never paid',
    '415 live trials, 92 expiring in the next 3 days',
  ],
  expectedImpact: {
    metric: 'Trial → paid',
    direction: 'up',
    estimate: '+8 to +14pt',
    confidence: 'medium',
  },
  reversibility: 'costly',
  goalContribution: {
    monthlyDelta: 2400,
    basis:
      'If conversion recovered to 45% on 30 trial starts a day, that is roughly 40 extra plans a month, about $2,400/mo added run-rate.',
  },
  conflict: {
    label: 'This is the change that was reverted on Aug 18',
    detail:
      'The day-0 wall was where the funnel died: of 268 non-invitee signups, 262 met it and 14% ever finished onboarding. Retention here is crew-gated and crews can only form between people already inside the app, so the wall suppressed the thing the product needs to work. The flag flips back instantly; the signups lost while it is on do not come back.',
  },
})

const watch: Observation = {
  kind: 'observation',
  id: 'p_watch_recap',
  headline: 'Do not read the conversion drop as demand — the day-14 ask is broken',
  rationale:
    'trial_recap() started timing out on Sep 5 for crews over three members, and when it fails PaywallView falls back to the generic pitch. That means the people who built the most during their trial — a streak, a full crew, a completed quest — are the ones being shown the pitch written for someone who did nothing. Any pricing or offer response right now would be treating an engineering failure as a demand problem.',
  evidence: [
    'trial_recap() timeouts: 68 events/24h, 61 users, spiking since Sep 5',
    'Server trial → paid 31.4%, was 38.1%',
    '92 trials expiring in the next 3 days will meet the broken ask',
  ],
  recommendation:
    'Fix the timeout first. Re-read server trial conversion on the cohort that expires after the fix lands, and hold any discount until then.',
  watchUntil: 'trial_recap() back under its timeout',
}

/**
 * Whop first. The structural move leads, then the growth surfaces by weight,
 * then the one lever Whop cannot reach, then what not to do.
 */
export const SEED_BRIEF: Brief = {
  generatedAtISO: `${TODAY}T06:04:00.000Z`,
  lede:
    'Server-trial conversion fell to 31.4% from 38.1% while trial_recap() started timing out on Sep 5 — but the bigger number is that every plan still bills through Apple, which takes 15% before you see it.',
  source: 'seed',
  proposals: [sellOnWhop, affiliates, bounty, adsCut, paywall, watch],
}

export function freshBrief(): Brief {
  return structuredClone(SEED_BRIEF)
}
