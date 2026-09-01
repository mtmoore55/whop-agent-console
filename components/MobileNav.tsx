'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from './icons'
import { MOBILE_ITEMS } from './nav-items'

/** The dashboard drops the rail for a bottom bar on small screens. So does this. */
export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[58px] items-stretch border-t border-line bg-ground/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
      {MOBILE_ITEMS.map((item) => {
        const active = !!item.href && item.href === pathname
        const inner = (
          <>
            <Icon name={item.icon} />
            <span className="text-[11px] font-medium leading-none">{item.label}</span>
          </>
        )
        const cls = `flex flex-1 flex-col items-center justify-center gap-1.5 ${
          active ? 'text-ink' : 'text-white/[0.55]'
        }`
        return item.href ? (
          <Link key={item.label} href={item.href} aria-current={active ? 'page' : undefined} className={cls}>
            {inner}
          </Link>
        ) : (
          <span key={item.label} aria-disabled className={`${cls} opacity-60`}>
            {inner}
          </span>
        )
      })}
    </nav>
  )
}
