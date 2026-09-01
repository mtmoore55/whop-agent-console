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

export type BillingPeriod = 'monthly' | 'one_time'

export interface Product {
  id: string
  name: string
  price: number
  billing: BillingPeriod
  activeMembers: number
}

export interface AdCampaign {
  id: string
  name: string
  platform: 'meta' | 'tiktok' | 'x'
  dailyBudget: number
  status: 'active' | 'paused'
  cac: number
  cacPrior: number
  spend30d: number
  conversions30d: number
}

export interface Promo {
  id: string
  code: string
  discountPct: number
  durationDays: number
  audience: 'lapsed' | 'active' | 'all'
  maxRedemptions: number
  productId: string
  createdAtISO: string
}

export interface Bounty {
  id: string
  title: string
  rewardPerConversion: number
  budget: number
  goal: string
  status: 'open' | 'closed'
}

export interface Broadcast {
  id: string
  audience: 'lapsed' | 'active' | 'all'
  recipientCount: number
  subject: string
  sentAtISO: string
}

export interface CheckoutLink {
  id: string
  name: string
  productId: string
  discountPct: number
}

export interface Obligation {
  id: string
  label: string
  amount: number
  dueInDays: number
}

export interface Issue {
  id: string
  title: string
  events24h: number
  trend: 'spiking' | 'flat' | 'cooling'
  firstSeenISO: string
  note?: string
}

export interface BusinessState {
  business: {
    name: string
    handle: string
    tagline: string
    /** The in-fiction "today". Everything relative is measured from here. */
    todayISO: string
  }
  members: {
    active: number
    lapsed90d: number
  }
  revenue: {
    mrr: number
    mrrChangePct30d: number
    arpu: number
  }
  churn: {
    trailing30dPct: number
    priorPct: number
  }
  products: Product[]
  ads: {
    campaigns: AdCampaign[]
  }
  affiliates: {
    enabled: boolean
    ratePct: number | null
  }
  bounties: Bounty[]
  promos: Promo[]
  broadcasts: Broadcast[]
  checkoutLinks: CheckoutLink[]
  treasury: {
    /** Everything, settled or not. */
    balance: number
    /** Settled and immediately spendable. */
    settled: number
    /** Card volume inside the clearing window. */
    pendingClearance: number
    pendingClearsInDays: number
    /** Settled cash earning nothing. */
    idle: number
    inYield: number
    /** Days to pull money back out of the yield product. */
    yieldSettlementDays: number
    yieldAprPct: number
    /** Earliest date swept funds could be accessed again. */
    yieldAccessibleFromISO: string | null
  }
  obligations: Obligation[]
  issues: Issue[]
  /** Dollars the agent has already committed today, for the daily cap. */
  agentSpendToday: number
}

/* ------------------------------------------------------------------ */
/* Action schema                                                       */
/* ------------------------------------------------------------------ */

export type ActionType =
  | 'whop.pricing.update'
  | 'whop.promo.create'
  | 'whop.affiliate.enable'
  | 'whop.affiliate.set_rate'
  | 'whop.bounty.create'
  | 'whop.ads.campaign.create'
  | 'whop.ads.campaign.adjust_budget'
  | 'whop.ads.campaign.pause'
  | 'whop.treasury.move'
  | 'whop.payout.schedule'
  | 'whop.broadcast.send'
  | 'whop.product.create'
  | 'whop.checkout_link.create'

export const ACTION_TYPES: ActionType[] = [
  'whop.pricing.update',
  'whop.promo.create',
  'whop.affiliate.enable',
  'whop.affiliate.set_rate',
  'whop.bounty.create',
  'whop.ads.campaign.create',
  'whop.ads.campaign.adjust_budget',
  'whop.ads.campaign.pause',
  'whop.treasury.move',
  'whop.payout.schedule',
  'whop.broadcast.send',
  'whop.product.create',
  'whop.checkout_link.create',
]

export interface ActionParams {
  'whop.pricing.update': { productId: string; newPrice: number; appliesTo: 'new_members' | 'everyone' }
  'whop.promo.create': {
    code: string
    discountPct: number
    durationDays: number
    audience: 'lapsed' | 'active' | 'all'
    maxRedemptions: number
    productId: string
  }
  'whop.affiliate.enable': { ratePct: number; cookieWindowDays: number }
  'whop.affiliate.set_rate': { ratePct: number }
  'whop.bounty.create': { title: string; rewardPerConversion: number; budget: number; goal: string }
  'whop.ads.campaign.create': {
    name: string
    platform: 'meta' | 'tiktok' | 'x'
    dailyBudget: number
    objective: string
  }
  'whop.ads.campaign.adjust_budget': { campaignId: string; newDailyBudget: number }
  'whop.ads.campaign.pause': { campaignId: string }
  'whop.treasury.move': { amount: number; destination: 'yield' | 'balance' }
  'whop.payout.schedule': { recipient: string; amount: number; inDays: number }
  'whop.broadcast.send': {
    audience: 'lapsed' | 'active' | 'all'
    recipientCount: number
    subject: string
    body: string
  }
  'whop.product.create': { name: string; price: number; billing: BillingPeriod }
  'whop.checkout_link.create': { name: string; productId: string; discountPct: number }
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
