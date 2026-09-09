'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useConsole } from '@/lib/store'
import { Icon, PanelIcon } from './icons'
import { NAV_FOOTER, NAV_SECTIONS, type NavItem } from './nav-items'

/* Measured off the dashboard: 40px tall, 9px inset, 14px radius, 16px/500. */
const ITEM =
  'group flex h-10 items-center gap-2 rounded-[14px] px-[9px] text-[16px] font-medium leading-[26px] tracking-[-0.016em] transition-colors duration-100'

function Badge({ text, tone }: { text: string; tone: 'blue' | 'gray' }) {
  return (
    <span
      className={`ml-auto inline-flex h-5 shrink-0 items-center rounded-md px-2 text-[12px] font-medium leading-none ${
        tone === 'blue' ? 'bg-blue-9 text-white' : 'bg-gray-4 text-faint'
      }`}
    >
      {text}
    </span>
  )
}

function Item({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const body = (
    <>
      <Icon name={item.icon} className={collapsed ? 'mx-auto' : ''} />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge && <Badge {...item.badge} />}
        </>
      )}
    </>
  )

  const tone = active
    ? 'bg-gray-4 text-ink'
    : item.href
      ? 'text-white/[0.686] hover:bg-gray-3 hover:text-ink'
      : 'text-white/[0.686] hover:text-ink'

  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={`${ITEM} ${tone}`}
      >
        {body}
      </Link>
    )
  }

  return (
    <span
      aria-disabled
      title={
        item.badge?.text === 'Soon'
          ? `${item.label} — Milestone 3`
          : `${item.label} lives in the Whop dashboard`
      }
      className={`${ITEM} ${tone} cursor-default`}
    >
      {body}
    </span>
  )
}

/** The business switcher squares at the top of the rail: 60px, 14px radius. */
function Switcher({ collapsed, name }: { collapsed: boolean; name: string }) {
  const square =
    'flex size-[60px] shrink-0 items-center justify-center rounded-[14px] transition-colors'
  return (
    <div className={`flex gap-2 px-2 pb-2 ${collapsed ? 'flex-col' : ''}`}>
      <span className={`${square} bg-white/[0.07] text-faint`} title="Personal">
        <Icon name="customers" />
      </span>
      <span
        className={`${square} overflow-hidden bg-[linear-gradient(160deg,#8fd9ec,#5fbbd6)] ring-2 ring-ink`}
        title={name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/swolemates-mark.png"
          alt={name}
          className="size-full scale-[1.08] object-contain"
        />
      </span>
      {!collapsed && (
        <span className={`${square} bg-white/[0.07] text-faint`} title="Start a business">
          <span className="text-[22px] leading-none">+</span>
        </span>
      )}
    </div>
  )
}

export function SideNav() {
  const { state, navCollapsed: collapsed, toggleNav: toggle } = useConsole()
  const pathname = usePathname()

  const sections = NAV_SECTIONS.map((s) =>
    s.label === 'Range' ? { ...s, label: state.business.name } : s,
  )

  return (
    <aside
      className={`sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 flex-col border-r border-line bg-ground transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[76px]' : 'w-[279px]'
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-4">
        <Switcher collapsed={collapsed} name={state.business.name} />

        <nav className="flex flex-col gap-[18px] px-2 pb-2">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              {!collapsed && (
                <div className="px-3 py-0.5 text-[14px] font-medium leading-5 tracking-[-0.006em] text-white/[0.447]">
                  {section.label}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <Item
                    key={item.label}
                    item={item}
                    active={!!item.href && item.href === pathname}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Developer, Settings, and the rail toggle sit inline on the last row. */}
      <div className="flex flex-col gap-0.5 border-t border-line px-2 py-2">
        <Item item={NAV_FOOTER[0]} active={false} collapsed={collapsed} />
        <div className="flex items-center gap-0.5">
          <div className="min-w-0 flex-1">
            <Item item={NAV_FOOTER[1]} active={false} collapsed={collapsed} />
          </div>
          {!collapsed && (
            <button
              onClick={toggle}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="flex size-10 shrink-0 items-center justify-center rounded-[14px] text-white/[0.686] transition-colors hover:bg-gray-3 hover:text-ink"
            >
              <PanelIcon />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={toggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="flex h-10 w-full items-center justify-center rounded-[14px] text-white/[0.686] transition-colors hover:bg-gray-3 hover:text-ink"
          >
            <PanelIcon className="rotate-180" />
          </button>
        )}
      </div>
    </aside>
  )
}
