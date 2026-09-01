'use client'

import { MobileNav } from './MobileNav'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'

/** Whop's shell: full-width header, rail beneath it on the left, content right. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      <div className="flex items-start">
        <SideNav />
        <main className="min-w-0 flex-1 pb-[74px] md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
