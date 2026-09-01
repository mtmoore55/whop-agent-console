import type {
  ActionParams,
  BusinessState,
  ProposedAction,
  ReceiptLine,
} from './types'
import { countsAsSpend } from './policy'
import { count, daysFromNow, money, shortDate } from './format'

/**
 * Local executors. Never call the real Whop API.
 * Each one mutates a clone of BusinessState and hands back a receipt of what
 * actually changed — the receipt is the thing that makes approval trustworthy.
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
    case 'whop.pricing.update': {
      const p = action.params as ActionParams['whop.pricing.update']
      const product = s.products.find((x) => x.id === p.productId)
      if (product) {
        line(`${product.name} price`, money(product.price), money(p.newPrice))
        product.price = p.newPrice
      }
      break
    }

    case 'whop.promo.create': {
      const p = action.params as ActionParams['whop.promo.create']
      line('Active promos', count(s.promos.length), count(s.promos.length + 1))
      line(p.code, '—', `${p.discountPct}% off for ${p.durationDays} days`)
      line('Redemption cap', '—', count(p.maxRedemptions))
      line('Worst-case discount given', money(0), money(action.maxCost))
      s.promos.push({
        id: rid('promo'),
        code: p.code,
        discountPct: p.discountPct,
        durationDays: p.durationDays,
        audience: p.audience,
        maxRedemptions: p.maxRedemptions,
        productId: p.productId,
        createdAtISO: s.business.todayISO,
      })
      break
    }

    case 'whop.affiliate.enable': {
      const p = action.params as ActionParams['whop.affiliate.enable']
      line('Affiliate program', s.affiliates.enabled ? 'On' : 'Off', 'On')
      line('Commission rate', s.affiliates.ratePct ? `${s.affiliates.ratePct}%` : '—', `${p.ratePct}%`)
      line('Cookie window', '—', `${p.cookieWindowDays} days`)
      s.affiliates.enabled = true
      s.affiliates.ratePct = p.ratePct
      break
    }

    case 'whop.affiliate.set_rate': {
      const p = action.params as ActionParams['whop.affiliate.set_rate']
      line('Commission rate', s.affiliates.ratePct ? `${s.affiliates.ratePct}%` : '—', `${p.ratePct}%`)
      s.affiliates.ratePct = p.ratePct
      break
    }

    case 'whop.bounty.create': {
      const p = action.params as ActionParams['whop.bounty.create']
      line('Open bounties', count(s.bounties.length), count(s.bounties.length + 1))
      line('Reward per conversion', '—', money(p.rewardPerConversion))
      line('Escrowed from balance', money(0), money(p.budget))
      line('Settled balance', money(s.treasury.settled), money(s.treasury.settled - p.budget))
      s.bounties.push({
        id: rid('bounty'),
        title: p.title,
        rewardPerConversion: p.rewardPerConversion,
        budget: p.budget,
        goal: p.goal,
        status: 'open',
      })
      s.treasury.settled -= p.budget
      s.treasury.idle = Math.max(0, s.treasury.idle - p.budget)
      s.treasury.balance -= p.budget
      break
    }

    case 'whop.ads.campaign.create': {
      const p = action.params as ActionParams['whop.ads.campaign.create']
      line('Active campaigns', count(s.ads.campaigns.length), count(s.ads.campaigns.length + 1))
      line(p.name, '—', `${money(p.dailyBudget)}/day on ${p.platform}`)
      s.ads.campaigns.push({
        id: rid('camp'),
        name: p.name,
        platform: p.platform,
        dailyBudget: p.dailyBudget,
        status: 'active',
        cac: 0,
        cacPrior: 0,
        spend30d: 0,
        conversions30d: 0,
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

    case 'whop.treasury.move': {
      const p = action.params as ActionParams['whop.treasury.move']
      const t = s.treasury
      if (p.destination === 'yield') {
        const accessible = daysFromNow(s.business.todayISO, t.yieldSettlementDays)
        line('Settled balance', money(t.settled), money(t.settled - p.amount))
        line('Idle cash', money(t.idle), money(Math.max(0, t.idle - p.amount)))
        line('In Treasury yield', money(t.inYield), money(t.inYield + p.amount))
        line('Earliest access', 'now', shortDate(accessible))
        t.settled -= p.amount
        t.idle = Math.max(0, t.idle - p.amount)
        t.inYield += p.amount
        t.yieldAccessibleFromISO = accessible
      } else {
        line('In Treasury yield', money(t.inYield), money(Math.max(0, t.inYield - p.amount)))
        line('Settled balance', money(t.settled), money(t.settled + p.amount))
        t.inYield = Math.max(0, t.inYield - p.amount)
        t.settled += p.amount
        t.idle += p.amount
        if (t.inYield === 0) t.yieldAccessibleFromISO = null
      }
      break
    }

    case 'whop.payout.schedule': {
      const p = action.params as ActionParams['whop.payout.schedule']
      line('Scheduled obligations', count(s.obligations.length), count(s.obligations.length + 1))
      line(p.recipient, '—', `${money(p.amount)} in ${p.inDays} days`)
      s.obligations.push({
        id: rid('obl'),
        label: p.recipient,
        amount: p.amount,
        dueInDays: p.inDays,
      })
      break
    }

    case 'whop.broadcast.send': {
      const p = action.params as ActionParams['whop.broadcast.send']
      const sentBefore = s.broadcasts.reduce((a, b) => a + b.recipientCount, 0)
      line('Members messaged today', count(sentBefore), count(sentBefore + p.recipientCount))
      line('Subject', '—', p.subject)
      s.broadcasts.push({
        id: rid('bcast'),
        audience: p.audience,
        recipientCount: p.recipientCount,
        subject: p.subject,
        sentAtISO: new Date().toISOString(),
      })
      break
    }

    case 'whop.product.create': {
      const p = action.params as ActionParams['whop.product.create']
      line('Products', count(s.products.length), count(s.products.length + 1))
      line(p.name, '—', `${money(p.price)} ${p.billing === 'monthly' ? '/mo' : 'one time'}`)
      s.products.push({
        id: rid('prod'),
        name: p.name,
        price: p.price,
        billing: p.billing,
        activeMembers: 0,
      })
      break
    }

    case 'whop.checkout_link.create': {
      const p = action.params as ActionParams['whop.checkout_link.create']
      line('Checkout links', count(s.checkoutLinks.length), count(s.checkoutLinks.length + 1))
      line(p.name, '—', p.discountPct > 0 ? `${p.discountPct}% off` : 'full price')
      s.checkoutLinks.push({
        id: rid('link'),
        name: p.name,
        productId: p.productId,
        discountPct: p.discountPct,
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
