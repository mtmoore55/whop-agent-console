import type { BusinessState, Goal } from './types'

export const TODAY = '2026-09-08'

/**
 * Swolemates, projected roughly eighteen months forward from where it is now.
 *
 * The shape is anchored on the live numbers rather than invented: today the app
 * runs a 34% DAU/MAU, 1.73 riders on the crews that have any, and only about a
 * third of paying owners have brought anyone at all. The projection improves
 * the crew loop hard — it is the primary trial-to-paid motion — from 1.63
 * people per plan to 2.35, but stops well short of full five-seat crews, which
 * would be the wishful version.
 *
 * MRR is split the way the cofounder digest splits it: committed is auto-renew
 * ON, lapsing is auto-renew OFF but still inside a paid period — money the
 * headline used to count as recurring when it had already churned.
 */
export const SEED_STATE: BusinessState = {
  business: {
    name: 'Swolemates',
    handle: '@swolemates',
    tagline: 'Duolingo for staying fit. One plan, five people.',
    todayISO: TODAY,
  },
  revenue: {
    mrrCommitted: 28158,
    mrrLapsing: 1840,
    mrrChangePct30d: 3.4,
    arr: 337896,
    yearlyPlans: 3980,
    monthlyPlans: 495,
    yearlyPrice: 69.99,
    monthlyPrice: 9.99,
  },
  members: {
    payingPlans: 4475,
    riders: 6041,
    people: 10516,
    signups24h: 42,
    dau: 2180,
    wau: 4610,
    mau: 7240,
  },
  trials: {
    live: 415,
    started24h: 30,
    expiringNext3Days: 92,
    serverToPaidPct: 31.4,
    serverToPaidPctPrior: 38.1,
    storekitToPaidPct: 19.8,
    expiredNeverPaid: 1240,
  },
  crews: {
    healthy: 1795,
    emerging: 1120,
    solo: 1560,
    avgMembers: 2.35,
    inviteAcceptPct7d: 38.6,
    ownersWhoInvited: 2910,
  },
  retention: {
    autoRenewOff24h: 34,
    payingCancels24h: 21,
    atRiskMrr: 1410,
  },
  ads: {
    campaigns: [
      {
        id: 'asa_search_core',
        name: 'Search results — fitness accountability',
        placement: 'search_results',
        dailyBudget: 220,
        status: 'active',
        cpa: 41,
        cpaPrior: 29,
        spend30d: 6180,
        installs30d: 2940,
        plans30d: 151,
      },
    ],
  },
  appStore: {
    rating: 4.7,
    ratingCount: 1842,
    version: '2.9.1',
    proceedsLastMonth: 24900,
    installs30d: 9400,
  },
  config: {
    trialDays: 14,
    paywallMode: 'server14',
    // badge-artwork.ts alerts at three months or fewer.
    badgeArtworkRunwayMonths: 3,
  },
  offerCodes: [],
  nudges: [
    {
      id: 'nudge_checkin',
      fn: 'daily-checkin-nudge',
      audience: 'Active members past their usual window',
      audienceSize: 3120,
      status: 'running',
      startedAtISO: '2026-06-02',
    },
    {
      id: 'nudge_choose_plan',
      fn: 'choose-plan-nudge',
      audience: 'Signed up, never started a trial',
      audienceSize: 380,
      status: 'running',
      startedAtISO: '2026-07-19',
    },
  ],
  merch: {
    products: [
      { id: 'merch_bottle', name: 'Swolemates water bottle', price: 35, soldLifetime: 214 },
      { id: 'merch_tank', name: 'Swolemates tank top', price: 30, soldLifetime: 168 },
      { id: 'merch_headband', name: 'Swolemates headband', price: 25, soldLifetime: 96 },
      { id: 'merch_stickers', name: 'Coaches sticker pack', price: 15, soldLifetime: 341 },
    ],
    promos: [],
  },
  issues: [
    {
      id: 'iss_trial_recap',
      title: 'trial_recap() times out for crews over 3 members',
      events24h: 68,
      usersAffected24h: 61,
      trend: 'spiking',
      firstSeenISO: '2026-09-05',
      note: 'The day-14 ask falls back to the generic pitch when it fails, so the personalised recap never renders.',
    },
    {
      id: 'iss_healthkit',
      title: 'HealthKit backfill returns duplicate workouts',
      events24h: 12,
      usersAffected24h: 9,
      trend: 'flat',
      firstSeenISO: '2026-08-14',
    },
    {
      id: 'iss_apns',
      title: 'APNs token refresh 410 on reinstall',
      events24h: 4,
      usersAffected24h: 4,
      trend: 'cooling',
      firstSeenISO: '2026-07-30',
    },
  ],
  agentSpendToday: 0,
}

/**
 * $100k/mo is already the goal in metrics.ts; the date is the part the console
 * adds. At 3.4%/mo against the 4.7%/mo this needs, it reads behind — which is
 * the useful state for a goal to be in.
 */
export const SEED_GOAL: Goal = {
  metric: 'mrr',
  label: 'Committed MRR',
  target: 100000,
  byISO: '2028-12-31',
}

export function freshGoal(): Goal {
  return { ...SEED_GOAL }
}

export function freshState(): BusinessState {
  return structuredClone(SEED_STATE)
}
