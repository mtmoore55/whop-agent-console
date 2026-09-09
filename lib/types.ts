/**
 * Core domain types for the Whop Agent Console.
 *
 * `BusinessState` is what the agent reads. Actions mutate it.
 * Action params are typed per action type — the model's output is validated
 * against this shape and anything malformed is dropped (Milestone 2).
 */

/* ------------------------------------------------------------------ */
/* Business state                                                      */
/* ------------------------------------------------------------------ */

export type BillingPeriod = 'monthly' | 'yearly'

export interface WhopAdCampaign {
  id: string
  name: string
  placement: 'discover' | 'feed' | 'checkout'
  dailyBudget: number
  status: 'active' | 'paused'
  /** Cost per paying plan, not per install. */
  cpa: number
  cpaPrior: number
  spend30d: number
  installs30d: number
  plans30d: number
}

export interface OfferCode {
  id: string
  name: string
  discountPct: number
  durationMonths: number
  audience: 'expired_trials' | 'lapsed_payers' | 'riders'
  maxRedemptions: number
  redeemed: number
  createdAtISO: string
}

export interface NudgeCampaign {
  id: string
  /** The edge function that runs it. */
  fn: string
  audience: string
  audienceSize: number
  status: 'running' | 'stopped'
  startedAtISO: string
}

export interface MerchProduct {
  id: string
  name: string
  price: number
  soldLifetime: number
}

export interface MerchPromo {
  id: string
  code: string
  discountPct: number
  durationDays: number
  maxRedemptions: number
  createdAtISO: string
}

export interface Issue {
  id: string
  title: string
  events24h: number
  usersAffected24h: number
  trend: 'spiking' | 'flat' | 'cooling'
  firstSeenISO: string
  note?: string
}

/**
 * Swolemates, shaped the way the cofounder digest already measures it:
 * committed MRR (auto-renew ON) split from lapsing (auto-renew OFF but still
 * inside a paid period), Healthy Crews as the product north star, and the
 * trial as the thing conversion actually turns on.
 */
export interface BusinessState {
  business: {
    name: string
    handle: string
    tagline: string
    todayISO: string
  }
  revenue: {
    /** Auto-renew ON — revenue that actually recurs. This is the headline. */
    mrrCommitted: number
    /** Auto-renew OFF, still inside a paid period. Already-churned money. */
    mrrLapsing: number
    mrrChangePct30d: number
    arr: number
    yearlyPlans: number
    monthlyPlans: number
    yearlyPrice: number
    monthlyPrice: number
  }
  members: {
    payingPlans: number
    /** Crew members riding on an owner's seat. Not payers. */
    riders: number
    people: number
    signups24h: number
    dau: number
    wau: number
    mau: number
  }
  trials: {
    live: number
    started24h: number
    expiringNext3Days: number
    /** Matured 60-day cohort conversion, split by where the trial came from. */
    serverToPaidPct: number
    serverToPaidPctPrior: number
    storekitToPaidPct: number
    expiredNeverPaid: number
  }
  crews: {
    /** active14 >= 2 && active14 * 2 >= members.length */
    healthy: number
    emerging: number
    solo: number
    avgMembers: number
    inviteAcceptPct7d: number
    ownersWhoInvited: number
  }
  retention: {
    autoRenewOff24h: number
    payingCancels24h: number
    atRiskMrr: number
  }
  /** Whop Ads. Cost per paying plan, not per install. */
  ads: { campaigns: WhopAdCampaign[] }
  whop: {
    /** Whether the Swolemates plan is sold on Whop as well as the App Store. */
    planListed: boolean
    /** Apple's cut of a $69.99 plan under the Small Business Program. */
    appleFeePct: number
    whopFeePct: number
    affiliates: { enabled: boolean; ratePct: number | null }
    bounties: { id: string; title: string; budget: number; status: 'open' | 'closed' }[]
    appPublished: boolean
    /** People reachable through Whop itself — members of the merch store. */
    reachableMembers: number
  }
  appStore: {
    rating: number
    ratingCount: number
    version: string
    proceedsLastMonth: number
    installs30d: number
  }
  config: {
    trialDays: number
    /** app_config.trial_gate_mode — the kill switch back to the day-0 paywall. */
    paywallMode: 'server14' | 'day0'
    /** Months of monthly-badge artwork ready to ship. Alerts at 3 or fewer. */
    badgeArtworkRunwayMonths: number
  }
  offerCodes: OfferCode[]
  nudges: NudgeCampaign[]
  merch: {
    products: MerchProduct[]
    promos: MerchPromo[]
  }
  issues: Issue[]
  /** Dollars the agent has already committed today, for the daily cap. */
  agentSpendToday: number
}

/* ------------------------------------------------------------------ */
/* Action schema                                                       */
/* ------------------------------------------------------------------ */

export type ActionType =
  // Selling Swolemates on Whop
  | 'whop.plan.create'
  | 'whop.promo.create'
  | 'whop.app.publish'
  // Whop's growth surfaces
  | 'whop.affiliate.enable'
  | 'whop.affiliate.set_rate'
  | 'whop.bounty.create'
  | 'whop.ads.campaign.create'
  | 'whop.ads.campaign.adjust_budget'
  | 'whop.ads.campaign.pause'
  | 'whop.notification.send'
  | 'whop.merch.promo.create'
  // The app's own levers, for the things Whop cannot reach
  | 'swolemates.paywall.set_mode'
  | 'swolemates.nudge.campaign'

export const ACTION_TYPES: ActionType[] = [
  'whop.plan.create',
  'whop.promo.create',
  'whop.app.publish',
  'whop.affiliate.enable',
  'whop.affiliate.set_rate',
  'whop.bounty.create',
  'whop.ads.campaign.create',
  'whop.ads.campaign.adjust_budget',
  'whop.ads.campaign.pause',
  'whop.notification.send',
  'whop.merch.promo.create',
  'swolemates.paywall.set_mode',
  'swolemates.nudge.campaign',
]

export type NudgeAudience =
  | 'trial_no_crew'
  | 'trial_expiring'
  | 'signed_up_no_trial'
  | 'lapsed_owners'
  | 'riders_after_owner_lapse'

export interface ActionParams {
  'whop.plan.create': {
    name: string
    price: number
    billing: 'yearly' | 'monthly'
    /** Whop takes a platform fee; Apple takes 30% (15% under Small Business). */
    seats: number
  }
  'whop.promo.create': {
    code: string
    discountPct: number
    durationDays: number
    maxRedemptions: number
    appliesTo: 'plan' | 'merch'
  }
  'whop.app.publish': { name: string; category: string; blurb: string }
  'whop.affiliate.enable': { ratePct: number; cookieWindowDays: number }
  'whop.affiliate.set_rate': { ratePct: number }
  'whop.bounty.create': {
    title: string
    rewardPerConversion: number
    budget: number
    goal: string
  }
  'whop.ads.campaign.create': {
    name: string
    placement: 'discover' | 'feed' | 'checkout'
    dailyBudget: number
    audience: string
  }
  'whop.ads.campaign.adjust_budget': { campaignId: string; newDailyBudget: number }
  'whop.ads.campaign.pause': { campaignId: string }
  'whop.notification.send': {
    audience: 'whop_members' | 'plan_holders' | 'merch_buyers'
    recipientCount: number
    subject: string
    body: string
  }
  'whop.merch.promo.create': {
    code: string
    discountPct: number
    durationDays: number
    maxRedemptions: number
  }
  'swolemates.paywall.set_mode': { mode: 'server14' | 'day0' }
  'swolemates.nudge.campaign': {
    fn: string
    audience: NudgeAudience
    audienceSize: number
    maxSends: number
    days: number
  }
}

export type Reversibility = 'instant' | 'costly' | 'irreversible'
export type Confidence = 'low' | 'medium' | 'high'

export interface ExpectedImpact {
  metric: string
  direction: 'up' | 'down'
  estimate: string
  confidence: Confidence
}

interface ProposalBase {
  id: string
  headline: string
  rationale: string
  /** Which metrics in BusinessState drove this. */
  evidence: string[]
}

export type ProposedAction = {
  [K in ActionType]: ProposalBase & {
    kind: 'action'
    type: K
    params: ActionParams[K]
    expectedImpact: ExpectedImpact
    /** Worst-case dollars at risk. */
    maxCost: number
    reversibility: Reversibility
    /** How many humans see or feel this. */
    blastRadius: number
    /** Computed by the policy engine, never by the model. */
    requiresApproval: boolean
    /**
     * A conflict the console should surface next to the numbers this action
     * touches. Never used to auto-block — the human catches it.
     */
    conflict?: { label: string; detail: string }
    /**
     * The agent's estimate of what this moves the goal by, per month. Unlike
     * cost and blast radius this cannot be derived from the params, so it is
     * the model's guess and is labelled as one.
     */
    goalContribution?: { monthlyDelta: number; basis: string }
  }
}[ActionType]

export interface Observation extends ProposalBase {
  kind: 'observation'
  /** What to do instead of acting. */
  recommendation: string
  watchUntil: string
}

export type Proposal = ProposedAction | Observation

/* ------------------------------------------------------------------ */
/* Goal                                                                */
/* ------------------------------------------------------------------ */

/**
 * The number the business is actually trying to reach. It is not decoration:
 * the agent is told the gap and the pace, and every action it proposes has to
 * say what it contributes toward closing that gap.
 */
export interface Goal {
  metric: 'mrr'
  label: string
  /** Target value of the metric, in dollars per month. */
  target: number
  /** The date the target is meant to be hit. */
  byISO: string
}

/* ------------------------------------------------------------------ */
/* Policy                                                              */
/* ------------------------------------------------------------------ */

export type PolicyStance = 'auto' | 'ask' | 'never'

export interface Policy {
  perType: Record<ActionType, PolicyStance>
  dailySpendCapUSD: number
  perActionCostCeilingUSD: number
  broadcastCeiling: number
}

export interface PolicyReason {
  rule: string
  detail: string
}

export interface PolicyVerdict {
  decision: 'auto' | 'ask' | 'blocked'
  requiresApproval: boolean
  /** Every rule that had something to say, in evaluation order. */
  reasons: PolicyReason[]
  blockedBy?: PolicyReason
}

/* ------------------------------------------------------------------ */
/* Lifecycle + log                                                     */
/* ------------------------------------------------------------------ */

export type ProposalStatus =
  | 'pending'
  | 'executing'
  | 'executed'
  | 'rejected'

export interface ReceiptLine {
  label: string
  before: string
  after: string
}

export interface LogEntry {
  id: string
  proposalId: string
  type: ActionType
  headline: string
  /** proposed -> approved | modified | rejected -> executed */
  lifecycle: ('proposed' | 'approved' | 'modified' | 'rejected' | 'executed' | 'overridden')[]
  params: Record<string, unknown>
  receipt: ReceiptLine[]
  reversibility: Reversibility
  maxCost: number
  atISO: string
  rejectionReason?: string
  /** Full pre-execution snapshot — makes Undo (M3) a state swap. */
  stateBefore?: BusinessState
  undone?: boolean
}
