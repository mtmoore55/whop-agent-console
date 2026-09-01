import type { LogEntry } from './types'

/**
 * Ten days of history before today's brief.
 *
 * The Log is the screen that makes the other two trustworthy, so it cannot
 * open empty — an audit trail with nothing in it proves nothing. These entries
 * are consistent with SEED_STATE by construction: the Meta campaign sits at
 * $240/day because of the raise on Aug 31, the $12,400 obligation exists
 * because the owner overrode policy to schedule it on Aug 20, and every other
 * entry either was rejected or was undone, so it left no trace to reconcile.
 *
 * None carry a `stateBefore` snapshot. They predate this session, so there is
 * nothing honest to revert to and the Log says so rather than offering an Undo
 * that would quietly do the wrong thing.
 */
const at = (day: string, time: string) => `2026-08-${day}T${time}:00.000Z`

export function seedLog(): LogEntry[] {
  return [
    {
      id: 'seed_log_meta_raise',
      proposalId: 'seed_meta_raise',
      type: 'whop.ads.campaign.adjust_budget',
      headline: 'Raise the Meta campaign from $180 to $280/day while CAC is still $44',
      lifecycle: ['proposed', 'modified', 'approved', 'executed'],
      params: { campaignId: 'camp_meta_1', newDailyBudget: 240 },
      receipt: [
        { label: 'Meta — Broad / traders 25-44 — daily budget', before: '$180', after: '$240' },
        { label: '30-day run rate', before: '$5,400', after: '$7,200' },
        { label: 'Agent spend today', before: '$0', after: '$240' },
      ],
      reversibility: 'instant',
      maxCost: 240,
      atISO: at('31', '07:14'),
    },
    {
      id: 'seed_log_broadcast_2',
      proposalId: 'seed_broadcast_2',
      type: 'whop.broadcast.send',
      headline: 'Message all 2,159 members about the new weekly market recap',
      lifecycle: ['proposed', 'rejected'],
      params: { audience: 'all', recipientCount: 2159, subject: 'New: weekly market recap' },
      receipt: [],
      reversibility: 'irreversible',
      maxCost: 0,
      atISO: at('30', '07:09'),
      rejectionReason: 'too-broad',
    },
    {
      id: 'seed_log_tiktok',
      proposalId: 'seed_tiktok',
      type: 'whop.ads.campaign.create',
      headline: 'Open a $90/day TikTok test alongside Meta',
      lifecycle: ['proposed', 'rejected'],
      params: { name: 'TikTok — traders 18-34', platform: 'tiktok', dailyBudget: 90 },
      receipt: [],
      reversibility: 'costly',
      maxCost: 90,
      atISO: at('29', '07:11'),
      rejectionReason: 'not-now',
    },
    {
      id: 'seed_log_checkout_link',
      proposalId: 'seed_checkout_link',
      type: 'whop.checkout_link.create',
      headline: 'Create a dedicated checkout link for the August webinar',
      lifecycle: ['proposed', 'approved', 'executed'],
      params: { name: 'August webinar', productId: 'prod_community', discountPct: 0 },
      receipt: [
        { label: 'Checkout links', before: '0', after: '1' },
        { label: 'August webinar', before: '—', after: 'full price' },
      ],
      reversibility: 'instant',
      maxCost: 0,
      atISO: at('28', '07:16'),
    },
    {
      id: 'seed_log_broadcast_1',
      proposalId: 'seed_broadcast_1',
      type: 'whop.broadcast.send',
      headline: 'Message all 1,847 active members about the referral push',
      lifecycle: ['proposed', 'rejected'],
      params: { audience: 'active', recipientCount: 1847, subject: 'Bring a trader, get a month' },
      receipt: [],
      reversibility: 'irreversible',
      maxCost: 0,
      atISO: at('27', '07:08'),
      rejectionReason: 'too-broad',
    },
    {
      id: 'seed_log_price',
      proposalId: 'seed_price',
      type: 'whop.pricing.update',
      headline: 'Raise the community from $32 to $39/mo for new members',
      lifecycle: ['proposed', 'rejected'],
      params: { productId: 'prod_community', newPrice: 39, appliesTo: 'new_members' },
      receipt: [],
      reversibility: 'costly',
      maxCost: 0,
      atISO: at('25', '07:12'),
      rejectionReason: 'risky',
    },
    {
      id: 'seed_log_pause_undone',
      proposalId: 'seed_pause',
      type: 'whop.ads.campaign.pause',
      headline: 'Pause the Meta campaign over the bank holiday weekend',
      lifecycle: ['proposed', 'approved', 'executed'],
      params: { campaignId: 'camp_meta_1' },
      receipt: [
        { label: 'Meta — Broad / traders 25-44', before: 'active', after: 'paused' },
        { label: 'Daily spend released', before: '$0', after: '$180' },
      ],
      reversibility: 'instant',
      maxCost: 0,
      atISO: at('23', '07:05'),
      undone: true,
    },
    {
      id: 'seed_log_payout',
      proposalId: 'seed_payout',
      type: 'whop.payout.schedule',
      headline: 'Schedule the $12,400 creator and moderator payout for Sep 7',
      lifecycle: ['proposed', 'overridden', 'approved', 'executed'],
      params: { recipient: 'Creator + moderator payout', amount: 12400, inDays: 18 },
      receipt: [
        { label: 'Scheduled obligations', before: '0', after: '1' },
        { label: 'Creator + moderator payout', before: '—', after: '$12,400 in 18 days' },
        { label: 'Agent spend today', before: '$0', after: '$12,400' },
      ],
      reversibility: 'costly',
      maxCost: 12400,
      atISO: at('20', '07:19'),
    },
  ]
}
