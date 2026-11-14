import type { ReactNode } from 'react'
import type { Role } from '../data/types'
import {
  IconCalendar,
  IconCampaigns,
  IconDashboard,
  IconLeads,
  IconSettings,
  IconSync,
  IconTasks,
} from './icons'

export type Route =
  | 'dashboard'
  | 'leads'
  | 'kanban'
  | 'lead'
  | 'campaigns'
  | 'campaign'
  | 'tasks'
  | 'calendar'
  | 'sync'
  | 'settings'

type NavItem = {
  route: Route
  label: string
  icon: ReactNode
  badge?: { text: string; tone: 'blush' | 'alert' }
  /** Routes that should also light this item up. */
  also?: Route[]
}

const WHO: Record<Role, { name: string; scope: string }> = {
  owner: { name: 'Signed in as Owner', scope: 'Sees every team and every lead' },
  manager: { name: 'Mansi Shah · Manager', scope: 'Sees her teams: Bridal and Gifting' },
  sales: { name: 'Neha Shah · Sales', scope: 'Sees only her own leads and tasks' },
}

function navFor(role: Role): { main: NavItem[]; foot: NavItem[] } {
  if (role === 'sales') {
    return {
      main: [
        { route: 'dashboard', label: 'My day', icon: <IconDashboard /> },
        {
          route: 'leads',
          label: 'My leads',
          icon: <IconLeads />,
          badge: { text: '1 new', tone: 'blush' },
          also: ['kanban', 'lead'],
        },
        { route: 'calendar', label: 'My calendar', icon: <IconCalendar /> },
        {
          route: 'tasks',
          label: 'My tasks',
          icon: <IconTasks />,
          badge: { text: '5 left', tone: 'blush' },
        },
      ],
      foot: [],
    }
  }
  const main: NavItem[] = [
    { route: 'dashboard', label: 'Dashboard', icon: <IconDashboard /> },
    {
      route: 'leads',
      label: 'Leads',
      icon: <IconLeads />,
      badge: { text: '6 new', tone: 'blush' },
      also: ['kanban', 'lead'],
    },
    { route: 'calendar', label: 'Calendar', icon: <IconCalendar /> },
    { route: 'campaigns', label: 'Campaigns', icon: <IconCampaigns />, also: ['campaign'] },
    {
      route: 'tasks',
      label: 'Tasks',
      icon: <IconTasks />,
      badge: { text: '4 late', tone: 'alert' },
    },
  ]
  const foot: NavItem[] =
    role === 'owner'
      ? [
          { route: 'sync', label: 'Sync Data', icon: <IconSync /> },
          { route: 'settings', label: 'Settings', icon: <IconSettings /> },
        ]
      : [{ route: 'settings', label: 'Settings', icon: <IconSettings /> }]
  return { main, foot }
}

function NavLink({
  item,
  current,
  go,
}: {
  item: NavItem
  current: Route
  go: (r: Route) => void
}) {
  const on = current === item.route || (item.also?.includes(current) ?? false)
  return (
    <a
      href={`#/${item.route}`}
      aria-current={on ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault()
        go(item.route)
      }}
      className={`box-border flex min-h-0 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] leading-5 no-underline transition-colors ${
        on ? 'bg-white/10 font-semibold text-white' : 'font-medium text-rail-text hover:bg-white/5 hover:text-white'
      }`}
    >
      {item.icon}
      {item.label}
      {item.badge ? (
        <span
          className={`ml-auto rounded-full px-1.5 py-px text-[10px] font-semibold ${
            item.badge.tone === 'alert' ? 'bg-[#F4C7C3] text-[#5C1610]' : 'bg-blush text-rail'
          }`}
        >
          {item.badge.text}
        </span>
      ) : null}
    </a>
  )
}

export function Shell({
  role,
  route,
  go,
  children,
}: {
  role: Role
  route: Route
  go: (r: Route) => void
  children: ReactNode
}) {
  const { main, foot } = navFor(role)
  const who = WHO[role]
  return (
    <div className="flex min-h-screen bg-ground">
      <nav
        aria-label="Main menu"
        className="box-border flex h-screen w-[220px] shrink-0 flex-col gap-0.5 overflow-y-auto bg-rail p-2 sticky top-0"
      >
        <div className="flex items-center gap-2.5 px-2.5 pt-1 pb-3">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-blush text-[15px] font-bold text-rail"
          >
            S
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-white">Selverra</span>
            <span className="text-xs text-rail-mute">Leads CRM</span>
          </div>
        </div>

        {main.map((i) => (
          <NavLink key={i.route} item={i} current={route} go={go} />
        ))}

        {foot.length ? (
          <div className="mt-auto flex flex-col gap-0.5 border-t border-white/10 pt-2">
            {foot.map((i) => (
              <NavLink key={i.route} item={i} current={route} go={go} />
            ))}
          </div>
        ) : null}

        <div className={`flex flex-col gap-0.5 px-2.5 pt-2 pb-0.5 ${foot.length ? '' : 'mt-auto border-t border-white/10'}`}>
          <span className="text-[13px] font-semibold text-white">{who.name}</span>
          <span className="text-xs text-rail-mute">{who.scope}</span>
        </div>
      </nav>

      <main className="box-border flex min-w-0 flex-1 flex-col gap-5 p-5">
        {children}
      </main>
    </div>
  )
}

/** The "Preview as" role switch that sits in the dashboard headers. */
export function RoleSwitch({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  const opts: [Role, string][] = [
    ['owner', 'Owner'],
    ['manager', 'Manager'],
    ['sales', 'Salesperson'],
  ]
  return (
    <div
      role="group"
      aria-label="Preview dashboard as"
      className="flex items-center gap-1 rounded-xl border border-dashed border-[#C9C0BB] bg-surface p-1"
    >
      <span className="px-1.5 text-xs text-ink-mute">Preview as</span>
      {opts.map(([id, label]) => {
        const on = id === role
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => setRole(id)}
            className={`min-h-9 cursor-pointer rounded-[9px] border-0 px-3 text-[13px] ${
              on ? 'bg-rail font-semibold text-white' : 'bg-transparent font-medium text-ink-soft'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
