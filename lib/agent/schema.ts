import { z } from 'zod'
import { ACTION_TYPES } from '../types'

/**
 * What the model is allowed to return. Deliberately narrower than
 * `ProposedAction`: the model never supplies `maxCost`, `blastRadius` or
 * `requiresApproval`. Cost and blast radius are derived from the params it
 * chose; approval is the policy engine's call. The model proposes, nothing more.
 */

const actionTypeSchema = z.enum(ACTION_TYPES as [string, ...string[]])

const nudgeAudience = z.enum([
  'trial_no_crew',
  'trial_expiring',
  'signed_up_no_trial',
  'lapsed_owners',
  'riders_after_owner_lapse',
])
const placement = z.enum(['discover', 'feed', 'checkout'])
const promoParams = z.object({
  code: z.string().min(1).max(32),
  discountPct: z.number().min(1).max(95),
  durationDays: z.number().int().min(1).max(365),
  maxRedemptions: z.number().int().min(1).max(100_000),
})

/** Per-type params, so a malformed action can be dropped rather than trusted. */
const paramsByType = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('whop.plan.create'),
    params: z.object({
      name: z.string().min(1).max(80),
      price: z.number().positive(),
      billing: z.enum(['yearly', 'monthly']),
      seats: z.number().int().min(1).max(20),
    }),
  }),
  z.object({
    type: z.literal('whop.promo.create'),
    params: promoParams.extend({ appliesTo: z.enum(['plan', 'merch']) }),
  }),
  z.object({
    type: z.literal('whop.app.publish'),
    params: z.object({
      name: z.string().min(1).max(80),
      category: z.string().min(1).max(60),
      blurb: z.string().min(1).max(240),
    }),
  }),
  z.object({
    type: z.literal('whop.affiliate.enable'),
    params: z.object({
      ratePct: z.number().min(1).max(90),
      cookieWindowDays: z.number().int().min(1).max(365),
    }),
  }),
  z.object({
    type: z.literal('whop.affiliate.set_rate'),
    params: z.object({ ratePct: z.number().min(1).max(90) }),
  }),
  z.object({
    type: z.literal('whop.bounty.create'),
    params: z.object({
      title: z.string().min(1).max(80),
      rewardPerConversion: z.number().positive(),
      budget: z.number().positive(),
      goal: z.string().min(1).max(120),
    }),
  }),
  z.object({
    type: z.literal('whop.ads.campaign.create'),
    params: z.object({
      name: z.string().min(1).max(80),
      placement,
      dailyBudget: z.number().positive(),
      audience: z.string().min(1).max(160),
    }),
  }),
  z.object({
    type: z.literal('whop.ads.campaign.adjust_budget'),
    params: z.object({ campaignId: z.string(), newDailyBudget: z.number().min(0) }),
  }),
  z.object({
    type: z.literal('whop.ads.campaign.pause'),
    params: z.object({ campaignId: z.string() }),
  }),
  z.object({
    type: z.literal('whop.notification.send'),
    params: z.object({
      audience: z.enum(['whop_members', 'plan_holders', 'merch_buyers']),
      recipientCount: z.number().int().min(1).max(1_000_000),
      subject: z.string().min(1).max(120),
      body: z.string().min(1).max(400),
    }),
  }),
  z.object({ type: z.literal('whop.merch.promo.create'), params: promoParams }),
  z.object({
    type: z.literal('swolemates.paywall.set_mode'),
    params: z.object({ mode: z.enum(['server14', 'day0']) }),
  }),
  z.object({
    type: z.literal('swolemates.nudge.campaign'),
    params: z.object({
      fn: z.string().min(1).max(64),
      audience: nudgeAudience,
      audienceSize: z.number().int().min(1).max(1_000_000),
      maxSends: z.number().int().min(1).max(1_000_000),
      days: z.number().int().min(1).max(90),
    }),
  }),
])

const commonProposal = {
  headline: z.string().min(1).max(160),
  rationale: z.string().min(1).max(1400),
  evidence: z.array(z.string().min(1).max(200)).min(1).max(5),
}

export const modelActionSchema = z
  .object({
    kind: z.literal('action'),
    ...commonProposal,
    expectedImpact: z.object({
      metric: z.string().min(1).max(60),
      direction: z.enum(['up', 'down']),
      estimate: z.string().min(1).max(120),
      confidence: z.enum(['low', 'medium', 'high']),
    }),
    reversibility: z.enum(['instant', 'costly', 'irreversible']),
    conflict: z
      .object({ label: z.string().min(1).max(80), detail: z.string().min(1).max(500) })
      .optional(),
    // Optional on purpose. Dropping an otherwise-good proposal because the
    // model omitted an estimate would be the over-strict failure again.
    goalContribution: z
      .object({ monthlyDelta: z.number(), basis: z.string().min(1).max(240) })
      .optional(),
  })
  .and(paramsByType)

export const modelObservationSchema = z.object({
  kind: z.literal('observation'),
  ...commonProposal,
  recommendation: z.string().min(1).max(500),
  watchUntil: z.string().min(1).max(120),
})

/** The envelope. Proposals are validated one at a time so one bad apple
 *  does not take down an otherwise good brief. */
export const modelBriefSchema = z.object({
  lede: z.string().min(1).max(400),
  proposals: z.array(z.unknown()).min(1).max(12),
})

export type ModelAction = z.infer<typeof modelActionSchema>
export type ModelObservation = z.infer<typeof modelObservationSchema>

export { actionTypeSchema }

/**
 * The param contract, in the form the model is told about it.
 *
 * KEEP IN SYNC WITH `paramsByType` ABOVE. Without this in the system prompt
 * the model has to guess field names and enum values, and it guesses wrong —
 * measured: 3 of 4 proposals dropped, on `destination`, `audience`,
 * `recipientCount` and `subject`.
 */
export const PARAMS_DOC = `"whop.plan.create"                { name: string, price: number, billing: "yearly"|"monthly", seats: integer }
"whop.promo.create"               { code: string, discountPct: 1-95, durationDays: 1-365, maxRedemptions: integer, appliesTo: "plan"|"merch" }
"whop.app.publish"                { name: string, category: string, blurb: string }
"whop.affiliate.enable"           { ratePct: 1-90, cookieWindowDays: 1-365 }
"whop.affiliate.set_rate"         { ratePct: 1-90 }
"whop.bounty.create"              { title: string, rewardPerConversion: number, budget: number, goal: string }
"whop.ads.campaign.create"        { name: string, placement: "discover"|"feed"|"checkout", dailyBudget: number, audience: string }
"whop.ads.campaign.adjust_budget" { campaignId: string, newDailyBudget: number }
"whop.ads.campaign.pause"         { campaignId: string }
"whop.notification.send"          { audience: "whop_members"|"plan_holders"|"merch_buyers", recipientCount: integer, subject: string, body: string }
"whop.merch.promo.create"         { code: string, discountPct: 1-95, durationDays: 1-365, maxRedemptions: integer }
"swolemates.paywall.set_mode"     { mode: "server14"|"day0" }
"swolemates.nudge.campaign"       { fn: string (edge function, e.g. "crew-invite-nudge"), audience: "trial_no_crew"|"trial_expiring"|"signed_up_no_trial"|"lapsed_owners"|"riders_after_owner_lapse", audienceSize: integer, maxSends: integer, days: 1-90 }`
