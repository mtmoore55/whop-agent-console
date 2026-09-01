'use client'

import { ACTION_LABELS, DEFAULT_POLICY, countsAsSpend, policySentence } from '@/lib/policy'
import { count, money } from '@/lib/format'
import { useConsole } from '@/lib/store'
import { ACTION_TYPES, type ActionType, type PolicyStance } from '@/lib/types'
import { AppShell } from './AppShell'
import { MemoryPanel } from './MemoryPanel'
import { PageHeader } from './PageHeader'
import { Btn, Eyebrow, Tag } from './ui'

const STANCES: { value: PolicyStance; label: string }[] = [
  { value: 'auto', label: 'Auto-approve' },
  { value: 'ask', label: 'Ask me' },
  { value: 'never', label: 'Never' },
]

const GROUPS: { label: string; types: ActionType[] }[] = [
  {
    label: 'Money',
    types: ['whop.treasury.move', 'whop.payout.schedule', 'whop.pricing.update'],
  },
  {
    label: 'Growth',
    types: [
      'whop.ads.campaign.create',
      'whop.ads.campaign.adjust_budget',
      'whop.ads.campaign.pause',
      'whop.affiliate.enable',
      'whop.affiliate.set_rate',
      'whop.bounty.create',
    ],
  },
  {
    label: 'Members',
    types: [
      'whop.promo.create',
      'whop.broadcast.send',
      'whop.product.create',
      'whop.checkout_link.create',
    ],
  },
]

function Segmented({ type }: { type: ActionType }) {
  const { policy, setStance } = useConsole()
  const current = policy.perType[type]

  return (
    <div
      role="radiogroup"
      aria-label={ACTION_LABELS[type]}
      className="flex shrink-0 gap-px overflow-hidden rounded-lg border border-line bg-line"
    >
      {STANCES.map((s) => {
        const on = current === s.value
        return (
          <button
            key={s.value}
            role="radio"
            aria-checked={on}
            onClick={() => setStance(type, s.value)}
            className={`px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              on
                ? s.value === 'never'
                  ? 'bg-red-surface text-red-11'
                  : s.value === 'auto'
                    ? 'bg-green-surface text-green-11'
                    : 'bg-gray-4 text-ink'
                : 'bg-gray-2 text-faint hover:bg-gray-3 hover:text-mute'
            }`}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

function Limit({
  label,
  help,
  value,
  onChange,
  prefix,
  min,
  max,
  step = 1,
}: {
  label: string
  help: string
  value: number
  onChange: (n: number) => void
  prefix?: string
  min: number
  max: number
  step?: number
}) {
  return (
    <div className="min-w-0 bg-card px-4 py-3.5">
      <Eyebrow className="mb-2">{label}</Eyebrow>
      <div className="flex items-center gap-1.5">
        {prefix && <span className="num text-[18px] text-faint">{prefix}</span>}
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)))
          }}
          className="num title w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[22px] text-ink outline-none transition-colors hover:border-line focus:border-blue-9"
        />
      </div>
      <p className="mt-2 text-[12px] leading-snug text-faint">{help}</p>
    </div>
  )
}

export function ConsoleScreen() {
  const { policy, setPolicy, resetPolicy, brief, verdictOf, statusOf } = useConsole()

  // Enforcement has to be visibly real, so show what this policy does to the
  // brief sitting on the other screen right now.
  const pending = brief.proposals.filter(
    (p) => p.kind === 'action' && statusOf(p.id) === 'pending',
  )
  const tally = { auto: 0, ask: 0, blocked: 0 }
  for (const p of pending) {
    if (p.kind !== 'action') continue
    tally[verdictOf(p).decision]++
  }

  const isDefault =
    JSON.stringify(policy) === JSON.stringify(DEFAULT_POLICY)

  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <PageHeader
          title="Console"
          sub="Set the rules once so the brief gets faster over time. Everything here is enforced before a proposal ever reaches you."
          right={
            <Btn variant="ghost" disabled={isDefault} onClick={resetPolicy}>
              Reset to defaults
            </Btn>
          }
        />

        <div className="mb-4 rounded-xl border border-line bg-card px-4 py-3.5 sm:px-5">
          <Eyebrow className="mb-1.5">In plain language</Eyebrow>
          <p className="max-w-[72ch] text-[16px] leading-[1.5] text-ink">
            {policySentence(policy)}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          <Limit
            label="Daily agent spend cap"
            help="Applies to money that actually leaves — ad budgets, bounties, payouts. Moving your own cash between your own accounts is not spend."
            prefix="$"
            value={policy.dailySpendCapUSD}
            min={0}
            max={100_000}
            step={50}
            onChange={(n) => setPolicy({ dailySpendCapUSD: n })}
          />
          <Limit
            label="Per-action ceiling"
            help="Above this, approval is always required regardless of the action type."
            prefix="$"
            value={policy.perActionCostCeilingUSD}
            min={0}
            max={100_000}
            step={50}
            onChange={(n) => setPolicy({ perActionCostCeilingUSD: n })}
          />
          <Limit
            label="Broadcast ceiling"
            help="The agent may never touch more members than this in one action without asking."
            value={policy.broadcastCeiling}
            min={0}
            max={10_000}
            step={10}
            onChange={(n) => setPolicy({ broadcastCeiling: n })}
          />
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-raise px-4 py-3">
          <Eyebrow>Against today&apos;s brief</Eyebrow>
          <span className="text-[13px] text-mute">
            {count(pending.length)} undecided {pending.length === 1 ? 'action' : 'actions'} →
          </span>
          <Tag tone="green">{count(tally.auto)} auto</Tag>
          <Tag tone="blue">{count(tally.ask)} ask you</Tag>
          <Tag tone="red">{count(tally.blocked)} blocked</Tag>
        </div>

        <section className="space-y-6">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <Eyebrow className="mb-2.5">{group.label}</Eyebrow>
              <div className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-card">
                {group.types.map((type) => (
                  <div
                    key={type}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[15px] text-ink">{ACTION_LABELS[type]}</div>
                      <div className="num mt-0.5 text-[12px] text-faint">
                        {type}
                        {countsAsSpend(type) && ' · counts against the daily cap'}
                      </div>
                    </div>
                    <Segmented type={type} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <Eyebrow className="mb-2.5">Agent memory</Eyebrow>
          <MemoryPanel />
        </section>

        <footer className="mt-10 border-t border-line pt-5">
          <p className="max-w-[68ch] text-[13px] leading-[1.6] text-faint">
            The model never decides what needs you. It proposes; these rules decide. A
            proposal over a limit shows on the brief as blocked, names the rule that
            blocked it, and offers a one-time override. Sanity check:{' '}
            {money(policy.perActionCostCeilingUSD)} ceiling under a{' '}
            {money(policy.dailySpendCapUSD)} daily cap.
          </p>
        </footer>
      </div>
    </AppShell>
  )
}

export { ACTION_TYPES }
