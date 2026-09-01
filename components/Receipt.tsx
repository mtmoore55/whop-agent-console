'use client'

import type { ReceiptLine } from '@/lib/types'
import { Eyebrow } from './ui'

/** What actually changed in the business state. */
export function Receipt({ lines }: { lines: ReceiptLine[] }) {
  if (!lines.length) return null
  return (
    <div className="rise overflow-hidden rounded-xl border border-line bg-raise">
      <div className="border-b border-line-soft px-3.5 py-2.5">
        <Eyebrow>Receipt</Eyebrow>
      </div>
      <dl className="divide-y divide-line-soft">
        {lines.map((l, i) => (
          <div
            key={`${l.label}-${i}`}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3.5 py-2.5"
          >
            <dt className="text-[14px] text-mute">{l.label}</dt>
            <dd className="flex items-baseline gap-2">
              <span className="num text-[13px] text-faint line-through">{l.before}</span>
              <span className="text-[12px] text-faint">→</span>
              <span className="num text-[14px] font-semibold text-ink">{l.after}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
