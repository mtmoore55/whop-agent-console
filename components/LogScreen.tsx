'use client'

import { ACTION_LABELS } from '@/lib/policy'
import { clockTime, money, shortDate } from '@/lib/format'
import { useConsole } from '@/lib/store'
import type { LogEntry } from '@/lib/types'
import { AppShell } from './AppShell'
import { PageHeader } from './PageHeader'
import { Receipt } from './Receipt'
import { Btn, Eyebrow, Tag } from './ui'

const LIFECYCLE_TONE = {
  proposed: 'gray',
  modified: 'blue',
  overridden: 'amber',
  approved: 'gray',
  executed: 'green',
  rejected: 'red',
} as const

function Entry({ entry }: { entry: LogEntry }) {
  const { undo } = useConsole()
  const executed = entry.lifecycle.includes('executed')
  // Entries seeded as history carry no snapshot, so there is nothing to
  // restore. Say that rather than offering an Undo that cannot work.
  const revertible = executed && !entry.undone && !!entry.stateBefore

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-card ${
        entry.undone ? 'border-line-soft opacity-60' : 'border-line'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line-soft px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="num text-[12px] text-faint">
            {shortDate(entry.atISO)} {clockTime(entry.atISO)}
          </span>
          <Eyebrow className="truncate">{ACTION_LABELS[entry.type]}</Eyebrow>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {entry.lifecycle.map((step) => (
            <Tag key={step} tone={LIFECYCLE_TONE[step]}>
              {step}
            </Tag>
          ))}
          {entry.undone && <Tag tone="amber">undone</Tag>}
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        <h2 className={`text-[16px] leading-snug ${entry.undone ? 'text-mute' : 'text-ink'}`}>
          {entry.headline}
        </h2>

        {entry.rejectionReason && (
          <div className="flex items-center gap-2">
            <Eyebrow>Rejected as</Eyebrow>
            <span className="text-[14px] font-medium text-red-11">{entry.rejectionReason}</span>
          </div>
        )}

        {executed && !entry.undone && <Receipt lines={entry.receipt} />}

        {executed && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <span className="text-[12px] text-faint">
              Worst case at risk was {money(entry.maxCost)} · {entry.reversibility}
            </span>
            {entry.undone ? (
              <span className="text-[13px] text-faint">Reverted</span>
            ) : revertible ? (
              <Btn variant="soft" onClick={() => undo(entry.id)}>
                Undo
              </Btn>
            ) : entry.reversibility === 'instant' ? (
              <span
                className="text-[13px] text-faint"
                title="Ran before this session, so there is no snapshot to restore."
              >
                Archived
              </span>
            ) : (
              <span
                className="text-[13px] text-faint"
                title="Money or a promise already moved. Undo here would be a lie."
              >
                Not reversible from here
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export function LogScreen() {
  const { log, state } = useConsole()

  const executed = log.filter((e) => e.lifecycle.includes('executed') && !e.undone)
  const spent = executed.reduce((a, e) => a + e.maxCost, 0)

  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px] px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <PageHeader
          title="Log"
          sub="Every proposal the agent has made, what you did with it, and what changed when it ran. This screen is what makes the other two trustworthy."
        />

        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {[
            { label: 'Entries', value: String(log.length) },
            { label: 'Executed', value: String(executed.length) },
            { label: 'Rejected', value: String(log.filter((e) => e.rejectionReason).length) },
            { label: 'Committed', value: money(spent) },
          ].map((cell) => (
            <div key={cell.label} className="bg-card px-4 py-3.5">
              <Eyebrow>{cell.label}</Eyebrow>
              <div className="num title mt-2 text-[20px] leading-none text-ink">{cell.value}</div>
            </div>
          ))}
        </div>

        {log.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card/50 px-4 py-10 text-center">
            <p className="text-[14px] text-mute">Nothing has happened yet.</p>
            <p className="mt-1.5 text-[13px] text-faint">
              Approve or reject something on the brief and it lands here with a receipt.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Undo replays everything stacked on top, so any executed entry
                with a snapshot is safe to revert - not just the most recent. */}
            {log.map((entry) => (
              <Entry key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        <footer className="mt-10 border-t border-line pt-5">
          <p className="max-w-[68ch] text-[13px] leading-[1.6] text-faint">
            Undo restores the business state captured before that action ran, then replays
            everything that happened after it — so reverting an older action does not
            silently drop the ones stacked on top. Committed MRR is currently{' '}
            {money(state.revenue.mrrCommitted)}/mo.
          </p>
        </footer>
      </div>
    </AppShell>
  )
}
