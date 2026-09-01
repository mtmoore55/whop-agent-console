'use client'

import { AiChatProvider } from './AiChat'
import { AiPanel } from './AiPanel'
import { MobileNav } from './MobileNav'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'

/**
 * Whop's shell: full-width header, rail beneath it on the left, content in the
 * middle, and the assistant panel on the right when it is open.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AiChatProvider>
      <div className="min-h-dvh">
        <TopBar />
        <div className="flex items-start">
          <SideNav />
          <main className="@container min-w-0 flex-1 pb-[74px] md:pb-0">{children}</main>
          <AiPanel />
        </div>
        <MobileNav />
      </div>
    </AiChatProvider>
  )
}
