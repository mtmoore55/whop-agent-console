'use client'

import type { Observation } from '@/lib/types'
import { Eyebrow, Tag } from './ui'

/**
 * The required do-nothing item. Not every good read is an action, and a brief
 * that can only propose work will invent work.
 */
export function ObservationCard({ item, index }: { item: Observation; index: number }) {
  return (
    <article className="rounded-xl border border-dashed border-line bg-card/50">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="num text-[11px] text-faint">{String(index + 1).padStart(2, '0')}</span>
          <Eyebrow className="truncate">Observation · no action</Eyebrow>
        </div>
        <Tag tone="gray">Keep watching</Tag>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <h2 className="title text-[19px] leading-[1.25] text-ink sm:text-[21px]">
          {item.headline}
        </h2>

        <p className="max-w-[68ch] text-[14px] leading-[1.6] text-mute">{item.rationale}</p>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:gap-6">
          <div>
            <Eyebrow className="mb-2">Resting on</Eyebrow>
            <ul className="space-y-1.5">
              {item.evidence.map((e) => (
                <li key={e} className="flex gap-2 text-[13px] leading-snug text-faint">
                  <span className="mt-[7px] size-[3px] shrink-0 rounded-full bg-gray-8" />
                  <span className="num">{e}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="sm:min-w-[168px] sm:border-l sm:border-line-soft sm:pl-5">
            <Eyebrow className="mb-2">Until</Eyebrow>
            <div className="text-[13px] leading-snug text-faint">{item.watchUntil}</div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-raise px-3.5 py-3">
          <Eyebrow className="mb-1.5">Do this instead</Eyebrow>
          <p className="text-[13px] leading-[1.55] text-mute">{item.recommendation}</p>
        </div>
      </div>
    </article>
  )
}
