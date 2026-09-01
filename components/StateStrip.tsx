'use client'

import { useConsole } from '@/lib/store'
import { count, money, pct, signedPct } from '@/lib/format'
import { useFlash } from './ui'

function Cell({
  label,
  value,
  sub,
  tone = 'ink',
  className = '',
}: {
  label: string
  value: string
  sub: React.ReactNode
  tone?: 'ink' | 'bad'
  className?: string
}) {
  const flash = useFlash(value)
  return (
    <div className={`min-w-0 bg-card px-4 py-3.5 ${className}`}>
      <div className="eyebrow text-faint">{label}</div>
      <div
        className={`num title mt-2 truncate text-[20px] leading-none sm:text-[24px] ${
          tone === 'bad' ? 'text-red-11' : 'text-ink'
        } ${flash}`}
      >
        {value}
      </div>
      <div className="num mt-2 truncate text-[12px] leading-none text-faint">{sub}</div>
    </div>
  )
}

export function StateStrip() {
  const { state } = useConsole()
  const camp = state.ads.campaigns[0]
  const spiking = state.issues.filter((i) => i.trend === 'spiking').length
  const churnDelta = state.churn.trailing30dPct - state.churn.priorPct

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
      <Cell
        label="MRR"
        value={money(state.revenue.mrr)}
        sub={`${signedPct(state.revenue.mrrChangePct30d)} · 30d`}
      />
      <Cell
        label="Churn 30d"
        value={pct(state.churn.trailing30dPct)}
        tone="bad"
        sub={`↑ ${churnDelta.toFixed(1)}pt from ${pct(state.churn.priorPct)}`}
      />
      <Cell
        label="CAC"
        value={camp ? money(camp.cac) : '—'}
        tone={camp && camp.cac > camp.cacPrior ? 'bad' : 'ink'}
        sub={camp ? `↑ from ${money(camp.cacPrior)}` : 'no campaigns'}
      />
      <Cell
        label="Balance"
        value={money(state.treasury.balance)}
        sub={
          state.treasury.inYield > 0
            ? `${money(state.treasury.inYield)} in yield`
            : `${money(state.treasury.idle)} idle`
        }
      />
      <Cell
        className="max-lg:col-span-2 lg:col-span-1"
        label="Open issues"
        value={count(state.issues.length)}
        tone={spiking > 0 ? 'bad' : 'ink'}
        sub={spiking > 0 ? `${count(spiking)} spiking` : 'all cooling'}
      />
    </div>
  )
}
