import type { IconName } from './icons'

export interface NavItem {
  label: string
  icon: IconName
  /** Set when this prototype actually owns the screen. */
  href?: string
  badge?: { text: string; tone: 'blue' | 'gray' }
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/**
 * The dashboard's real nav, with an Agent section for the surfaces this
 * prototype owns. Items without an `href` belong to Whop proper — they are
 * rendered for context and do nothing here.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Agent',
    items: [
      { label: 'Brief', icon: 'brief', href: '/' },
      { label: 'Console', icon: 'console', href: '/console' },
      { label: 'Log', icon: 'log', href: '/log' },
    ],
  },
  {
    label: 'Range',
    items: [
      { label: 'Home', icon: 'home' },
      { label: 'Analytics', icon: 'analytics' },
      { label: 'Products', icon: 'products' },
      { label: 'Payments', icon: 'payments' },
      { label: 'Customers', icon: 'customers' },
      { label: 'Websites', icon: 'websites', badge: { text: 'New', tone: 'blue' } },
    ],
  },
  {
    label: 'Grow',
    items: [
      { label: 'Ads', icon: 'ads' },
      { label: 'Workforce', icon: 'workforce', badge: { text: 'Beta', tone: 'blue' } },
      { label: 'Affiliates', icon: 'affiliates' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Cards', icon: 'cards' },
      { label: 'Support', icon: 'support' },
      { label: 'Reports', icon: 'reports' },
    ],
  },
]

export const NAV_FOOTER: NavItem[] = [
  { label: 'Developer', icon: 'developer' },
  { label: 'Settings', icon: 'settings' },
]

/** The three surfaces that get a slot in the small-screen bottom bar. */
export const MOBILE_ITEMS: NavItem[] = NAV_SECTIONS[0].items
