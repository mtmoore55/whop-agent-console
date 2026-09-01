import { z } from 'zod'
import { ACTION_TYPES } from '../types'

/**
 * What the model is allowed to return. Deliberately narrower than
 * `ProposedAction`: the model never supplies `maxCost`, `blastRadius` or
 * `requiresApproval`. Cost and blast radius are derived from the params it
 * chose; approval is the policy engine's call. The model proposes, nothing more.
 */

const actionTypeSchema = z.enum(ACTION_TYPES as [string, ...string[]])

const audience = z.enum(['lapsed', 'active', 'all'])
const platform = z.enum(['meta', 'tiktok', 'x'])

/** Per-type params, so a malformed action can be dropped rather than trusted. */
const paramsByType = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('whop.pricing.update'),
    params: z.object({
      productId: z.string(),
      newPrice: z.number().positive(),
      appliesTo: z.enum(['new_members', 'everyone']),
    }),
  }),
  z.object({
    type: z.literal('whop.promo.create'),
    params: z.object({
      code: z.string().min(1).max(32),
      discountPct: z.number().min(1).max(95),
      durationDays: z.number().int().min(1).max(365),
      audience,
      maxRedemptions: z.number().int().min(1).max(100_000),
      productId: z.string(),
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
      title: z.string().min(1),
      rewardPerConversion: z.number().positive(),
      budget: z.number().positive(),
      goal: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal('whop.ads.campaign.create'),
    params: z.object({
      name: z.string().min(1),
      platform,
      dailyBudget: z.number().positive(),
      objective: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal('whop.ads.campaign.adjust_budget'),
    params: z.object({
      campaignId: z.string(),
      newDailyBudget: z.number().min(0),
    }),
  }),
  z.object({
    type: z.literal('whop.ads.campaign.pause'),
    params: z.object({ campaignId: z.string() }),
  }),
  z.object({
    type: z.literal('whop.treasury.move'),
    params: z.object({
      amount: z.number().positive(),
      destination: z.enum(['yield', 'balance']),
    }),
  }),
  z.object({
    type: z.literal('whop.payout.schedule'),
    params: z.object({
      recipient: z.string().min(1),
      amount: z.number().positive(),
      inDays: z.number().int().min(0).max(365),
    }),
  }),
  z.object({
    type: z.literal('whop.broadcast.send'),
    params: z.object({
      audience,
      recipientCount: z.number().int().min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal('whop.product.create'),
    params: z.object({
      name: z.string().min(1),
      price: z.number().positive(),
      billing: z.enum(['monthly', 'one_time']),
    }),
  }),
  z.object({
    type: z.literal('whop.checkout_link.create'),
    params: z.object({
      name: z.string().min(1),
      productId: z.string(),
      discountPct: z.number().min(0).max(95),
    }),
  }),
])

const commonProposal = {
  headline: z.string().min(1).max(160),
  rationale: z.string().min(1).max(900),
  evidence: z.array(z.string().min(1).max(160)).min(1).max(5),
}

export const modelActionSchema = z
  .object({
    kind: z.literal('action'),
    ...commonProposal,
    expectedImpact: z.object({
      metric: z.string().min(1).max(60),
      direction: z.enum(['up', 'down']),
      estimate: z.string().min(1).max(60),
      confidence: z.enum(['low', 'medium', 'high']),
    }),
    reversibility: z.enum(['instant', 'costly', 'irreversible']),
    conflict: z
      .object({ label: z.string().min(1).max(80), detail: z.string().min(1).max(500) })
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
