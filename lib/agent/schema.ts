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
const offerAudience = z.enum(['expired_trials', 'lapsed_payers', 'riders'])
const placement = z.enum(['search_results', 'search_tab', 'today_tab'])

/** Per-type params, so a malformed action can be dropped rather than trusted. */
const paramsByType = z.discriminatedUnion('type', [
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
  z.object({
    type: z.literal('swolemates.push.broadcast'),
    params: z.object({
      audience: z.union([nudgeAudience, z.literal('everyone')]),
      recipientCount: z.number().int().min(1).max(1_000_000),
      title: z.string().min(1).max(80),
      body: z.string().min(1).max(300),
    }),
  }),
  z.object({
    type: z.literal('swolemates.email.campaign'),
    params: z.object({
      audience: nudgeAudience,
      recipientCount: z.number().int().min(1).max(1_000_000),
      subject: z.string().min(1).max(120),
    }),
  }),
  z.object({
    type: z.literal('swolemates.offer_code.create'),
    params: z.object({
      name: z.string().min(1).max(40),
      discountPct: z.number().min(1).max(95),
      durationMonths: z.number().int().min(1).max(24),
      audience: offerAudience,
      maxRedemptions: z.number().int().min(1).max(100_000),
    }),
  }),
  z.object({
    type: z.literal('swolemates.pricing.update'),
    params: z.object({
      period: z.enum(['monthly', 'yearly']),
      newPrice: z.number().positive(),
      appliesTo: z.enum(['new_only', 'everyone']),
    }),
  }),
  z.object({
    type: z.literal('swolemates.trial.set_length'),
    params: z.object({ days: z.number().int().min(1).max(60) }),
  }),
  z.object({
    type: z.literal('swolemates.paywall.set_mode'),
    params: z.object({ mode: z.enum(['server14', 'day0']) }),
  }),
  z.object({
    type: z.literal('swolemates.badge.schedule_monthly'),
    params: z.object({
      months: z.number().int().min(1).max(12),
      coach: z.string().min(1).max(60),
    }),
  }),
  z.object({
    type: z.literal('asa.campaign.create'),
    params: z.object({
      name: z.string().min(1).max(80),
      placement,
      dailyBudget: z.number().positive(),
      keywordTheme: z.string().min(1).max(160),
    }),
  }),
  z.object({
    type: z.literal('asa.campaign.adjust_budget'),
    params: z.object({
      campaignId: z.string(),
      newDailyBudget: z.number().min(0),
    }),
  }),
  z.object({
    type: z.literal('asa.campaign.pause'),
    params: z.object({ campaignId: z.string() }),
  }),
  z.object({
    type: z.literal('whop.merch.promo.create'),
    params: z.object({
      code: z.string().min(1).max(32),
      discountPct: z.number().min(1).max(95),
      durationDays: z.number().int().min(1).max(365),
      maxRedemptions: z.number().int().min(1).max(100_000),
    }),
  }),
  z.object({
    type: z.literal('whop.merch.product.create'),
    params: z.object({ name: z.string().min(1).max(80), price: z.number().positive() }),
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
export const PARAMS_DOC = `"swolemates.nudge.campaign"          { fn: string (the edge function, e.g. "crew-invite-nudge"), audience: "trial_no_crew"|"trial_expiring"|"signed_up_no_trial"|"lapsed_owners"|"riders_after_owner_lapse", audienceSize: integer, maxSends: integer, days: 1-90 }
"swolemates.push.broadcast"          { audience: same list plus "everyone", recipientCount: integer, title: string, body: string }
"swolemates.email.campaign"          { audience: same list, recipientCount: integer, subject: string }
"swolemates.offer_code.create"       { name: string, discountPct: 1-95, durationMonths: 1-24, audience: "expired_trials"|"lapsed_payers"|"riders", maxRedemptions: integer }
"swolemates.pricing.update"          { period: "monthly"|"yearly", newPrice: number, appliesTo: "new_only"|"everyone" }
"swolemates.trial.set_length"        { days: 1-60 }
"swolemates.paywall.set_mode"        { mode: "server14"|"day0" }
"swolemates.badge.schedule_monthly"  { months: 1-12, coach: string }
"asa.campaign.create"                { name: string, placement: "search_results"|"search_tab"|"today_tab", dailyBudget: number, keywordTheme: string }
"asa.campaign.adjust_budget"         { campaignId: string, newDailyBudget: number }
"asa.campaign.pause"                 { campaignId: string }
"whop.merch.promo.create"            { code: string, discountPct: 1-95, durationDays: 1-365, maxRedemptions: integer }
"whop.merch.product.create"          { name: string, price: number }`
