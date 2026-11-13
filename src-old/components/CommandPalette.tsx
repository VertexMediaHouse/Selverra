import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { ArrowRight, Gem, Keyboard, Megaphone, Moon, Search, UserPlus, Users } from 'lucide-react'
import { go, useStore } from '../store'
import { CollectionIcon, cx, Kbd, LeadStatusBadge, Modal } from './ui'

export const NAV = [
  { path: 'owner', label: 'Owner dashboard', key: 'd' },
  { path: 'team', label: 'My team', key: 'm' },
  { path: 'mywork', label: 'My performance', key: 'p' },
  { path: 'overview', label: 'Overview', key: 'o' },
  { path: 'today', label: 'Today', key: 't' },
  { path: 'leads', label: 'Enquiries', key: 'l' },
  { path: 'calendar', label: 'Calendar', key: 'k' },
  { path: 'campaigns', label: 'Campaigns', key: 'c' },
  { path: 'creatives', label: 'Creatives', key: 'r' },
  { path: 'budgets', label: 'Budgets', key: 'b' },
  { path: 'insights', label: 'Insights', key: 'i' },
  { path: 'access', label: 'Access', key: 'a' },
  { path: 'settings', label: 'Settings', key: 's' },
] as const

export function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark')
  if (dark) localStorage.theme = 'dark'
  else localStorage.removeItem('theme') // light is default; don't persist a stale 'dark'
  window.dispatchEvent(new Event('themechange'))
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

/** Global keys: Ctrl/⌘+K palette, g+letter navigation, / search, n new lead, ? help. */
export function useShortcuts(open: { palette: () => void; help: () => void }) {
  const { setNewLeadOpen } = useStore()
  useEffect(() => {
    let pendingG = 0
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open.palette(); return }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || document.querySelector('dialog[open]')) return
      if (pendingG && Date.now() - pendingG < 1200) {
        const nav = NAV.find(n => n.key === e.key)
        pendingG = 0
        if (nav) { e.preventDefault(); go(`#/${nav.path}`) }
        return
      }
      if (e.key === 'g') pendingG = Date.now()
      else if (e.key === '/') { const el = document.querySelector<HTMLInputElement>('[data-search]'); if (el) { e.preventDefault(); el.focus() } }
      else if (e.key === 'n') { e.preventDefault(); setNewLeadOpen(true) }
      else if (e.key === '?') open.help()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setNewLeadOpen])
}

interface Item { id: string; group: string; label: ReactNode; text: string; icon: ReactNode; hint?: ReactNode; run: () => void }

export function CommandPalette({ open, onClose, onHelp }: { open: boolean; onClose: () => void; onHelp: () => void }) {
  const { leads, campaigns, categories, categoryById, setFilters, setNewLeadOpen, openLead } = useStore()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDialogElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const d = ref.current
    if (open && d && !d.open) { setQ(''); setActive(0); d.showModal() }
    if (!open && d?.open) d.close()
  }, [open])

  const items = useMemo<Item[]>(() => {
    const s = q.trim().toLowerCase()
    const digits = s.replace(/\D/g, '')
    const match = (t: string) => !s || t.toLowerCase().includes(s)
    const out: Item[] = []
    out.push(...NAV.filter(n => match(n.label)).map(n => ({ id: `nav:${n.path}`, group: 'Go to', label: n.label, text: n.label, icon: <ArrowRight size={15} />, hint: <span className="flex gap-1"><Kbd>g</Kbd><Kbd>{n.key}</Kbd></span>, run: () => go(`#/${n.path}`) })))
    const actions: Item[] = [
      { id: 'a:new', group: 'Actions', label: 'Add enquiry', text: 'add new lead enquiry create walk-in', icon: <UserPlus size={15} />, hint: <Kbd>n</Kbd>, run: () => setNewLeadOpen(true) },
      { id: 'a:theme', group: 'Actions', label: 'Toggle dark mode', text: 'toggle dark light theme mode', icon: <Moon size={15} />, run: toggleTheme },
      { id: 'a:help', group: 'Actions', label: 'Keyboard shortcuts', text: 'keyboard shortcuts help', icon: <Keyboard size={15} />, hint: <Kbd>?</Kbd>, run: onHelp },
    ]
    out.push(...actions.filter(a => match(a.text)))
    out.push(...[{ id: '', name: 'All products', color: undefined as string | undefined }, ...categories].filter(c => match(`product category ${c.name}`)).map(c => ({
      id: `cat:${c.id}`, group: 'Product category', label: c.name, text: c.name, icon: c.id ? <CollectionIcon id={c.id} size={15} /> : <Gem size={15} />,
      run: () => setFilters({ category: c.id, campaignId: '' }),
    })))
    if (s.length >= 2) {
      out.push(...leads.filter(l => l.name.toLowerCase().includes(s) || l.email.includes(s) || (digits.length >= 3 && l.phone.replace(/\D/g, '').includes(digits))).slice(0, 6).map(l => ({
        id: `lead:${l.id}`, group: 'Enquiries', label: <span className="flex items-center gap-2">{l.name}<span className="text-xs text-slate-400">{categoryById.get(l.categoryId)?.name}</span></span>,
        text: l.name, icon: <Users size={15} />, hint: <LeadStatusBadge status={l.status} />, run: () => openLead(l.id),
      })))
      out.push(...campaigns.filter(c => c.name.toLowerCase().includes(s)).slice(0, 5).map(c => ({
        id: `camp:${c.id}`, group: 'Campaigns', label: c.name, text: c.name, icon: <Megaphone size={15} />, run: () => go(`#/campaigns/${c.id}`),
      })))
    }
    return out
  }, [q, leads, campaigns, categories, categoryById, setFilters, setNewLeadOpen, openLead, onHelp])

  useEffect(() => setActive(0), [q])
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }) }, [active])

  const run = (it: Item) => { onClose(); it.run() }
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    if (e.key === 'Enter' && items[active]) { e.preventDefault(); run(items[active]) }
  }

  let lastGroup = ''
  return (
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel-bg)] p-0 text-[var(--color-text-primary)] shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
        <Search size={18} className="text-slate-400" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} aria-label="Search commands"
          placeholder="Search enquiries, campaigns, products, pages…" className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400" />
        <Kbd>Esc</Kbd>
      </div>
      <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
        {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-500">No results for “{q}”</li>}
        {items.map((it, i) => {
          const header = it.group !== lastGroup ? (lastGroup = it.group) : null
          return (
            <li key={it.id}>
              {header && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{header}</p>}
              <button role="option" aria-selected={i === active} data-active={i === active} onMouseMove={() => setActive(i)} onClick={() => run(it)}
                className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm', i === active && 'bg-slate-100 dark:bg-slate-800')}>
                <span className="text-slate-400">{it.icon}</span>
                <span className="flex-1 truncate">{it.label}</span>
                {it.hint}
              </button>
            </li>
          )
        })}
      </ul>
    </dialog>
  )
}

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: [ReactNode, string][] = [
    [<><Kbd>Ctrl</Kbd><Kbd>K</Kbd></>, 'Command palette / search anything'],
    [<Kbd>/</Kbd>, 'Focus search on the page'],
    [<Kbd>n</Kbd>, 'Add an enquiry'],
    [<Kbd>?</Kbd>, 'Show this help'],
    [<Kbd>Esc</Kbd>, 'Close panel or dialog'],
    ...NAV.map(n => [<><Kbd>g</Kbd><Kbd>{n.key}</Kbd></>, `Go to ${n.label}`] as [ReactNode, string]),
  ]
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <dl className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map(([k, d]) => <div key={d} className="flex items-center justify-between py-2 text-sm"><dt>{d}</dt><dd className="flex gap-1">{k}</dd></div>)}
      </dl>
    </Modal>
  )
}
