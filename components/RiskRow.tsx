'use client'

import { count, costScale, money } from '@/lib/format'
import type { Policy, Reversibility } from '@/lib/types'

const REVERSIBILITY_COPY: Record<Reversibility, { word: string; sub: string }> = {
  instant: { word: 'Instant', sub: 'undo any time' },
  costly: { word: 'Costly', sub: 'money already moves' },
  irreversible: { word: 'One-way', sub: 'cannot be undone' },
}

/**
 * The three numbers that decide whether you should say yes. Always visible,
 * never behind a disclosure. You should be able to decline from this row alone.
 */
export function RiskRow({
  maxCost,
  reversibility,
  blastRadius,
  policy,
}: {
  maxCost: number
  reversibility: Reversibility
  blastRadius: number
  policy: Policy
}) {
  const scale = costScale(maxCost)
  const costHot = maxCost > policy.perActionCostCeilingUSD
  const blastHot = blastRadius > policy.broadcastCeiling
  const rev = REVERSIBILITY_COPY[reversibility]

  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
      <div className="bg-gray-3 px-3.5 py-3">
        <div className="eyebrow text-faint">Max cost</div>
        <div
          className={`num mt-2 leading-none tracking-[-0.03em] ${costHot ? 'text-red-11' : 'text-ink'}`}
          // Below 640px the whole curve scales with the viewport rather than
          // clipping its top, so a phone keeps the magnitude ordering intact.
          style={{
            fontSize: `clamp(${(scale.fontSize * 0.55).toFixed(1)}px, ${(
              (scale.fontSize / 640) *
              100
            ).toFixed(2)}vw, ${scale.fontSize}px)`,
            fontWeight: scale.fontWeight,
          }}
        >
          {maxCost > 0 ? money(maxCost) : '$0'}
        </div>
        <div className="mt-2 text-[12px] leading-none text-faint">worst case at risk</div>
      </div>

      <div className="bg-gray-3 px-3.5 py-3">
        <div className="eyebrow text-faint">Reversibility</div>
        <div
          className={`mt-2 text-[18px] font-semibold leading-none tracking-[-0.03em] ${
            reversibility === 'irreversible'
              ? 'text-red-11'
              : reversibility === 'costly'
                ? 'text-ink'
                : 'text-mute'
          }`}
        >
          {rev.word}
        </div>
        <div className="mt-2 text-[12px] leading-none text-faint">{rev.sub}</div>
      </div>

      <div className="bg-gray-3 px-3.5 py-3">
        <div className="eyebrow text-faint">Blast radius</div>
        <div
          className={`num mt-2 text-[18px] font-semibold leading-none tracking-[-0.03em] ${
            blastHot ? 'text-red-11' : blastRadius > 0 ? 'text-ink' : 'text-mute'
          }`}
        >
          {count(blastRadius)}
        </div>
        <div className="mt-2 text-[12px] leading-none text-faint">
          {blastRadius === 1 ? 'person feels this' : 'people feel this'}
        </div>
      </div>
    </div>
  )
}
