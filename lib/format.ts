/** Formatting + the visual-weight scale for money. */

const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const usd2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function money(n: number, opts: { cents?: boolean } = {}): string {
  if (opts.cents) return usd2.format(n)
  return usd0.format(n)
}

export function compactMoney(n: number): string {
  if (Math.abs(n) >= 1000) {
    const k = n / 1000
    const s = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)
    return `$${s}k`
  }
  return usd0.format(n)
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

export function signedPct(n: number, digits = 1): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`
}

export function count(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${count(n)} ${n === 1 ? one : many}`
}

/**
 * Money gets visual weight proportional to its actual weight.
 * A $61,000 treasury move should not look like a $140 ad budget change.
 * Log curve over roughly $10 -> $100,000, mapped to 14px -> 39px.
 */
export function costScale(dollars: number): { fontSize: number; fontWeight: number } {
  const t = Math.min(1, Math.max(0, (Math.log10(Math.max(dollars, 0) + 1) - 1) / 4))
  return {
    fontSize: Math.round((14 + 25 * t) * 10) / 10,
    fontWeight: dollars >= 10_000 ? 700 : dollars >= 1_000 ? 600 : 500,
  }
}

export function daysFromNow(todayISO: string, days: number): string {
  const d = new Date(`${todayISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function shortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}
