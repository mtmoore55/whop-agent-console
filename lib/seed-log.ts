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
      type: 'swolemates.badge.schedule_monthly',
      headline: 'Commission three more months of monthly-badge artwork before the runway hits one',
      lifecycle: ['proposed', 'approved', 'executed'],
      params: { months: 3, coach: 'Mr. Gainz' },
      receipt: [
        { label: 'Badge artwork runway', before: '0 months', after: '3 months' },
        { label: 'Coach', before: '—', after: 'Mr. Gainz' },
        { label: 'Agent spend today', before: '$0', after: '$720' },
      ],
      reversibility: 'costly',
      maxCost: 720,
      atISO: at('30', '06:07'),
    },
    {
      id: 'seed_log_push_everyone',
      proposalId: 'seed_push_everyone',
      type: 'swolemates.push.broadcast',
      headline: 'Push the new monthly challenge to all 9,940 members',
      lifecycle: ['proposed', 'rejected'],
      params: { audience: 'everyone', recipientCount: 9940, title: 'September is live' },
      receipt: [],
      reversibility: 'irreversible',
      maxCost: 0,
      atISO: at('29', '06:05'),
      rejectionReason: 'too-broad',
    },
    {
      id: 'seed_log_asa_raise',
      proposalId: 'seed_asa_raise',
      type: 'asa.campaign.adjust_budget',
      headline: 'Raise search results from $160 to $260/day while CPA is still $29',
      lifecycle: ['proposed', 'modified', 'approved', 'executed'],
      params: { campaignId: 'asa_search_core', newDailyBudget: 220 },
      receipt: [
        { label: 'Search results — daily budget', before: '$160', after: '$220' },
        { label: '30-day run rate', before: '$4,800', after: '$6,600' },
        { label: 'Agent spend today', before: '$0', after: '$220' },
      ],
      reversibility: 'instant',
      maxCost: 220,
      atISO: at('26', '06:11'),
    },
    {
      id: 'seed_log_trial_7',
      proposalId: 'seed_trial_7',
      type: 'swolemates.trial.set_length',
      headline: 'Shorten the trial from 14 days to 7 to pull the ask forward',
      lifecycle: ['proposed', 'rejected'],
      params: { days: 7 },
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
      type: 'swolemates.email.campaign',
      headline: 'Email all 1,090 expired trials about the September challenge',
      lifecycle: ['proposed', 'rejected'],
      params: { audience: 'lapsed_owners', recipientCount: 1090, subject: 'September is live' },
      receipt: [],
      reversibility: 'irreversible',
      maxCost: 0,
      atISO: at('20', '06:06'),
      rejectionReason: 'too-broad',
    },
    {
      id: 'seed_log_asa_pause_undone',
      proposalId: 'seed_asa_pause',
      type: 'asa.campaign.pause',
      headline: 'Pause search results over the bank holiday weekend',
      lifecycle: ['proposed', 'approved', 'executed'],
      params: { campaignId: 'asa_search_core' },
      receipt: [
        { label: 'Search results — fitness accountability', before: 'active', after: 'paused' },
        { label: 'Daily spend released', before: '$0', after: '$160' },
      ],
      reversibility: 'instant',
      maxCost: 0,
      atISO: at('18', '06:03'),
      undone: true,
    },
    {
      id: 'seed_log_merch_promo',
      proposalId: 'seed_merch_promo',
      type: 'whop.merch.promo.create',
      headline: 'Run 20% off the merch store for the crew-day badge launch',
      lifecycle: ['proposed', 'overridden', 'approved', 'executed'],
      params: { code: 'CREWDAY20', discountPct: 20, durationDays: 14, maxRedemptions: 300 },
      receipt: [
        { label: 'Merch promos', before: '0', after: '1' },
        { label: 'CREWDAY20', before: '—', after: '20% off for 14 days' },
        { label: 'Worst-case discount given', before: '$0', after: '$1,575' },
      ],
      reversibility: 'costly',
      maxCost: 1575,
      atISO: at('15', '06:18'),
    },
  ]
}
