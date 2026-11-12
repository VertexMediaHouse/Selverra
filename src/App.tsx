import { useEffect, useMemo, useState } from 'react'
import { Archive, BarChart3, Bell, CalendarDays, Check, ChevronsUpDown, Clock, Gauge, Gem, Image, LayoutDashboard, ListTodo, LogOut, Megaphone, Moon, Plus, Search, Settings as SettingsIcon, Shield, Sun, Users, UsersRound, Wallet } from 'lucide-react'
import { Avatar, CollectionIcon, Dot, cx, Menu, MenuLabel, Toaster } from './components/ui'
import { CommandPalette, NAV, ShortcutsHelp, toggleTheme, useShortcuts } from './components/CommandPalette'
import { LeadPanel } from './components/LeadPanel'
import { NewLeadModal, StatusModal } from './components/LeadModals'
import { AlertItem } from './components/Alerts'
import { go, useNow, useStore } from './store'
import { LEVELS, levelOf, pagesFor, type Level } from './levels'
import { waitingMinutes } from './lib/leads'
import Owner from './pages/Owner'
import Team from './pages/Team'
import MyDashboard from './pages/MyDashboard'
import Login from './pages/Login'
import Access from './pages/Access'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
// Lead-working pages belong to managers and sales staff, not the owner.
import Overview from './pages/archive/Overview'
import Today from './pages/archive/Today'
import Leads from './pages/archive/Leads'
import Campaigns from './pages/archive/Campaigns'
import Creatives from './pages/archive/Creatives'
import Budgets from './pages/archive/Budgets'
import Insights from './pages/archive/Insights'

const ICONS: Record<string, typeof LayoutDashboard> = {
  owner: Shield, team: UsersRound, mywork: Gauge, overview: LayoutDashboard, today: ListTodo, leads: Users, calendar: CalendarDays, campaigns: Megaphone,
  creatives: Image, budgets: Wallet, insights: BarChart3, access: Shield, settings: SettingsIcon,
}

// Settings lives in the account menu, so it is never a rail icon. `access` is a rail icon for
// the owner (it is their admin page) and withheld from everyone else by the allow-list anyway.
const railFor = (level: Level) => {
  const allowed = pagesFor(level)
  return NAV.filter(n => n.path !== 'settings' && allowed.has(n.path))
}

function useDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const on = () => setDark(document.documentElement.classList.contains('dark'))
    window.addEventListener('themechange', on)
    return () => window.removeEventListener('themechange', on)
  }, [])
  return dark
}

/** Product category scope: limits campaigns, ads and enquiries. */
function CategorySwitcher() {
  const { categories, filters, setFilters, categoryById } = useStore()
  const current = categoryById.get(filters.category)
  return (
    <Menu label="Filter by product category" button={
      <button className="flex w-full items-center gap-2 rounded-[var(--radius-input)] border border-white/40 bg-white/30 px-3 py-2 text-sm text-[var(--color-text-primary)] transition hover:bg-white/50">
        <Gem size={15} className="text-[var(--color-text-muted)]" />
        <span className="min-w-0 flex-1 truncate text-left">{current?.name ?? 'All products'}</span>
        <ChevronsUpDown size={13} className="text-[var(--color-text-muted)]" />
      </button>
    }>
      {close => (
        <>
          <MenuLabel>Product category</MenuLabel>
          <div className="max-h-72 overflow-y-auto">
            {[{ id: '', name: 'All products', color: '' }, ...categories].map(c => (
              <button key={c.id} role="menuitem" onClick={() => { setFilters({ category: c.id, campaignId: '' }); close() }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-black/5">
                {c.id ? <CollectionIcon id={c.id} size={15} /> : <Gem size={14} className="text-[var(--color-text-muted)]" />}
                <span className="flex-1">{c.name}</span>
                {filters.category === c.id && <Check size={14} className="text-[var(--color-accent-mint-text)]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </Menu>
  )
}

function AlertsBell() {
  const { alerts } = useStore()
  const urgent = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length
  return (
    <Menu label="Alerts" align="right" button={
      <button className="relative flex size-9 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-primary)] transition hover:bg-black/5" aria-label={`Alerts (${alerts.length})`}>
        <Bell size={18} />
        {alerts.length > 0 && (
          <span className={cx('absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white', urgent ? 'bg-rose-500' : 'bg-[var(--color-accent-mint)]')}>
            {alerts.length}
          </span>
        )}
      </button>
    }>
      {close => (
        <div className="w-[min(92vw,400px)]">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <p className="text-sm font-semibold">Alerts</p>
            <a href="#/overview" onClick={close} className="text-xs text-[var(--color-accent-mint-text)] hover:underline">See all</a>
          </div>
          {alerts.length === 0
            ? <p className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">All clear. Nothing needs attention.</p>
            : (
              <ul className="max-h-[60vh] divide-y divide-black/5 overflow-y-auto">
                {alerts.slice(0, 8).map(a => <AlertItem key={a.id} alert={a} onDone={close} />)}
              </ul>
            )}
        </div>
      )}
    </Menu>
  )
}

/** Left icon rail. Dark slab, one icon per module. */
function Rail({ section, level }: { section: string; level: Level }) {
  return (
    <nav className="rail flex w-16 shrink-0 flex-col items-center gap-1 py-4" aria-label="Modules">
      <div className="mb-5 flex size-10 items-center justify-center rounded-2xl bg-white/10 text-lg text-white">✳</div>
      {railFor(level).map(n => {
        const Icon = ICONS[n.path]
        const active = section === n.path
        return (
          <a key={n.path} href={`#/${n.path}`} title={n.label} aria-label={n.label} aria-current={active ? 'page' : undefined}
            className={cx('flex size-10 items-center justify-center rounded-2xl transition-all',
              active ? 'bg-white text-black shadow-md' : 'text-white/50 hover:bg-white/10 hover:text-white')}>
            <Icon size={19} />
          </a>
        )
      })}
      <a href="#/settings" title="Settings" aria-label="Settings" aria-current={section === 'settings' ? 'page' : undefined}
        className={cx('mt-auto flex size-10 items-center justify-center rounded-2xl transition-all',
          section === 'settings' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-white/50 hover:text-white')}>
        <SettingsIcon size={19} />
      </a>
    </nav>
  )
}

/** Per-module badge counts, so the sidebar carries live numbers like the reference. */
function useCounts() {
  const { scoped, settings, alerts } = useStore()
  const now = useNow()
  return useMemo(() => ({
    today: scoped.tasks.filter(t => !t.done).length,
    leads: scoped.leads.filter(l => l.status === 'New').length,
    campaigns: scoped.campaigns.filter(c => c.status === 'ACTIVE').length,
    overview: alerts.length,
    overdue: scoped.leads.filter(l => (waitingMinutes(l, now) ?? 0) > settings.slaMinutes).length,
  }), [scoped, settings.slaMinutes, alerts, now])
}

function Sidebar({ section, level }: { section: string; level: Level }) {
  const { me, brand, scoped, setNewLeadOpen, openLead } = useStore()
  const counts = useCounts()
  const [q, setQ] = useState('')
  // The owner watches the business; manager and sales work the enquiry queue.
  const worksLeads = level !== 'Owner'

  const recent = useMemo(() => {
    const term = q.trim().toLowerCase()
    return scoped.leads
      .filter(l => !term || l.name.toLowerCase().includes(term) || (l.phone ?? '').includes(term))
      .slice(0, 8)
  }, [scoped.leads, q])

  return (
    <aside className="panel flex w-64 shrink-0 flex-col overflow-hidden p-4">
      {/* Profile */}
      <Menu label="Account" button={
        <button className="flex w-full items-center gap-2.5 rounded-[var(--radius-input)] p-1.5 text-left transition hover:bg-white/40">
          <Avatar name={me?.name} size="md" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold text-[var(--color-text-primary)]">
              <span className="truncate">{me?.name ?? 'Signed out'}</span>
              <ChevronsUpDown size={12} className="shrink-0 text-[var(--color-text-muted)]" />
            </span>
            <span className="block truncate text-xs text-[var(--color-text-muted)]">{me?.email ?? brand?.name ?? '—'}</span>
          </span>
        </button>
      }>
        {close => <AccountMenu close={close} />}
      </Menu>

      <div className="mt-3"><CategorySwitcher /></div>

      {/* Module groups — owner sees business + admin, staff see the enquiry workspace */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {LEVELS[level].groups.map(g => (
          <div key={g.title} className="mb-4">
            <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">{g.title}</p>
            {g.paths.map(p => {
              const n = NAV.find(x => x.path === p)!
              const Icon = ICONS[p]
              const active = section === p
              const count = counts[p as keyof typeof counts]
              return (
                <a key={p} href={`#/${p}`} aria-current={active ? 'page' : undefined}
                  className={cx('flex items-center gap-2.5 rounded-[var(--radius-input)] px-2.5 py-2 text-sm transition',
                    active ? 'bg-white/60 font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-inset)]' : 'text-[var(--color-text-primary)]/75 hover:bg-white/30')}>
                  <Icon size={16} className={active ? '' : 'text-[var(--color-text-muted)]'} />
                  <span className="flex-1 truncate">{n.label}</span>
                  {count > 0 && <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{count}</span>}
                </a>
              )
            })}
          </div>
        ))}

        {worksLeads && <>
        {/* Attention — the "Status" block from the reference, driven by SLA */}
        <div className="mb-4 border-t border-[var(--color-border-subtle)] pt-3">
          <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Attention</p>
          <a href="#/leads?status=New" className="flex items-center gap-2.5 rounded-[var(--radius-input)] px-2.5 py-2 text-sm text-[var(--color-text-primary)]/75 transition hover:bg-white/30">
            <Clock size={16} className="text-[var(--color-text-muted)]" />
            <span className="flex-1 truncate">Past SLA</span>
            {counts.overdue > 0 && <span className="rounded-full bg-rose-500/15 px-1.5 text-xs font-semibold tabular-nums text-rose-600">{counts.overdue}</span>}
          </a>
          <a href="#/leads" className="flex items-center gap-2.5 rounded-[var(--radius-input)] px-2.5 py-2 text-sm text-[var(--color-text-primary)]/75 transition hover:bg-white/30">
            <Archive size={16} className="text-[var(--color-text-muted)]" />
            <span className="flex-1 truncate">All enquiries</span>
            <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{scoped.leads.length}</span>
          </a>
        </div>

        {/* Enquiry quick-find — the "Documents" block from the reference */}
        <div className="border-t border-[var(--color-border-subtle)] pt-3">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">Enquiries</p>
            <button onClick={() => setNewLeadOpen(true)} aria-label="New enquiry"
              className="flex size-5 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-black/5 hover:text-[var(--color-text-primary)]">
              <Plus size={13} />
            </button>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search enquiries"
              className="input w-full py-1.5 pl-8 text-sm placeholder:text-[var(--color-text-muted)]" />
          </div>
          <ul>
            {recent.map(l => (
              <li key={l.id}>
                <button onClick={() => openLead(l.id)}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-input)] px-2.5 py-1.5 text-left text-sm text-[var(--color-text-primary)]/80 transition hover:bg-white/30">
                  <Dot color={undefined} className="size-2" />
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                </button>
              </li>
            ))}
            {recent.length === 0 && <li className="px-2.5 py-3 text-xs text-[var(--color-text-muted)]">No matches.</li>}
          </ul>
        </div>
        </>}
      </div>
    </aside>
  )
}

function AccountMenu({ close }: { close: () => void }) {
  const { users, me, setMe, signOut } = useStore()
  const dark = useDark()
  return (
    <>
      <MenuLabel>Signed in as</MenuLabel>
      {/* Switching accounts reloads every scoped read, so the view changes level too. */}
      <div className="max-h-60 overflow-y-auto">
        {users.map(u => (
          <button key={u.id} role="menuitem" onClick={() => { setMe(u.id); close() }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-black/5">
            <Avatar name={u.name} size="xs" />
            <span className="min-w-0 flex-1 truncate">{u.name}</span>
            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{u.role}</span>
            {me?.id === u.id && <Check size={14} className="text-[var(--color-accent-mint-text)]" />}
          </button>
        ))}
      </div>
      <div className="mt-1 border-t border-[var(--color-border-subtle)] pt-1">
        <button role="menuitem" onClick={() => { toggleTheme(); close() }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-black/5">
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{dark ? 'Light theme' : 'Dark theme'}</span>
        </button>
        <button role="menuitem" onClick={() => { go('#/settings'); close() }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-black/5">
          <SettingsIcon size={14} /><span>Settings</span>
        </button>
        <button role="menuitem" onClick={() => { close(); signOut() }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-rose-600 hover:bg-rose-500/10">
          <LogOut size={14} /><span>Sign out</span>
        </button>
      </div>
    </>
  )
}

export default function App() {
  const { route, openLeadId, statusPrompt, newLeadOpen, me, loading, signIn } = useStore()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const openers = useMemo(() => ({ palette: () => setPaletteOpen(true), help: () => setHelpOpen(true) }), [])
  useShortcuts(openers)

  // Signed out, or the session id no longer matches a user: back to the login screen.
  if (!me) return loading ? <div className="min-h-screen bg-[var(--color-page-bg)]" /> : <Login onSignIn={signIn} />

  const level = levelOf(me.role)
  const { home } = LEVELS[level]
  const [requested = home] = route
  // A level cannot open a page outside its allow-list, however the hash was typed.
  const section = pagesFor(level).has(requested) ? requested : home

  const page = ({
    owner: <Owner />, team: <Team />, mywork: <MyDashboard />, overview: <Overview />, today: <Today />, leads: <Leads />, calendar: <Calendar />, campaigns: <Campaigns />,
    creatives: <Creatives />, budgets: <Budgets />, insights: <Insights />, access: <Access />, settings: <Settings />,
  } as Record<string, React.ReactNode>)[section] ?? <Overview />

  return (
    <div className="flex h-screen gap-3 overflow-hidden bg-[var(--color-page-bg)] p-3">
      <Rail section={section} level={level} />
      <Sidebar section={section} level={level} />

      <main className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-8 py-4">
          <button onClick={() => setPaletteOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-[var(--radius-input)] border border-white/40 bg-white/30 px-3 py-2 text-sm text-[var(--color-text-muted)] transition hover:bg-white/50">
            <Search size={15} />
            <span>Search or jump to…</span>
          </button>
          <AlertsBell />
        </header>
        {openLeadId
          ? <div className="min-h-0 flex-1 overflow-hidden"><LeadPanel /></div>
          : <div className="min-h-0 flex-1 overflow-y-auto p-8">{page}</div>}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onHelp={() => { setPaletteOpen(false); setHelpOpen(true) }} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      {newLeadOpen && <NewLeadModal />}
      {statusPrompt && <StatusModal />}
      <Toaster />
    </div>
  )
}
