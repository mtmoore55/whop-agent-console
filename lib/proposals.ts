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

/* The one you should reject. */
const paywall = act({
  id: 'p_paywall_day0',
  type: 'swolemates.paywall.set_mode',
  params: { mode: 'day0' },
  headline: 'Move the ask back to day 0 so trials start with a card on file',
  rationale:
    'Server trials never auto-convert — every one of them ends in a manual ask that 69% of people decline. A day-0 StoreKit gate collects the payment method up front and lets Apple renew silently, which is how almost every subscription app in the category monetises.',
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

/* The one you should modify. */
const offer = act({
  id: 'p_offer_winback',
  type: 'swolemates.offer_code.create',
  params: {
    name: 'COMEBACK50',
    discountPct: 50,
    durationMonths: 12,
    audience: 'expired_trials',
    maxRedemptions: 1240,
  },
  headline: 'Win back 1,240 expired trials with 50% off for a year',
  rationale:
    'These people finished a 14-day trial and said no at the ask. They already built a streak and in many cases a crew, so the product has been proven to them — the price is the only open question. A deep offer code is the fastest way to test that.',
  evidence: [
    '1,240 trials expired without paying',
    'Server trial → paid 31.4%, down from 38.1%',
    'Yearly plan $69.99, about $5.83/mo',
  ],
  expectedImpact: {
    metric: 'Recovered plans',
    direction: 'up',
    estimate: '+90 to +160',
    confidence: 'medium',
  },
  reversibility: 'costly',
  goalContribution: {
    monthlyDelta: 1930,
    basis:
      'About 120 redemptions at half price now, renewing at full price later, is roughly $1,930/mo of run-rate once the discount lapses.',
  },
  conflict: {
    label: 'Apple offer codes are shareable',
    detail:
      'A one-time code can be posted anywhere and redeemed by anyone eligible, including people who would have paid full price. The discount, the duration and the redemption cap are the only things containing it.',
  },
})

const crewNudge = act({
  id: 'p_crew_nudge',
  type: 'swolemates.nudge.campaign',
  params: {
    fn: 'crew-invite-nudge',
    audience: 'trial_no_crew',
    audienceSize: 1180,
    maxSends: 1180,
    days: 10,
  },
  headline: 'Run crew-invite-nudge at the 1,180 trials with nobody accepted yet',
  rationale:
    'A trial user with an empty crew is using a single-player version of a social product, and they convert worst. Two accepted Swolemates by day 3 is the activation bar, and this cohort has none. The campaign is bounded and stops the moment someone accepts.',
  evidence: [
    '1,180 live trials with no accepted crew invite',
    'Crew invite accept rate 38.6% over 7 days',
    '1,795 healthy crews of 4,475 plans',
  ],
  expectedImpact: {
    metric: 'Healthy crews',
    direction: 'up',
    estimate: '+120 to +200',
    confidence: 'medium',
  },
  reversibility: 'instant',
  goalContribution: {
    monthlyDelta: 2760,
    basis:
      'Crew activation is the primary trial-to-paid motion. Moving 160 trials into a real crew at the cohort conversion rate is roughly 50 extra plans a month, about $2,760/mo.',
  },
})

const asaNew = act({
  id: 'p_asa_today_tab',
  type: 'asa.campaign.create',
  params: {
    name: 'Today tab — New Year habit',
    placement: 'today_tab',
    dailyBudget: 600,
    keywordTheme: 'habit tracker, workout streak, accountability',
  },
  headline: 'Open a $600/day Today-tab campaign ahead of January',
  rationale:
    'Search results is the only placement running and its CPA has drifted from $29 to $41. Today tab reaches people who are not already searching for a fitness app, which is where a habit product should be shopping in the run-up to January.',
  evidence: [
    'One active campaign, $220/day on search results',
    'CPA $41, up from $29 over 30 days',
    '9,400 installs in 30 days',
  ],
  expectedImpact: {
    metric: 'New paying plans',
    direction: 'up',
    estimate: '+180 to +320/mo',
    confidence: 'low',
  },
  reversibility: 'instant',
  goalContribution: {
    monthlyDelta: 1150,
    basis: 'At a $45 blended CPA, $600/day buys roughly 200 plans a month, about $1,150/mo added.',
  },
})

const asaCut = act({
  id: 'p_asa_rebudget',
  type: 'asa.campaign.adjust_budget',
  params: { campaignId: 'asa_search_core', newDailyBudget: 140 },
  headline: 'Cut search results from $220 to $140/day while CPA is drifting',
  rationale:
    'CPA on this campaign moved from $29 to $41 over 30 days with no creative change, so holding the budget flat buys the same plan for 41% more. Cutting to $140 keeps it in market and learning without funding the worse cohort.',
  evidence: [
    'CPA $41, up from $29 over 30 days',
    '$6,180 spent in 30 days for 151 plans',
    '$220/day current budget',
  ],
  expectedImpact: {
    metric: 'Daily ad spend',
    direction: 'down',
    estimate: '-$80/day',
    confidence: 'high',
  },
  reversibility: 'instant',
  goalContribution: {
    monthlyDelta: 0,
    basis:
      'Cutting spend adds no MRR. It stops $80/day buying plans at a CPA that no longer pays back inside a year, which protects the runway the goal needs.',
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
    'Fix the timeout first. Re-read server trial conversion on the cohort that expires after the fix lands, and hold the offer code until then.',
  watchUntil: 'trial_recap() back under its timeout',
}

/** Ordered by decision weight — the money you could lose descends down the page. */
export const SEED_BRIEF: Brief = {
  generatedAtISO: `${TODAY}T06:04:00.000Z`,
  lede:
    'Server-trial conversion fell to 31.4% from 38.1% and trial_recap() started timing out on Sep 5 — the personalised day-14 ask is silently falling back to the generic pitch, so treat the conversion drop as a bug until that is fixed.',
  source: 'seed',
  proposals: [offer, paywall, crewNudge, asaNew, asaCut, watch],
}

export function freshBrief(): Brief {
  return structuredClone(SEED_BRIEF)
}
