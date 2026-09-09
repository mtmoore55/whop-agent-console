'use client'

import { useEffect, useRef, useState } from 'react'

/** Flashes a number in Whop orange when its value actually changes. */
export function useFlash(value: string | number): string {
  const prev = useRef(value)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    setOn(true)
    const t = setTimeout(() => setOn(false), 900)
    return () => clearTimeout(t)
  }, [value])

  return on ? 'flash' : ''
}

export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`eyebrow text-faint ${className}`}>{children}</div>
}

type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger'

/** Sizing, weight and radius match the dashboard's fui-Button size-2. */
const BTN: Record<BtnVariant, string> = {
  primary:
    'bg-blue-9 text-white hover:bg-[#1a5ce8] active:bg-blue-10 disabled:bg-gray-3 disabled:text-faint',
  soft: 'bg-gray-3 text-ink hover:bg-gray-4 disabled:text-faint',
  ghost: 'text-mute hover:bg-gray-3 hover:text-ink',
  danger: 'text-red-11 hover:bg-red-surface',
}

export function Btn({
  variant = 'soft',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...props}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium leading-none tracking-[-0.0056em] transition-colors duration-100 disabled:cursor-not-allowed ${BTN[variant]} ${className}`}
    />
  )
}

type Tone = 'gray' | 'blue' | 'red' | 'green' | 'amber' | 'brand'

const TAG: Record<Tone, string> = {
  gray: 'bg-gray-3 text-mute',
  blue: 'bg-blue-surface text-blue-11',
  red: 'bg-red-surface text-red-11',
  green: 'bg-green-surface text-green-11',
  amber: 'bg-amber-surface text-amber-11',
  brand: 'bg-brand-surface text-brand-text',
}

/**
 * The chips on the agent bar are compressed to two words and were unreadable
 * without explanation. Native `title` is slow and invisible on touch, so this
 * is a real popover on hover and on keyboard focus.
 */
export function Hint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group/hint relative inline-flex items-center">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-line bg-gray-3 px-2.5 py-2 text-[12px] font-normal leading-snug text-mute opacity-0 shadow-lg shadow-black/40 transition-opacity duration-100 group-hover/hint:opacity-100 group-focus-within/hint:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}

export function Tag({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded-md px-2 text-[12px] font-medium leading-none tracking-[-0.005em] ${TAG[tone]}`}
    >
      {children}
    </span>
  )
}
