import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, type NewLeadInput, type StatusDetails } from './data/api'
import type { Ad, AdSet, Brand, Campaign, Category, FestiveDate, Insight, Lead, LeadStatus, Module, Permission, Settings, Share, Task, Template, User } from './data/types'
import { shareableTargets } from './lib/shares'
import { addDays, todayIso } from './lib/metrics'
import { alertsFrom, computeAlerts, type Alert } from './lib/alerts'
import { LEVELS, levelOf } from './levels'

// ---------- async helpers ----------
const insightCache = new Map<string, Insight[]>()

/**
 * Who is signed in, for hooks that run inside StoreProvider and so cannot use the context.
 * Set on every render of the provider, before any child hook reads it.
 */
let currentUserId = ''
/** Drop cached rows on sign-out/in: another user must never be served this user's rows. */
export function setCurrentUser(id: string) {
  if (id !== currentUserId) insightCache.clear()
  currentUserId = id
}

/** Cached per user + range + category, so navigating back doesn't flash skeletons. */
export function useInsights(from: string, to: string, categoryId = '') {
  const me = currentUserId
  // `me` is part of the key: insights are category-gated, so two users get different rows.
  const key = `${me}|${from}|${to}|${categoryId}`
  const [state, setState] = useState<{ data?: Insight[]; loading: boolean }>(() => ({ data: insightCache.get(key), loading: !insightCache.has(key) }))
  useEffect(() => {
    if (!me) return setState({ data: [], loading: false })
    const hit = insightCache.get(key)
    if (hit) return setState({ data: hit, loading: false })
    let live = true
    setState(s => ({ ...s, loading: true }))
    api.getInsights(me, from, to, categoryId || undefined).then(data => {
      insightCache.set(key, data)
      if (live) setState({ data, loading: false })
    })
    return () => { live = false }
  }, [key, me, from, to, categoryId])
  return state
}

/** Re-render every `ms` for live timers. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return initial }
  })
  useEffect(() => localStorage.setItem(key, JSON.stringify(v)), [key, v])
  return [v, setV] as const
}

// ---------- filters <-> URL ----------
export type Preset = 7 | 14 | 30 | 60 | 'custom'
export interface Filters {
  category: string // '' = all product categories (scopes campaigns and leads)
  preset: Preset
  from: string
  to: string
  campaignId: string
  status: LeadStatus | ''
  assigneeId: string // '' all, 'none' unassigned
  score: '' | 'Hot' | 'Warm' | 'Cold'
  search: string
}
const presetRange = (days: number) => ({ from: addDays(todayIso(), -(days - 1)), to: todayIso() })
const DEFAULTS: Filters = { category: '', preset: 30, ...presetRange(30), campaignId: '', status: '', assigneeId: '', score: '', search: '' }
const URL_KEYS: Record<keyof Filters, string> = { category: 'category', preset: 'range', from: 'from', to: 'to', campaignId: 'campaign', status: 'status', assigneeId: 'assignee', score: 'score', search: 'q' }

const parseHash = () => {
  const [path = '', qs = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs) }
}
function filtersFromQuery(q: URLSearchParams, base: Filters): Filters {
  const f = { ...base }
  for (const [k, name] of Object.entries(URL_KEYS) as [keyof Filters, string][]) {
    const v = q.get(name)
    if (v != null) (f as Record<string, unknown>)[k] = v
  }
  const range = q.get('range')
  if (range && range !== 'custom') Object.assign(f, { preset: Number(range) as Preset, ...presetRange(Number(range)) })
  return f
}
function filtersToQuery(f: Filters, extra: Record<string, string | undefined>) {
  const q = new URLSearchParams()
  for (const [k, name] of Object.entries(URL_KEYS) as [keyof Filters, string][]) {
    if (k === 'from' || k === 'to') continue
    if (f[k] !== DEFAULTS[k]) q.set(name, String(f[k]))
  }
  if (f.preset === 'custom') { q.set('from', f.from); q.set('to', f.to) }
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v)
  return q.toString()
}

// ---------- store ----------
export interface Toast { id: number; text: string; tone?: 'success' | 'error'; undo?: () => void }
export interface SavedView { id: string; name: string; filters: Partial<Filters> }

interface Store {
  loading: boolean
  route: string[]
  query: URLSearchParams
  brand: Brand | undefined
  categories: Category[]
  festivals: FestiveDate[]
  campaigns: Campaign[]
  users: User[]
  leads: Lead[]
  tasks: Task[]
  templates: Template[]
  settings: Settings
  me: User | undefined
  /** Switch who is signed in (demo account switcher). */
  setMe: (id: string) => void
  signIn: (u: User) => void
  signOut: () => void
  shares: Share[]
  shareable: User[]
  createShare: (module: Module, recordId: string, sharedWith: string, permission: Permission) => void
  revokeShare: (id: string) => void
  /** Data limited to the selected product category. */
  scoped: { campaigns: Campaign[]; leads: Lead[]; tasks: Task[] }
  categoryById: Map<string, Category>
  campaignById: Map<string, Campaign>
  adSetById: Map<string, AdSet>
  adById: Map<string, Ad>
  userById: Map<string, User>
  leadById: Map<string, Lead>
  filters: Filters
  setFilters: (patch: Partial<Filters>) => void
  setPreset: (days: 7 | 14 | 30 | 60) => void
  resetLeadFilters: () => void
  views: SavedView[]
  saveView: (name: string) => void
  deleteView: (id: string) => void
  // UI state shared across pages
  openLeadId: string | undefined
  openLead: (id: string | undefined) => void
  /** Stage change waiting for details (visit time, bill amount, lost reason). */
  statusPrompt: { ids: string[]; status: LeadStatus } | null
  setStatusPrompt: (p: { ids: string[]; status: LeadStatus } | null) => void
  newLeadOpen: boolean
  setNewLeadOpen: (v: boolean) => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  // alerts
  alerts: Alert[]
  alertsLoading: boolean
  dismissAlert: (id: string) => void
  // mutations
  setLeadStatus: (ids: string[], status: LeadStatus, details?: StatusDetails) => void
  assignLeads: (ids: string[], assigneeId: string | null) => void
  addNote: (id: string, text: string) => void
  logContact: (id: string, channel: 'call' | 'whatsapp' | 'email', text: string) => void
  createLead: (input: NewLeadInput) => Promise<Lead>
  addTask: (input: Omit<Task, 'id' | 'done'>) => void
  updateTask: (id: string, patch: Partial<Pick<Task, 'done' | 'dueAt'>>) => void
  updateCampaign: (id: string, patch: Partial<Pick<Campaign, 'status' | 'dailyBudget'>>, label?: string) => void
  saveTemplate: (t: Template) => void
  deleteTemplate: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  syncBrand: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)
const replace = <T extends { id: string }>(list: T[], items: T[]) => {
  const m = new Map(items.map(i => [i.id, i]))
  return list.map(x => m.get(x.id) ?? x)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand>()
  const [categories, setCategories] = useState<Category[]>([])
  const [festivals, setFestivals] = useState<FestiveDate[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [shares, setShares] = useState<Share[]>([])
  const [settings, setSettings] = useState<Settings>({ slaMinutes: 15, hotScore: 70, silverRate: 0, silverRateAt: null })
  const [loading, setLoading] = useState(true)
  // ponytail: session is a localStorage user id, no token. Swap for a real session when the
  // backend lands — api.signIn is the only call that needs to change.
  const [meId, setMeId] = useLocal<string>('crm.session', '')
  // Runs during render, before any child hook calls useInsights, so the row fetch is
  // always attributed to the signed-in user.
  setCurrentUser(meId)

  const initial = useRef(parseHash())
  const [route, setRoute] = useState(initial.current.parts)
  const [query, setQuery] = useState(initial.current.q)
  const [filters, setFiltersState] = useState(() => filtersFromQuery(initial.current.q, DEFAULTS))
  const [openLeadId, setOpenLeadId] = useState(initial.current.q.get('lead') ?? undefined)
  const [statusPrompt, setStatusPrompt] = useState<{ ids: string[]; status: LeadStatus } | null>(null)
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [views, setViews] = useLocal<SavedView[]>('crm.views', [
    { id: 'v1', name: 'Hot & untouched', filters: { status: 'New', score: 'Hot' } },
    { id: 'v2', name: 'Visits booked', filters: { status: 'Visit booked' } },
    { id: 'v3', name: 'Unassigned', filters: { assigneeId: 'none' } },
  ])
  const [dismissed, setDismissed] = useLocal<string[]>('crm.dismissedAlerts', [])

  // Every read is scoped to the signed-in user, so re-run the whole load when that changes.
  const reload = useCallback(() => {
    if (!meId) return Promise.resolve()
    return Promise.all([
      api.getBrand().then(setBrand), api.getCategories(meId).then(setCategories), api.getFestiveDates().then(setFestivals),
      api.getCampaigns(meId).then(setCampaigns), api.getUsers(meId).then(setUsers),
      api.getLeads(meId).then(setLeads), api.getTasks(meId).then(setTasks), api.getTemplates().then(setTemplates), api.getSettings().then(setSettings),
      api.listShares().then(setShares),
    ])
  }, [meId])
  useEffect(() => {
    setLoading(true)
    reload().finally(() => setLoading(false))
  }, [reload])

  // Hash navigation: links may carry filters (?status=New); links without a query keep the current filters.
  useEffect(() => {
    const onHash = () => {
      const { parts, q } = parseHash()
      setRoute(parts)
      setQuery(q)
      if ([...q.keys()].length) {
        setFiltersState(f => filtersFromQuery(q, f))
        setOpenLeadId(q.get('lead') ?? undefined)
      }
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  // Mirror state into the URL so any view can be shared or bookmarked.
  useEffect(() => {
    const extra: Record<string, string | undefined> = { lead: openLeadId }
    for (const k of ['ad', 'view']) extra[k] = query.get(k) ?? undefined
    const qs = filtersToQuery(filters, extra)
    const url = `#/${route.join('/')}${qs ? `?${qs}` : ''}`
    if (url !== window.location.hash) history.replaceState(null, '', url)
  }, [filters, openLeadId, route, query])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts.slice(-2), { ...t, id }])
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), t.undo ? 6000 : 3500)
  }, [])
  const fail = useCallback(() => { toast({ text: 'Something went wrong. Changes were reverted.', tone: 'error' }); reload() }, [toast, reload])

  const maps = useMemo(() => {
    const adSets = campaigns.flatMap(c => c.adSets)
    return {
      categoryById: new Map(categories.map(c => [c.id, c])),
      campaignById: new Map(campaigns.map(c => [c.id, c])),
      adSetById: new Map(adSets.map(a => [a.id, a])),
      adById: new Map(adSets.flatMap(a => a.ads).map(a => [a.id, a])),
      userById: new Map(users.map(u => [u.id, u])),
      leadById: new Map(leads.map(l => [l.id, l])),
    }
  }, [categories, campaigns, users, leads])

  const scoped = useMemo(() => {
    const { category } = filters
    if (!category) return { campaigns, leads, tasks }
    const ls = leads.filter(l => l.categoryId === category)
    const ids = new Set(ls.map(l => l.id))
    return { campaigns: category ? campaigns.filter(c => c.categoryId === category) : campaigns, leads: ls, tasks: tasks.filter(t => ids.has(t.leadId)) }
  }, [filters.category, campaigns, leads, tasks])

  // Alerts need the last 4 weeks regardless of the page's date filter.
  const alertRows = useInsights(alertsFrom(), todayIso(), filters.category)
  const alerts = useMemo(() => {
    if (!alertRows.data || loading) return []
    return computeAlerts({ rows: alertRows.data, campaigns: scoped.campaigns, leads: scoped.leads, tasks: scoped.tasks, slaMinutes: settings.slaMinutes, festivals, categories })
      .filter(a => !dismissed.includes(a.id))
  }, [alertRows.data, scoped, settings.slaMinutes, dismissed, loading, festivals, categories])

  // Never fall back to another user: a wrong `me` would widen what the data layer returns.
  const me = users.find(u => u.id === meId)
  const by = meId
  const leadsRef = useRef(leads)
  leadsRef.current = leads

  const setLeadStatus = useCallback((ids: string[], status: LeadStatus, details?: StatusDetails) => {
    // These stages need extra info; ask first, then come back here with the details.
    const needs = status === 'Lost' ? !details?.lostReason : status === 'Visit booked' ? !details?.visitAt : status === 'Purchased' ? !details?.sale : false
    if (needs) return setStatusPrompt({ ids, status })
    const before = leadsRef.current.filter(l => ids.includes(l.id)).map(l => ({ id: l.id, status: l.status, lostReason: l.lostReason }))
    const changed = before.filter(b => b.status !== status || status === 'Visit booked')
    if (!changed.length) return
    setLeads(ls => ls.map(l => (ids.includes(l.id) ? { ...l, status, lostReason: status === 'Lost' ? details!.lostReason! : null } : l)))
    api.updateLeads(ids, { status, details }, by).then(saved => {
      setLeads(ls => replace(ls, saved))
      api.getTasks(by).then(setTasks)
    }, fail)
    const name = changed.length === 1 ? maps.leadById.get(changed[0].id)?.name : `${changed.length} leads`
    toast({
      text: `${name} moved to ${status}`, tone: 'success',
      undo: () => Promise.all(changed.map(b => api.updateLeads([b.id], { status: b.status, details: { lostReason: b.lostReason ?? undefined } }, by)))
        .then(r => { setLeads(ls => replace(ls, r.flat())); api.getTasks(by).then(setTasks) }),
    })
  }, [by, fail, toast, maps.leadById])

  const store: Store = {
    loading, route, query, brand, categories, festivals, campaigns, users, leads, tasks, templates, settings, me, scoped, ...maps,
    shares,
    shareable: shareableTargets(users, shares, by),
    setMe: setMeId,
    signIn: u => { setMeId(u.id); go(`#/${LEVELS[levelOf(u.role)].home}`) },
    signOut: () => { setMeId(''); setUsers([]); setLeads([]); setTasks([]) },
    filters,
    setFilters: patch => setFiltersState(f => ({ ...f, ...patch })),
    setPreset: days => setFiltersState(f => ({ ...f, preset: days, ...presetRange(days) })),
    resetLeadFilters: () => setFiltersState(f => ({ ...f, campaignId: '', status: '', assigneeId: '', score: '', search: '' })),
    views,
    saveView: name => {
      const { campaignId, status, assigneeId, score, search } = filters
      setViews(v => [...v, { id: crypto.randomUUID(), name, filters: { campaignId, status, assigneeId, score, search } }])
      toast({ text: `Saved view "${name}"`, tone: 'success' })
    },
    deleteView: id => setViews(v => v.filter(x => x.id !== id)),
    openLeadId,
    openLead: setOpenLeadId,
    statusPrompt, setStatusPrompt, newLeadOpen, setNewLeadOpen,
    toasts, toast,
    dismissToast: id => setToasts(ts => ts.filter(t => t.id !== id)),
    alerts, alertsLoading: alertRows.loading || loading,
    dismissAlert: id => {
      setDismissed(d => [...d, id])
      toast({ text: 'Alert dismissed', undo: () => setDismissed(d => d.filter(x => x !== id)) })
    },

    setLeadStatus,
    assignLeads: (ids, assigneeId) => {
      setLeads(ls => ls.map(l => (ids.includes(l.id) ? { ...l, assigneeId } : l)))
      api.updateLeads(ids, { assigneeId }, by).then(saved => setLeads(ls => replace(ls, saved)), fail)
      const who = assigneeId ? maps.userById.get(assigneeId)?.name : 'nobody'
      toast({ text: `${ids.length > 1 ? `${ids.length} leads` : '1 lead'} assigned to ${who}`, tone: 'success' })
    },
    addNote: (id, text) => {
      api.addNote(id, text, by).then(l => setLeads(ls => replace(ls, [l])), fail)
    },
    logContact: (id, channel, text) => {
      api.logContact(id, channel, text, by).then(l => setLeads(ls => replace(ls, [l])), fail)
    },
    createLead: async input => {
      const lead = await api.createLead(input, by)
      setLeads(ls => [lead, ...ls])
      toast({ text: `${lead.name} added`, tone: 'success' })
      return lead
    },
    addTask: input => {
      api.addTask(input, by).then(t => {
        setTasks(ts => [...ts, t])
        api.getLeads(by).then(setLeads)
        toast({ text: 'Follow-up scheduled', tone: 'success' })
      }, fail)
    },
    updateTask: (id, patch) => {
      const prev = tasks.find(t => t.id === id)
      setTasks(ts => ts.map(t => (t.id === id ? { ...t, ...patch } : t)))
      api.updateTask(id, patch, by).then(t => setTasks(ts => replace(ts, [t])), fail)
      if (prev && patch.done) {
        toast({ text: `Done: ${prev.title}`, tone: 'success', undo: () => store.updateTask(id, { done: false }) })
      } else if (prev && patch.dueAt) toast({ text: `Snoozed to ${new Date(patch.dueAt).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`, undo: () => store.updateTask(id, { dueAt: prev.dueAt }) })
    },
    updateCampaign: (id, patch, label) => {
      const prev = campaigns.find(c => c.id === id)
      if (!prev) return
      api.updateCampaign(id, patch).then(c => setCampaigns(cs => replace(cs, [c])), fail)
      setCampaigns(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)))
      toast({
        text: label ?? `${prev.name} updated`, tone: 'success',
        undo: () => api.updateCampaign(id, { status: prev.status, dailyBudget: prev.dailyBudget }).then(c => setCampaigns(cs => replace(cs, [c]))),
      })
    },
    saveTemplate: t => {
      setTemplates(ts => (ts.some(x => x.id === t.id) ? replace(ts, [t]) : [...ts, t]))
      api.saveTemplate(t).catch(fail)
      toast({ text: 'Template saved', tone: 'success' })
    },
    deleteTemplate: id => {
      setTemplates(ts => ts.filter(t => t.id !== id))
      api.deleteTemplate(id).catch(fail)
    },
    updateSettings: patch => {
      setSettings(s => ({ ...s, ...patch }))
      api.updateSettings(patch).catch(fail)
    },
    syncBrand: async () => {
      setBrand(await api.syncBrand())
      toast({ text: 'Meta ad account synced', tone: 'success' })
    },
    createShare: (module, recordId, sharedWith, permission) => {
      api.createShare({ module, recordId, sharedWith, permission }, by).then(s => {
        setShares(ss => [...ss, s])
        toast({ text: `Shared with ${users.find(u => u.id === sharedWith)?.name}`, tone: 'success' })
      }, fail)
    },
    revokeShare: id => {
      const prev = shares.find(s => s.id === id)
      if (!prev) return
      setShares(ss => ss.filter(s => s.id !== id))
      api.revokeShare(id, by).then(undefined, () => { setShares(ss => [...ss, prev!]); toast({ text: 'Could not revoke', tone: 'error' }) })
      toast({ text: 'Share revoked', tone: 'success' })
    },
  }
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside <StoreProvider>')
  return s
}

/** Navigate, keeping the current filters in the URL. */
export const go = (path: string) => { window.location.hash = path }
