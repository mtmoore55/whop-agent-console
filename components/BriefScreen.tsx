'use client'

import { ActionCard } from './ActionCard'
import { BatchBar } from './BatchBar'
import { ObservationCard } from './ObservationCard'
import { StateStrip } from './StateStrip'
import { AppShell } from './AppShell'
import { AgentBar } from './AgentBar'
import { useConsole } from '@/lib/store'

export function BriefScreen() {
  const { brief } = useConsole()

  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <section className="mb-7 sm:mb-9">
          <div className="mb-4">
            <AgentBar />
          </div>

          <div className="border-l-2 border-brand pl-4 sm:pl-5">
            <h1 className="title max-w-[880px] text-[24px] leading-[1.22] text-ink sm:text-[32px]">
              {brief.lede}
            </h1>
          </div>
        </section>

        <section className="mb-5 sm:mb-6">
          <StateStrip />
        </section>

        <section>
          <BatchBar />

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
