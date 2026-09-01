import type { BusinessState } from './types'

export const TODAY = '2026-09-01'

/**
 * "Range" — a paid trading-education community on Whop.
 * One specific, believable seller. Numbers are lived-in, not round.
 */
export const SEED_STATE: BusinessState = {
  business: {
    name: 'Range',
    handle: '@range',
    tagline: 'Trading education, run by one person and an agent.',
    todayISO: TODAY,
  },
  members: {
    active: 1847,
    lapsed90d: 312,
  },
  revenue: {
    mrr: 57340,
    mrrChangePct30d: 4.1,
    arpu: 31.05,
  },
  churn: {
    trailing30dPct: 8.4,
    priorPct: 6.2,
  },
  products: [
    {
      id: 'prod_community',
      name: 'Range Community',
      price: 32,
      billing: 'monthly',
      activeMembers: 1847,
    },
    {
      id: 'prod_course',
      name: 'The Range Method (course)',
      price: 149,
      billing: 'one_time',
      activeMembers: 0,
    },
  ],
  ads: {
    campaigns: [
      {
        id: 'camp_meta_1',
        name: 'Meta — Broad / traders 25-44',
        platform: 'meta',
        dailyBudget: 240,
        status: 'active',
        cac: 61,
        cacPrior: 44,
        spend30d: 7140,
        conversions30d: 117,
      },
    ],
  },
  affiliates: {
    enabled: false,
    ratePct: null,
  },
  bounties: [],
  promos: [],
  broadcasts: [],
  checkoutLinks: [],
  treasury: {
    balance: 84120,
    settled: 65720,
    pendingClearance: 18400,
    pendingClearsInDays: 3,
    idle: 61000,
    inYield: 0,
    yieldSettlementDays: 7,
    yieldAprPct: 4.15,
    yieldAccessibleFromISO: null,
  },
  obligations: [
    {
      id: 'obl_creator_payout',
      label: 'Creator + moderator payout',
      amount: 12400,
      dueInDays: 6,
    },
  ],
  issues: [
    {
      id: 'iss_webhook',
      title: 'Checkout webhook timeouts',
      events24h: 41,
      trend: 'spiking',
      firstSeenISO: '2026-08-30',
      note: 'Correlated with a drop in completed mobile checkouts.',
    },
    {
      id: 'iss_discord',
      title: 'Discord role sync retries',
      events24h: 6,
      trend: 'flat',
      firstSeenISO: '2026-07-14',
    },
    {
      id: 'iss_email',
      title: 'Receipt email bounce (soft)',
      events24h: 2,
      trend: 'cooling',
      firstSeenISO: '2026-08-11',
    },
  ],
  agentSpendToday: 0,
}

export function freshState(): BusinessState {
  return structuredClone(SEED_STATE)
}
