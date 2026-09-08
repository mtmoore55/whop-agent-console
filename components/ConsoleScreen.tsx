'use client'

import { ACTION_LABELS, DEFAULT_POLICY, countsAsSpend, policySentence } from '@/lib/policy'
import { count, money } from '@/lib/format'
import { useConsole } from '@/lib/store'
import { ACTION_TYPES, type ActionType, type PolicyStance } from '@/lib/types'
import { arrivalISO } from '@/lib/goal'
import { monthYear } from '@/lib/format'
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
    label: 'The money model',
    types: [
      'swolemates.pricing.update',
      'swolemates.trial.set_length',
      'swolemates.paywall.set_mode',
      'swolemates.offer_code.create',
    ],
  },
  {
    label: 'Reaching members',
    types: [
      'swolemates.nudge.campaign',
      'swolemates.push.broadcast',
      'swolemates.email.campaign',
      'swolemates.badge.schedule_monthly',
    ],
  },
  {
    label: 'Apple Search Ads',
    types: ['asa.campaign.create', 'asa.campaign.adjust_budget', 'asa.campaign.pause'],
  },
  {
    label: 'Merch on Whop',
    types: ['whop.merch.promo.create', 'whop.merch.product.create'],
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

/** The number the agent is working toward. Everything else is guardrails. */
function GoalCard() {
  const { goal, setGoal, pace, state } = useConsole()
  const arrives = arrivalISO(state, pace)

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-line bg-card">
      <div className="border-b border-line-soft px-4 py-2.5 sm:px-5">
        <Eyebrow>The goal</Eyebrow>
      </div>

      <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-3">
        <div className="bg-card px-4 py-3.5">
          <Eyebrow className="mb-2">Metric</Eyebrow>
          <div className="title text-[22px] leading-none text-ink">{goal.label}</div>
          <p className="mt-2 text-[12px] leading-snug text-faint">
            Monthly recurring revenue, read from the business state.
          </p>
        </div>

        <div className="bg-card px-4 py-3.5">
          <Eyebrow className="mb-2">Target</Eyebrow>
          <div className="flex items-center gap-1.5">
            <span className="num text-[22px] text-faint">$</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100_000_000}
              step={1000}
              value={goal.target}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (Number.isFinite(n)) setGoal({ target: Math.max(0, n) })
              }}
              className="num title w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[22px] text-ink outline-none transition-colors hover:border-line focus:border-blue-9"
            />
            <span className="num shrink-0 text-[14px] text-faint">/mo</span>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-faint">
            The gap the agent is asked to close.
          </p>
        </div>

        <div className="bg-card px-4 py-3.5">
          <Eyebrow className="mb-2">By</Eyebrow>
          <input
            type="date"
            value={goal.byISO.slice(0, 10)}
            onChange={(e) => e.target.value && setGoal({ byISO: e.target.value })}
            className="num title w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[20px] text-ink outline-none transition-colors hover:border-line focus:border-blue-9 [color-scheme:dark]"
          />
          <p className="mt-2 text-[12px] leading-snug text-faint">
            Sets the required rate, and therefore what counts as behind.
          </p>
        </div>
      </div>

      <div className="border-t border-line-soft bg-raise px-4 py-3 sm:px-5">
        <p className="max-w-[80ch] text-[14px] leading-[1.55] text-mute">
          {pace.status === 'met' ? (
            <>Already at {money(pace.current)}/mo. The target is behind you — raise it.</>
          ) : pace.status === 'stalled' ? (
            <>
              {money(pace.current)}/mo and not growing, so this target is never reached. The agent
              is told that plainly.
            </>
          ) : (
            <>
              {money(pace.current)}/mo today, {money(pace.gap)}/mo short. Growing{' '}
              {pace.monthlyGrowthPct.toFixed(1)}%/mo, which arrives{' '}
              {arrives ? monthYear(arrives) : '—'} against a deadline{' '}
              {pace.monthsRemaining.toFixed(0)} months out. Hitting it needs{' '}
              <span className={pace.status === 'behind' ? 'text-amber-11' : 'text-ink'}>
                {pace.requiredMonthlyGrowthPct?.toFixed(1)}%/mo
              </span>
              .
            </>
          )}
        </p>
        <p className="mt-2 max-w-[80ch] text-[13px] leading-[1.55] text-faint">
          The agent gets this gap and this pace in its system prompt, and every action it
          proposes has to say what it contributes toward closing it.
        </p>
      </div>
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
          sub="Set the goal once and the rules once. The goal is what the agent works toward; the rules are what it cannot do without you."
          right={
            <Btn variant="ghost" disabled={isDefault} onClick={resetPolicy}>
              Reset to defaults
            </Btn>
          }
        />

        <GoalCard />

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
