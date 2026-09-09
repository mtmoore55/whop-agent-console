import type { LogEntry } from './types'

/**
 * Three weeks of history before today's brief.
 *
 * The Log is the screen that makes the other two trustworthy, so it cannot open
 * empty. These entries are consistent with SEED_STATE by construction: the
 * search campaign sits at $220/day because of the Aug 26 raise, the badge
 * artwork runway is three months because of the Aug 30 commission, the
 * choose-plan nudge is in `nudges` because it was approved on Aug 22, and
 * everything else was either rejected or undone so it left no trace.
 *
 * None carry a `stateBefore` snapshot. They predate this session, so there is
 * nothing honest to revert to and the Log says so rather than offering an Undo
 * that would quietly do the wrong thing.
 */
const at = (day: string, time: string) => `2026-08-${day}T${time}:00.000Z`

export function seedLog(): LogEntry[] {
  return [
    {
      id: 'seed_log_badge_artwork',
      proposalId: 'seed_badge_artwork',
      type: 'whop.merch.promo.create',
      headline: 'Run 15% off the merch store alongside the crew-day badge launch',
      lifecycle: ['proposed', 'approved', 'executed'],
      params: { code: 'CREWDAY15', discountPct: 15, durationDays: 10, maxRedemptions: 200 },
      receipt: [
        { label: 'Live promos', before: '0', after: '1' },
        { label: 'CREWDAY15', before: '—', after: '15% off for 10 days' },
        { label: 'Worst-case discount given', before: '$0', after: '$788' },
      ],
      reversibility: 'costly',
      maxCost: 788,
      atISO: at('30', '06:07'),
    },
    {
      id: 'seed_log_push_everyone',
      proposalId: 'seed_push_everyone',
      type: 'whop.notification.send',
      headline: 'Message all 8,400 Whop members about the September challenge',
      lifecycle: ['proposed', 'rejected'],
      params: { audience: 'whop_members', recipientCount: 8400, subject: 'September is live' },
      receipt: [],
      reversibility: 'irreversible',
      maxCost: 0,
      atISO: at('29', '06:05'),
      rejectionReason: 'too-broad',
    },
    {
      id: 'seed_log_asa_raise',
      proposalId: 'seed_asa_raise',
      type: 'whop.ads.campaign.adjust_budget',
      headline: 'Raise Whop Discover from $130 to $260/day while CPA is still $27',
      lifecycle: ['proposed', 'modified', 'approved', 'executed'],
      params: { campaignId: 'whop_discover', newDailyBudget: 180 },
      receipt: [
        { label: 'Whop Discover — daily budget', before: '$130', after: '$180' },
        { label: '30-day run rate', before: '$3,900', after: '$5,400' },
        { label: 'Agent spend today', before: '$0', after: '$180' },
      ],
      reversibility: 'instant',
      maxCost: 180,
      atISO: at('26', '06:11'),
    },
    {
      id: 'seed_log_trial_7',
      proposalId: 'seed_trial_7',
      type: 'whop.affiliate.enable',
      headline: 'Turn on Whop affiliates at 50% recurring to fitness creators',
      lifecycle: ['proposed', 'rejected'],
      params: { ratePct: 50, cookieWindowDays: 30 },
      receipt: [],
      reversibility: 'costly',
      maxCost: 0,
      atISO: at('25', '06:09'),
      rejectionReason: 'risky',
    },
    {
      id: 'seed_log_choose_plan',
      proposalId: 'seed_choose_plan',
      type: 'swolemates.nudge.campaign',
      headline: 'Run choose-plan-nudge at people who signed up but never started a trial',
      lifecycle: ['proposed', 'approved', 'executed'],
      params: {
        fn: 'choose-plan-nudge',
        audience: 'signed_up_no_trial',
        audienceSize: 380,
        maxSends: 380,
        days: 14,
      },
      receipt: [
        { label: 'Running campaigns', before: '1', after: '2' },
        { label: 'choose-plan-nudge', before: '—', after: '380 people over 14 days' },
      ],
      reversibility: 'instant',
      maxCost: 0,
      atISO: at('22', '06:14'),
    },
    {
      id: 'seed_log_email_lapsed',
      proposalId: 'seed_email_lapsed',
      type: 'whop.promo.create',
      headline: 'Put 60% off the yearly plan on Whop for the whole of September',
      lifecycle: ['proposed', 'rejected'],
      params: { code: 'SEPT60', discountPct: 60, durationDays: 30, maxRedemptions: 5000, appliesTo: 'plan' },
      receipt: [],
      reversibility: 'irreversible',
      maxCost: 0,
      atISO: at('20', '06:06'),
      rejectionReason: 'too-broad',
    },
    {
      id: 'seed_log_asa_pause_undone',
      proposalId: 'seed_asa_pause',
      type: 'whop.ads.campaign.pause',
      headline: 'Pause Whop Discover over the bank holiday weekend',
      lifecycle: ['proposed', 'approved', 'executed'],
      params: { campaignId: 'whop_discover' },
      receipt: [
        { label: 'Whop Discover — fitness communities', before: 'active', after: 'paused' },
        { label: 'Daily spend released', before: '$0', after: '$130' },
      ],
      reversibility: 'instant',
      maxCost: 0,
      atISO: at('18', '06:03'),
      undone: true,
    },
    {
      id: 'seed_log_merch_promo',
      proposalId: 'seed_merch_promo',
      type: 'whop.bounty.create',
      headline: 'Open a $10-per-signup bounty on Whop capped at $900',
      lifecycle: ['proposed', 'overridden', 'approved', 'executed'],
      params: { title: 'Bring a crew', rewardPerConversion: 10, budget: 900, goal: '90 verified paid plans' },
      receipt: [
        { label: 'Open bounties', before: '0', after: '1' },
        { label: 'Reward per conversion', before: '—', after: '$10' },
        { label: 'Escrowed now', before: '$0', after: '$900' },
      ],
      reversibility: 'costly',
      maxCost: 900,
      atISO: at('15', '06:18'),
    },
  ]
}
