import type { ActionParams, BusinessState, ProposedAction, ReceiptLine } from './types'
import { countsAsSpend } from './policy'
import { count, money, pct } from './format'

/**
 * Local executors. Nothing here touches Apple, Whop, or the Swolemates
 * backend. Each mutates a clone of BusinessState and hands back a receipt of
 * what actually changed — the receipt is what makes approval trustworthy.
 */

export interface ExecutionResult {
  state: BusinessState
  receipt: ReceiptLine[]
}

const rid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`

export function execute(action: ProposedAction, prior: BusinessState): ExecutionResult {
  const s: BusinessState = structuredClone(prior)
  const receipt: ReceiptLine[] = []
  const line = (label: string, before: string, after: string) =>
    receipt.push({ label, before, after })

  switch (action.type) {
    case 'swolemates.nudge.campaign': {
      const p = action.params as ActionParams['swolemates.nudge.campaign']
      line('Running campaigns', count(s.nudges.length), count(s.nudges.length + 1))
      line(p.fn, '—', `${count(Math.min(p.audienceSize, p.maxSends))} people over ${p.days} days`)
      s.nudges.push({
        id: rid('nudge'),
        fn: p.fn,
        audience: p.audience,
        audienceSize: Math.min(p.audienceSize, p.maxSends),
        status: 'running',
        startedAtISO: s.business.todayISO,
      })
      break
    }

    case 'swolemates.push.broadcast': {
      const p = action.params as ActionParams['swolemates.push.broadcast']
      line('Push sent', '0', count(p.recipientCount))
      line('Title', '—', p.title)
      break
    }

    case 'swolemates.email.campaign': {
      const p = action.params as ActionParams['swolemates.email.campaign']
      line('Emails queued', '0', count(p.recipientCount))
      line('Subject', '—', p.subject)
      break
    }

    case 'swolemates.offer_code.create': {
      const p = action.params as ActionParams['swolemates.offer_code.create']
      line('Live offer codes', count(s.offerCodes.length), count(s.offerCodes.length + 1))
      line(p.name, '—', `${p.discountPct}% off for ${p.durationMonths} months`)
      line('Redemption cap', '—', count(p.maxRedemptions))
      line('Worst-case revenue given up', money(0), money(action.maxCost))
      s.offerCodes.push({
        id: rid('offer'),
        name: p.name,
        discountPct: p.discountPct,
        durationMonths: p.durationMonths,
        audience: p.audience,
        maxRedemptions: p.maxRedemptions,
        redeemed: 0,
        createdAtISO: s.business.todayISO,
      })
      break
    }

    case 'swolemates.pricing.update': {
      const p = action.params as ActionParams['swolemates.pricing.update']
      if (p.period === 'yearly') {
        line('Yearly price', money(s.revenue.yearlyPrice, { cents: true }), money(p.newPrice, { cents: true }))
        s.revenue.yearlyPrice = p.newPrice
      } else {
        line('Monthly price', money(s.revenue.monthlyPrice, { cents: true }), money(p.newPrice, { cents: true }))
        s.revenue.monthlyPrice = p.newPrice
      }
      line('Applies to', '—', p.appliesTo === 'everyone' ? 'everyone' : 'new subscribers only')
      break
    }

    case 'swolemates.trial.set_length': {
      const p = action.params as ActionParams['swolemates.trial.set_length']
      line('Trial length', `${s.config.trialDays} days`, `${p.days} days`)
      line('Trials mid-flight', '—', count(s.trials.live))
      s.config.trialDays = p.days
      break
    }

    case 'swolemates.paywall.set_mode': {
      const p = action.params as ActionParams['swolemates.paywall.set_mode']
      line('app_config.trial_gate_mode', s.config.paywallMode, p.mode)
      line(
        'Where the ask lands',
        s.config.paywallMode === 'server14' ? 'day 14' : 'day 0',
        p.mode === 'server14' ? 'day 14' : 'day 0',
      )
      s.config.paywallMode = p.mode
      break
    }

    case 'swolemates.badge.schedule_monthly': {
      const p = action.params as ActionParams['swolemates.badge.schedule_monthly']
      const after = s.config.badgeArtworkRunwayMonths + p.months
      line('Badge artwork runway', `${s.config.badgeArtworkRunwayMonths} months`, `${after} months`)
      line('Coach', '—', p.coach)
      s.config.badgeArtworkRunwayMonths = after
      break
    }

    case 'asa.campaign.create': {
      const p = action.params as ActionParams['asa.campaign.create']
      line('Search Ads campaigns', count(s.ads.campaigns.length), count(s.ads.campaigns.length + 1))
      line(p.name, '—', `${money(p.dailyBudget)}/day on ${p.placement.replace('_', ' ')}`)
      s.ads.campaigns.push({
        id: rid('asa'),
        name: p.name,
        placement: p.placement,
        dailyBudget: p.dailyBudget,
        status: 'active',
        cpa: 0,
        cpaPrior: 0,
        spend30d: 0,
        installs30d: 0,
        plans30d: 0,
      })
      break
    }

    case 'asa.campaign.adjust_budget': {
      const p = action.params as ActionParams['asa.campaign.adjust_budget']
      const camp = s.ads.campaigns.find((c) => c.id === p.campaignId)
      if (camp) {
        line(`${camp.name} — daily budget`, money(camp.dailyBudget), money(p.newDailyBudget))
        line('30-day run rate', money(camp.dailyBudget * 30), money(p.newDailyBudget * 30))
        camp.dailyBudget = p.newDailyBudget
      }
      break
    }

    case 'asa.campaign.pause': {
      const p = action.params as ActionParams['asa.campaign.pause']
      const camp = s.ads.campaigns.find((c) => c.id === p.campaignId)
      if (camp) {
        line(camp.name, camp.status, 'paused')
        line('Daily spend released', money(0), money(camp.dailyBudget))
        camp.status = 'paused'
      }
      break
    }

    case 'whop.merch.promo.create': {
      const p = action.params as ActionParams['whop.merch.promo.create']
      line('Merch promos', count(s.merch.promos.length), count(s.merch.promos.length + 1))
      line(p.code, '—', `${p.discountPct}% off for ${p.durationDays} days`)
      line('Worst-case discount given', money(0), money(action.maxCost))
      s.merch.promos.push({
        id: rid('promo'),
        code: p.code,
        discountPct: p.discountPct,
        durationDays: p.durationDays,
        maxRedemptions: p.maxRedemptions,
        createdAtISO: s.business.todayISO,
      })
      break
    }

    case 'whop.merch.product.create': {
      const p = action.params as ActionParams['whop.merch.product.create']
      line('Merch products', count(s.merch.products.length), count(s.merch.products.length + 1))
      line(p.name, '—', money(p.price))
      s.merch.products.push({ id: rid('merch'), name: p.name, price: p.price, soldLifetime: 0 })
      break
    }
  }

  if (countsAsSpend(action.type) && action.maxCost > 0) {
    line('Agent spend today', money(s.agentSpendToday), money(s.agentSpendToday + action.maxCost))
    s.agentSpendToday += action.maxCost
  }

  return { state: s, receipt }
}

export { pct }
