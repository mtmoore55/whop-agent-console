import type {
  ActionType,
  Policy,
  PolicyReason,
  PolicyVerdict,
  ProposedAction,
} from './types'
import { count, money } from './format'

/**
 * The policy engine.
 *
 * `requiresApproval` is never decided by the model. It is computed here from
 * the action's cost, reversibility and blast radius against the owner's
 * standing policy. The model proposes; the policy decides what needs a human.
 */

export const ACTION_LABELS: Record<ActionType, string> = {
  'whop.plan.create': 'Sell the plan on Whop',
  'whop.promo.create': 'Create Whop promos',
  'whop.app.publish': 'Publish the Whop app',
  'whop.affiliate.enable': 'Enable Whop affiliates',
  'whop.affiliate.set_rate': 'Set the affiliate rate',
  'whop.bounty.create': 'Create Whop bounties',
  'whop.ads.campaign.create': 'Launch Whop Ads campaigns',
  'whop.ads.campaign.adjust_budget': 'Adjust Whop Ads budgets',
  'whop.ads.campaign.pause': 'Pause Whop Ads campaigns',
  'whop.notification.send': 'Message Whop members',
  'whop.merch.promo.create': 'Create merch promos',
  'swolemates.paywall.set_mode': 'Change the in-app paywall gate',
  'swolemates.nudge.campaign': 'Run in-app nudge campaigns',
}

/**
 * The daily cap governs *agent spend* — dollars that actually leave. Ads spend
 * cash and a bounty escrows its reward pool; a promo gives up revenue it never
 * had, and a nudge costs a push notification.
 */
export const SPEND_ACTION_TYPES: ReadonlySet<ActionType> = new Set<ActionType>([
  'whop.ads.campaign.create',
  'whop.ads.campaign.adjust_budget',
  'whop.bounty.create',
])

export function countsAsSpend(type: ActionType): boolean {
  return SPEND_ACTION_TYPES.has(type)
}

export const DEFAULT_POLICY: Policy = {
  perType: {
    'whop.plan.create': 'ask',
    'whop.promo.create': 'ask',
    'whop.app.publish': 'ask',
    'whop.affiliate.enable': 'ask',
    'whop.affiliate.set_rate': 'auto',
    'whop.bounty.create': 'ask',
    'whop.ads.campaign.create': 'ask',
    'whop.ads.campaign.adjust_budget': 'auto',
    'whop.ads.campaign.pause': 'auto',
    'whop.notification.send': 'ask',
    'whop.merch.promo.create': 'ask',
    'swolemates.paywall.set_mode': 'ask',
    'swolemates.nudge.campaign': 'ask',
  },
  dailySpendCapUSD: 400,
  perActionCostCeilingUSD: 250,
  broadcastCeiling: 500,
}

/**
 * Rules, in order. The first blocking rule wins; forcing rules accumulate.
 *   1. type is `never`                          -> blocked
 *   2. spend would break the daily spend cap     -> blocked
 *   3. cost over the per-action ceiling         -> forces ask
 *   4. blast radius over the broadcast ceiling  -> forces ask
 *   5. irreversible                             -> forces ask
 *   6. otherwise the per-type stance decides
 */
export function evaluate(
  action: Pick<ProposedAction, 'type' | 'maxCost' | 'reversibility' | 'blastRadius'>,
  policy: Policy,
  spentToday: number,
): PolicyVerdict {
  const reasons: PolicyReason[] = []
  const stance = policy.perType[action.type]
  const label = ACTION_LABELS[action.type]

  if (stance === 'never') {
    const blockedBy: PolicyReason = {
      rule: 'Never allowed',
      detail: `Your policy is set to never for "${label}".`,
    }
    return { decision: 'blocked', requiresApproval: true, reasons: [blockedBy], blockedBy }
  }

  if (
    countsAsSpend(action.type) &&
    action.maxCost > 0 &&
    spentToday + action.maxCost > policy.dailySpendCapUSD
  ) {
    const blockedBy: PolicyReason = {
      rule: 'Daily spend cap',
      detail: `${money(action.maxCost)} would put the agent at ${money(
        spentToday + action.maxCost,
      )} against a ${money(policy.dailySpendCapUSD)}/day cap.`,
    }
    return { decision: 'blocked', requiresApproval: true, reasons: [blockedBy], blockedBy }
  }

  let forcesApproval = false

  if (action.maxCost > policy.perActionCostCeilingUSD) {
    forcesApproval = true
    reasons.push({
      rule: 'Per-action ceiling',
      detail: `${money(action.maxCost)} is over your ${money(
        policy.perActionCostCeilingUSD,
      )} per-action ceiling.`,
    })
  }

  if (action.blastRadius > policy.broadcastCeiling) {
    forcesApproval = true
    reasons.push({
      rule: 'Broadcast ceiling',
      detail: `${count(action.blastRadius)} people would see or feel this, over your limit of ${count(
        policy.broadcastCeiling,
      )}.`,
    })
  }

  if (action.reversibility === 'irreversible') {
    forcesApproval = true
    reasons.push({
      rule: 'Irreversible',
      detail: 'Nothing irreversible runs without a human.',
    })
  }

  if (!forcesApproval && stance === 'auto') {
    reasons.push({
      rule: 'Auto-approved',
      detail: `"${label}" is set to auto and this is inside every limit.`,
    })
    return { decision: 'auto', requiresApproval: false, reasons }
  }

  if (!forcesApproval) {
    reasons.push({
      rule: 'Ask me',
      detail: `Your policy is set to ask for "${label}".`,
    })
  }

  return { decision: 'ask', requiresApproval: true, reasons }
}

/** Plain-language rendering of the current policy. */
export function policySentence(policy: Policy): string {
  const never = (Object.keys(policy.perType) as ActionType[])
    .filter((t) => policy.perType[t] === 'never')
    .map((t) => ACTION_LABELS[t].toLowerCase())

  const clauses = [
    `Your agent can spend up to ${money(policy.dailySpendCapUSD)}/day without asking`,
  ]
  if (never.length) clauses.push(`can't ${never.join(' or ')}`)
  clauses.push(`can't touch more than ${count(policy.broadcastCeiling)} members at once`)

  const last = clauses.pop()
  return `${clauses.join(', ')}, and ${last}.`
}
