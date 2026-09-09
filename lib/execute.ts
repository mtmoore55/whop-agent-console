import type { ActionParams, BusinessState, ProposedAction, ReceiptLine } from './types'
import { countsAsSpend } from './policy'
import { count, money } from './format'

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
  const state0 = prior
  const receipt: ReceiptLine[] = []
  const line = (label: string, before: string, after: string) =>
    receipt.push({ label, before, after })

  switch (action.type) {
    case 'whop.plan.create': {
      const p = action.params as ActionParams['whop.plan.create']
      const appleKeeps = (state0.revenue.yearlyPrice * state0.whop.appleFeePct) / 100
      const whopKeeps = (p.price * state0.whop.whopFeePct) / 100
      line('Plan sold on Whop', s.whop.planListed ? 'yes' : 'no', 'yes')
      line(p.name, '—', `${money(p.price, { cents: true })} ${p.billing}, ${p.seats} seats`)
      line('Kept per plan on the App Store', money(state0.revenue.yearlyPrice - appleKeeps, { cents: true }), '—')
      line('Kept per plan on Whop', '—', money(p.price - whopKeeps, { cents: true }))
      s.whop.planListed = true
      break
    }

    case 'whop.promo.create':
    case 'whop.merch.promo.create': {
      const p = action.params as ActionParams['whop.promo.create']
      line('Live promos', count(s.merch.promos.length), count(s.merch.promos.length + 1))
      line(p.code, '—', `${p.discountPct}% off for ${p.durationDays} days`)
      line('Redemption cap', '—', count(p.maxRedemptions))
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

    case 'whop.app.publish': {
      const p = action.params as ActionParams['whop.app.publish']
      line('Listed in the Whop App Store', s.whop.appPublished ? 'yes' : 'no', 'yes')
      line(p.name, '—', p.category)
      s.whop.appPublished = true
      break
    }

    case 'whop.affiliate.enable': {
      const p = action.params as ActionParams['whop.affiliate.enable']
      line('Affiliate program', s.whop.affiliates.enabled ? 'On' : 'Off', 'On')
      line('Commission', s.whop.affiliates.ratePct ? `${s.whop.affiliates.ratePct}%` : '—', `${p.ratePct}%`)
      line('Cookie window', '—', `${p.cookieWindowDays} days`)
      s.whop.affiliates = { enabled: true, ratePct: p.ratePct }
      break
    }

    case 'whop.affiliate.set_rate': {
      const p = action.params as ActionParams['whop.affiliate.set_rate']
      line('Commission', s.whop.affiliates.ratePct ? `${s.whop.affiliates.ratePct}%` : '—', `${p.ratePct}%`)
      s.whop.affiliates.ratePct = p.ratePct
      break
    }

    case 'whop.bounty.create': {
      const p = action.params as ActionParams['whop.bounty.create']
      line('Open bounties', count(s.whop.bounties.length), count(s.whop.bounties.length + 1))
      line('Reward per conversion', '—', money(p.rewardPerConversion))
      line('Escrowed now', money(0), money(p.budget))
      s.whop.bounties.push({ id: rid('bounty'), title: p.title, budget: p.budget, status: 'open' })
      break
    }

    case 'whop.ads.campaign.create': {
      const p = action.params as ActionParams['whop.ads.campaign.create']
      line('Whop Ads campaigns', count(s.ads.campaigns.length), count(s.ads.campaigns.length + 1))
      line(p.name, '—', `${money(p.dailyBudget)}/day on ${p.placement}`)
      s.ads.campaigns.push({
        id: rid('wad'),
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

    case 'whop.ads.campaign.adjust_budget': {
      const p = action.params as ActionParams['whop.ads.campaign.adjust_budget']
      const camp = s.ads.campaigns.find((c) => c.id === p.campaignId)
      if (camp) {
        line(`${camp.name} — daily budget`, money(camp.dailyBudget), money(p.newDailyBudget))
        line('30-day run rate', money(camp.dailyBudget * 30), money(p.newDailyBudget * 30))
        camp.dailyBudget = p.newDailyBudget
      }
      break
    }

    case 'whop.ads.campaign.pause': {
      const p = action.params as ActionParams['whop.ads.campaign.pause']
      const camp = s.ads.campaigns.find((c) => c.id === p.campaignId)
      if (camp) {
        line(camp.name, camp.status, 'paused')
        line('Daily spend released', money(0), money(camp.dailyBudget))
        camp.status = 'paused'
      }
      break
    }

    case 'whop.notification.send': {
      const p = action.params as ActionParams['whop.notification.send']
      line('Whop members messaged', '0', count(p.recipientCount))
      line('Subject', '—', p.subject)
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
  }

  if (countsAsSpend(action.type) && action.maxCost > 0) {
    line('Agent spend today', money(s.agentSpendToday), money(s.agentSpendToday + action.maxCost))
    s.agentSpendToday += action.maxCost
  }

  return { state: s, receipt }
}

