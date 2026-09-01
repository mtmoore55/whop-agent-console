'use client'

import { Eyebrow } from './ui'

/** The dashboard's page heading: 28px/600 at -0.037em, with a one-line sub. */
export function PageHeader({
  title,
  sub,
  right,
}: {
  title: string
  sub: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="title text-[28px] leading-[34px] text-ink">{title}</h1>
        <p className="mt-1.5 max-w-[68ch] text-[14px] leading-[1.5] text-mute">{sub}</p>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}

export { Eyebrow }
