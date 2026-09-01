'use client'

import { ActionCard } from './ActionCard'
import { BatchBar } from './BatchBar'
import { ObservationCard } from './ObservationCard'
import { StateStrip } from './StateStrip'
import { AppShell } from './AppShell'
import { Eyebrow, Tag } from './ui'
import { clockTime, count } from '@/lib/format'
import { useConsole } from '@/lib/store'

export function BriefScreen() {
  const { brief, statusOf } = useConsole()

  const actions = brief.proposals.filter((p) => p.kind === 'action')
  const decided = actions.filter(
    (p) => statusOf(p.id) === 'executed' || statusOf(p.id) === 'rejected',
  )

  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <section className="mb-7 sm:mb-9">
          <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <Tag tone="brand">Agent</Tag>
            <span className="text-[13px] text-faint">
              Daily brief · generated {clockTime(brief.generatedAtISO)} ·{' '}
              {brief.source === 'seed' ? 'seeded' : brief.source} data
            </span>
          </div>

          <div className="border-l-2 border-brand pl-4 sm:pl-5">
            <h1 className="title max-w-[880px] text-[24px] leading-[1.22] text-ink sm:text-[32px]">
              {brief.lede}
            </h1>
          </div>
        </section>

        <section className="mb-4">
          <StateStrip />
        </section>

        <section className="mb-7 sm:mb-9">
          <BatchBar />
        </section>

        <section>
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <Eyebrow className="text-mute">
              {count(brief.proposals.length)} items · {count(actions.length)} decisions
            </Eyebrow>
            <span className="num text-[12px] text-faint">
              {count(decided.length)}/{count(actions.length)} decided
            </span>
          </div>

          <div className="space-y-3">
            {brief.proposals.map((p, i) =>
              p.kind === 'action' ? (
                <ActionCard key={p.id} action={p} index={i} />
              ) : (
                <ObservationCard key={p.id} item={p} index={i} />
              ),
            )}
          </div>
        </section>

        <footer className="mt-10 border-t border-line pt-5">
          <p className="max-w-[68ch] text-[13px] leading-[1.6] text-faint">
            Prototype. Every executor is local — nothing here touches the real Whop API, and no
            money moves. State lives in your browser and survives a refresh; Reset demo restores
            the seed.
          </p>
        </footer>
      </div>
    </AppShell>
  )
}
