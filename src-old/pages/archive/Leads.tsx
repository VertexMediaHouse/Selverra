import { useMemo, useState } from 'react'
import { Bookmark, ChevronDown, Columns3, Download, List, Phone, Plus, Search, X } from 'lucide-react'
import { LEAD_STATUSES, type Lead, type LeadStatus, type Task } from '../../data/types'
import { Avatar, Card, CategoryTag, CollectionIcon, cx, DateRangeFilter, EmptyState, LeadStatusBadge, Menu, MenuItem, MenuLabel, PageHeader, ScorePill, Segmented, Select, Skeleton, SlaTimer, STATUS_DOT, TableSkeleton } from '../../components/ui'
import { DataTable, type Column } from '../../components/DataTable'
import { useNow, useStore, type Filters } from '../../store'
import { fmt } from '../../lib/format'
import { inRange, leadDay } from '../../lib/metrics'
import { downloadCsv, isClosed, leadScore, responseMinutes, scoreBand, slaTone, waitingMinutes } from '../../lib/leads'

export default function Leads() {
  const { scoped, users, filters, setFilters, resetLeadFilters, categoryById, campaignById, userById, settings, loading, openLead, views, saveView, deleteView } = useStore()
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const now = useNow(60_000)

  const nextTask = useMemo(() => {
    const m = new Map<string, Task>()
    for (const t of scoped.tasks) if (!t.done && (!m.has(t.leadId) || t.dueAt < m.get(t.leadId)!.dueAt)) m.set(t.leadId, t)
    return m
  }, [scoped.tasks])

  const match = (l: Lead, f: Partial<Filters>, ignoreStatus = false) => {
    const q = (f.search ?? '').trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return inRange(leadDay(l), filters.from, filters.to) &&
      (!f.campaignId || l.campaignId === f.campaignId) &&
      (ignoreStatus || !f.status || l.status === f.status) &&
      (!f.assigneeId || (f.assigneeId === 'none' ? !l.assigneeId : l.assigneeId === f.assigneeId)) &&
      (!f.score || (!isClosed(l) && scoreBand(leadScore(l, now), settings.hotScore) === f.score)) &&
      (!q || l.name.toLowerCase().includes(q) || l.email.includes(q) || (digits.length >= 3 && l.phone.replace(/\D/g, '').includes(digits)))
  }
  // Pipeline columns are statuses, so the status filter only applies to the table.
  const base = useMemo(() => scoped.leads.filter(l => match(l, filters, true)), [scoped.leads, filters, now, settings.hotScore]) // eslint-disable-line react-hooks/exhaustive-deps
  const visible = view === 'table' && filters.status ? base.filter(l => l.status === filters.status) : base
  const hasFilters = !!(filters.search || filters.campaignId || filters.status || filters.assigneeId || filters.score)
  const selectedIds = [...selected].filter(id => visible.some(l => l.id === id))
  const activeView = views.find(v => (['campaignId', 'status', 'assigneeId', 'score', 'search'] as const).every(k => (v.filters[k] ?? '') === filters[k]))

  const exportCsv = (rows: Lead[]) => downloadCsv(`enquiries-${filters.from}-to-${filters.to}.csv`, rows.map(l => ({
    ID: l.id, Name: l.name, Phone: l.phone, Email: l.email,
    Category: categoryById.get(l.categoryId)?.name ?? '', Source: l.source,
    Campaign: l.campaignId ? campaignById.get(l.campaignId)?.name ?? '' : '', Status: l.status, 'Lost reason': l.lostReason,
    Score: isClosed(l) ? null : leadScore(l), Owner: userById.get(l.assigneeId ?? '')?.name ?? '',
    'Visit at': l.visitAt ? new Date(l.visitAt).toLocaleString('en-IN') : null,
    'Sale amount': l.sale?.amount ?? null, 'Sale grams': l.sale?.grams ?? null, Items: l.sale?.items ?? null,
    'First response (min)': responseMinutes(l) == null ? null : Math.round(responseMinutes(l)!), Created: new Date(l.createdAt).toLocaleString('en-IN'),
    ...Object.fromEntries(l.answers.map(a => [a.q, a.a])),
  })))

  const columns: Column<Lead>[] = [
    // Same urgency stripe as the kanban card, so a row scans the same way a card does.
    { key: 'name', label: 'Customer', value: l => l.name, render: l => {
      const urgent = urgency(l, nextTask.get(l.id), settings.slaMinutes, now)
      return (
        <div className="flex items-center gap-3">
          <span aria-hidden className={cx('-my-2 w-0.5 self-stretch rounded-full', urgent ? urgent.bar : 'bg-transparent')} />
          <Avatar name={l.name} size="md" color={categoryById.get(l.categoryId)?.color} />
          <div className="min-w-0">
            <p className="font-medium">{l.name}{urgent && <span className="sr-only"> — {urgent.label}</span>}</p>
            <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()}
              className="text-xs text-slate-500 tabular-nums hover:text-indigo-600 hover:underline dark:hover:text-indigo-400">{l.phone}</a>
          </div>
        </div>
      )
    } },
    ...(!filters.category ? [{ key: 'category', label: 'Product', value: (l: Lead) => categoryById.get(l.categoryId)?.name ?? '', className: 'hidden lg:table-cell',
      render: (l: Lead) => <CategoryTag id={l.categoryId} /> }] : []),
    { key: 'source', label: 'Source', value: l => (l.campaignId ? campaignById.get(l.campaignId)?.name ?? '' : l.source), className: 'hidden 2xl:table-cell',
      render: l => <span className="block max-w-48 truncate text-slate-600 dark:text-slate-300">{l.campaignId ? campaignById.get(l.campaignId)?.name : l.source}</span> },
    { key: 'score', label: 'Score', value: l => (isClosed(l) ? null : leadScore(l, now)), render: l => <ScorePill lead={l} /> },
    { key: 'status', label: 'Status', value: l => LEAD_STATUSES.indexOf(l.status), render: l => <LeadStatusBadge status={l.status} /> },
    { key: 'owner', label: 'Owner', value: l => userById.get(l.assigneeId ?? '')?.name ?? null, className: 'hidden md:table-cell',
      render: l => l.assigneeId ? <span className="flex items-center gap-2"><Avatar name={userById.get(l.assigneeId)?.name} size="xs" />{userById.get(l.assigneeId)?.name.split(' ')[0]}</span> : <span className="text-slate-400">Unassigned</span> },
    { key: 'speed', label: 'Response', value: l => responseMinutes(l) ?? -1, className: 'hidden md:table-cell', render: l => {
      const m = responseMinutes(l)
      if (m == null) return <SlaTimer lead={l} compact />
      const t = slaTone(m, settings.slaMinutes)
      return <span className={cx('text-xs tabular-nums', t === 'late' ? 'text-amber-600' : 'text-slate-500')}>{fmt.duration(m)}</span>
    } },
    { key: 'next', label: 'Next step', value: l => nextTask.get(l.id)?.dueAt ?? null, className: 'hidden sm:table-cell', render: l => {
      const t = nextTask.get(l.id)
      if (!t) return isClosed(l) ? <span className="text-slate-300 dark:text-slate-600">—</span> : <span className="text-xs text-amber-600">None scheduled</span>
      const overdue = new Date(t.dueAt).getTime() < now
      return <span className={cx('text-xs', overdue ? 'font-medium text-rose-600' : 'text-slate-500')} title={t.title}>{fmt.due(t.dueAt)}</span>
    } },
    { key: 'sale', label: 'Sale', value: l => l.sale?.amount ?? null, align: 'right', render: l => l.sale
      ? <span className="font-medium text-emerald-700 dark:text-emerald-400" title={`${l.sale.items} · ${l.sale.grams}g`}>{fmt.currency(l.sale.amount)}</span>
      : <span className="text-slate-300 dark:text-slate-600">—</span> },
    { key: 'created', label: 'Created', value: l => l.createdAt, render: l => <span className="text-slate-500" title={fmt.dateTime(l.createdAt)}>{fmt.relative(l.createdAt)}</span>, align: 'right', className: 'hidden sm:table-cell' },
  ]

  const empty = <EmptyState title="No enquiries match these filters" hint="Widen the date range or clear the filters." action={hasFilters && <button className="btn" onClick={resetLeadFilters}>Clear filters</button>} />

  return (
    <>
      <PageHeader title="Enquiries" subtitle={loading ? 'Loading…' : `${visible.length} enquiries · ${fmt.date(filters.from)} – ${fmt.date(filters.to)}`}
        actions={<>
          <DateRangeFilter />
          <button className="btn" onClick={() => exportCsv(visible)} disabled={!visible.length}><Download size={15} /> Export</button>
          <Segmented label="View" value={view} onChange={setView} options={[{ value: 'table', label: <><List size={14} />Table</> }, { value: 'kanban', label: <><Columns3 size={14} />Kanban</> }]} />
        </>} />

      {/* Saved views */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button onClick={resetLeadFilters} className={cx('rounded-full px-3 py-1 text-xs font-medium', !hasFilters ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>All enquiries</button>
        {views.map(v => (
          <span key={v.id} className={cx('group inline-flex items-center rounded-full text-xs font-medium', activeView?.id === v.id && hasFilters ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
            <button className="py-1 pr-1 pl-3" onClick={() => { resetLeadFilters(); setFilters(v.filters) }}>
              {v.name} <span className="opacity-60 tabular-nums">{scoped.leads.filter(l => match(l, v.filters)).length}</span>
            </button>
            <button onClick={() => deleteView(v.id)} className="mr-1 rounded-full p-0.5 opacity-0 group-hover:opacity-60 hover:opacity-100 focus:opacity-100" aria-label={`Delete view ${v.name}`}><X size={12} /></button>
          </span>
        ))}
        {hasFilters && !activeView && <SaveView onSave={saveView} />}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input data-search className="input w-full pl-9" placeholder="Name, email or phone   /" aria-label="Search leads" value={filters.search} onChange={e => setFilters({ search: e.target.value })} />
        </label>
        <Select label="Campaign" value={filters.campaignId} onChange={v => setFilters({ campaignId: v })} className="max-w-56">
          <option value="">All campaigns</option>
          {scoped.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Status" value={filters.status} onChange={v => setFilters({ status: v as LeadStatus | '' })}>
          <option value="">Any status</option>
          {LEAD_STATUSES.map(st => <option key={st}>{st}</option>)}
        </Select>
        <Select label="Score" value={filters.score} onChange={v => setFilters({ score: v as Filters['score'] })}>
          <option value="">Any score</option><option>Hot</option><option>Warm</option><option>Cold</option>
        </Select>
        <Select label="Owner" value={filters.assigneeId} onChange={v => setFilters({ assigneeId: v })}>
          <option value="">Any owner</option>
          <option value="none">Unassigned</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        {hasFilters && <button className="btn btn-ghost btn-sm" onClick={resetLeadFilters}><X size={14} /> Clear</button>}
      </div>

      {view === 'table' ? (
        <Card padded={false} className="overflow-hidden">
          {loading ? <TableSkeleton rows={10} /> : (
            <DataTable rows={visible} columns={columns} rowKey={l => l.id} onRowClick={l => openLead(l.id)} pageSize={50}
              initialSort={{ key: 'created', dir: 'desc' }} empty={empty} selection={{ selected, onChange: setSelected }} />
          )}
        </Card>
      ) : loading ? (
        <div className="flex gap-4 overflow-hidden">{LEAD_STATUSES.map(st => <Skeleton key={st} className="h-96 w-72 shrink-0" />)}</div>
      ) : base.length === 0 ? <Card>{empty}</Card> : (
        <>
          {filters.status && <p className="mb-3 text-xs text-slate-500">The status filter is ignored in pipeline view.</p>}
          <Kanban leads={base} nextTask={nextTask} />
        </>
      )}

      {view === 'table' && selectedIds.length > 0 && <BulkBar ids={selectedIds} onClear={() => setSelected(new Set())} onExport={() => exportCsv(visible.filter(l => selected.has(l.id)))} />}
    </>
  )
}

function SaveView({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <Menu label="Save view" button={<button className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600"><Bookmark size={12} /> Save view</button>}>
      {close => (
        <form className="w-64 p-2" onSubmit={e => { e.preventDefault(); if (name.trim()) { onSave(name.trim()); setName(''); close() } }}>
          <label className="label" htmlFor="view-name">Name this view</label>
          <input id="view-name" autoFocus className="input w-full" placeholder="e.g. Hot leads this week" value={name} onChange={e => setName(e.target.value)} />
          <button className="btn btn-primary btn-sm mt-2 w-full justify-center" disabled={!name.trim()}>Save</button>
        </form>
      )}
    </Menu>
  )
}

function BulkBar({ ids, onClear, onExport }: { ids: string[]; onClear: () => void; onExport: () => void }) {
  const { users, assignLeads, setLeadStatus } = useStore()
  const btn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm hover:bg-white/10 dark:hover:bg-slate-100'
  return (
    <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-900 p-1.5 pl-4 text-white shadow-2xl dark:bg-white dark:text-black">
        <span className="mr-2 text-sm font-medium tabular-nums">{ids.length} selected</span>
        <Menu label="Assign" button={<button className={btn}>Assign <ChevronDown size={14} /></button>}>
          {close => (<>
            <MenuLabel>Assign to</MenuLabel>
            {users.map(u => <MenuItem key={u.id} onClick={() => { assignLeads(ids, u.id); close() }}><Avatar name={u.name} size="xs" />{u.name}</MenuItem>)}
            <MenuItem onClick={() => { assignLeads(ids, null); close() }}><span className="text-slate-500">Unassign</span></MenuItem>
          </>)}
        </Menu>
        <Menu label="Change status" button={<button className={btn}>Status <ChevronDown size={14} /></button>}>
          {close => LEAD_STATUSES.map(st => <MenuItem key={st} onClick={() => { setLeadStatus(ids, st); close() }}><span className={cx('size-2 rounded-full', STATUS_DOT[st])} />{st}</MenuItem>)}
        </Menu>
        <button className={btn} onClick={onExport}><Download size={14} /> Export</button>
        <button className={cx(btn, 'ml-1')} onClick={onClear} aria-label="Clear selection"><X size={15} /></button>
      </div>
    </div>
  )
}

const COLUMN_LIMIT = 25

/**
 * Urgency stripe down the card's left edge. The eye catches a colour band before it reads
 * text, so the one thing that decides "work this next" gets the pre-attentive channel:
 * rose = reply overdue (SLA breached), amber = follow-up overdue, violet = visit booked.
 */
function urgency(lead: Lead, task: Task | undefined, slaMinutes: number, now: number) {
  const waiting = waitingMinutes(lead, now)
  if (waiting != null && slaTone(waiting, slaMinutes) === 'late') return { bar: 'bg-rose-500', label: 'Reply overdue', action: true }
  if (task && new Date(task.dueAt).getTime() < now) return { bar: 'bg-amber-500', label: 'Follow-up overdue', action: true }
  if (lead.status === 'Visit booked' && lead.visitAt) return { bar: 'bg-violet-500', label: 'Visit booked', action: false }
  return null
}

function LeadCard({ lead, task, dragging, onDragStart, onDragEnd, onMove }: {
  lead: Lead
  task: Task | undefined
  dragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  /** Keyboard equivalent of dragging: -1 / +1 along LEAD_STATUSES. */
  onMove: (dir: -1 | 1) => void
}) {
  const { categoryById, campaignById, userById, settings, openLead, filters } = useStore()
  const now = useNow(60_000)
  const cat = categoryById.get(lead.categoryId)
  const rep = lead.assigneeId ? userById.get(lead.assigneeId) : undefined
  const urgent = urgency(lead, task, settings.slaMinutes, now)
  const score = isClosed(lead) ? null : leadScore(lead, now)
  const band = score == null ? null : scoreBand(score, settings.hotScore)
  const campaign = lead.campaignId ? campaignById.get(lead.campaignId)?.name : null
  const waiting = waitingMinutes(lead, now)
  const overdue = task ? new Date(task.dueAt).getTime() < now : false

  return (
    <article draggable tabIndex={0}
      onDragStart={onDragStart} onDragEnd={onDragEnd}
      onClick={() => openLead(lead.id)}
      onKeyDown={e => {
        // Enter/Space opens. Ctrl/Cmd + arrow moves the card, so the board works without a mouse.
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLead(lead.id) }
        else if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          e.preventDefault()
          onMove(e.key === 'ArrowRight' ? 1 : -1)
        }
      }}
      aria-label={`${lead.name}, ${lead.status}${urgent ? `, ${urgent.label}` : ''}. Enter to open, Ctrl with left or right arrow to change status.`}
      // shrink-0 is load-bearing: the column is a flex column, so without it cards are squashed
      // to slivers once the column overflows, and overflow-hidden then clips the text away.
      className={cx('group relative shrink-0 cursor-grab overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(20,20,19,0.05)] transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_14px_rgba(20,20,19,0.10)] focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
        dragging && 'rotate-[0.5deg] opacity-40 shadow-lg')}>
      {urgent && <span aria-hidden className={cx('absolute inset-y-0 left-0 w-[3px]', urgent.bar)} />}

      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className={cx('flex items-start gap-2.5 px-3.5 pt-3', urgent && 'pl-4')}>
        <Avatar name={lead.name} size="sm" color={cat?.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-snug font-semibold text-slate-900 dark:text-slate-100">{lead.name}</p>
          <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 tabular-nums transition-colors hover:text-indigo-600 hover:underline dark:text-slate-400 dark:hover:text-indigo-400">
            <Phone size={9} className="shrink-0 opacity-60" />{lead.phone}
          </a>
        </div>
        {band && (
          <span className={cx('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide uppercase',
            band === 'Hot' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
              : band === 'Warm' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
              : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300')}
            title={`Lead score ${score}`}>
            {band}
          </span>
        )}
      </div>

      {/* ── Detail grid: label on the left, value on the right. A real grid, so values line
             up across every card in the column instead of drifting with text length. ── */}
      <dl className={cx('mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1 px-3.5 text-[11px]', urgent && 'pl-4')}>
        {!filters.category && <>
          <dt className="text-slate-400 dark:text-slate-500">Product</dt>
          <dd className="flex min-w-0 items-center gap-1 text-slate-600 dark:text-slate-300">
            <CollectionIcon id={cat?.id} size={11} />
            <span className="truncate">{cat?.name ?? '—'}</span>
          </dd>
        </>}

        <dt className="text-slate-400 dark:text-slate-500">Source</dt>
        <dd className="min-w-0 truncate text-slate-600 dark:text-slate-300" title={campaign ?? lead.source}>
          {campaign ?? lead.source}
        </dd>

        <dt className="text-slate-400 dark:text-slate-500">Owner</dt>
        <dd className="flex min-w-0 items-center gap-1.5">
          {rep
            ? <><Avatar name={rep.name} size="xs" /><span className="truncate text-slate-600 dark:text-slate-300">{rep.name}</span></>
            : <span className="font-medium text-amber-700 dark:text-amber-400">Unassigned</span>}
        </dd>

        {/* The next action, whatever form it takes. Always present so the row never vanishes
            and the grid keeps the same shape card to card. */}
        <dt className="text-slate-400 dark:text-slate-500">Next</dt>
        <dd className="min-w-0 truncate">
          {waiting != null
            ? <span className={cx('font-semibold', slaTone(waiting, settings.slaMinutes) === 'late' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')}>
                Reply — waiting {fmt.duration(waiting)}
              </span>
            : lead.status === 'Visit booked' && lead.visitAt
              ? <span className="font-semibold text-violet-600 dark:text-violet-400">Visit {fmt.due(lead.visitAt)}</span>
              : task
                ? <span className={cx(overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300')} title={task.title}>
                    {task.title} · {fmt.due(task.dueAt)}
                  </span>
                : isClosed(lead)
                  ? <span className="text-slate-400 dark:text-slate-500">—</span>
                  : <span className="text-amber-600 dark:text-amber-400">Nothing scheduled</span>}
        </dd>

        {lead.lostReason && <>
          <dt className="text-slate-400 dark:text-slate-500">Lost</dt>
          <dd className="min-w-0 truncate text-slate-600 dark:text-slate-300" title={lead.lostReason}>{lead.lostReason}</dd>
        </>}
      </dl>

      {/* ── Footer: the outcome if there is one, and how old the enquiry is. ── */}
      <div className={cx('mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2 dark:border-slate-800/80', urgent && 'pl-4')}>
        {lead.sale
          ? <span className="truncate text-[11px] font-bold text-emerald-700 dark:text-emerald-400" title={`${lead.sale.items} · ${lead.sale.grams}g`}>
              {fmt.currency(lead.sale.amount)} <span className="font-medium opacity-70">· {lead.sale.grams}g</span>
            </span>
          : <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">{lead.status}</span>}
        <span className="shrink-0 text-[11px] text-slate-400 tabular-nums dark:text-slate-500" title={fmt.dateTime(lead.createdAt)}>
          {fmt.relative(lead.createdAt)}
        </span>
      </div>
    </article>
  )
}

function Kanban({ leads, nextTask }: { leads: Lead[]; nextTask: Map<string, Task> }) {
  const { setLeadStatus, settings } = useStore()
  const [over, setOver] = useState<LeadStatus>()
  const [dragId, setDragId] = useState<string>()
  const [limit, setLimit] = useState<Partial<Record<LeadStatus, number>>>({})
  const now = useNow(60_000)

  const move = (id: string, from: LeadStatus, dir: -1 | 1) => {
    const next = LEAD_STATUSES[LEAD_STATUSES.indexOf(from) + dir]
    if (next) setLeadStatus([id], next)
  }

  return (
    // ponytail: native HTML5 drag and drop, desktop only. Touch users change status from the
    // lead panel; keyboard users use Ctrl/Cmd + arrow on a focused card.
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
      {LEAD_STATUSES.map(status => {
        const items = leads.filter(l => l.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        const shown = items.slice(0, limit[status] ?? COLUMN_LIMIT)
        // The header counts what needs action, not just how many cards sit in the column.
        const needsAction = items.filter(l => urgency(l, nextTask.get(l.id), settings.slaMinutes, now)?.action).length
        const isTarget = over === status && dragId != null
        return (
          <section key={status} aria-label={status}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(status) }}
            onDragLeave={e => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(undefined)}
            onDrop={e => {
              e.preventDefault()
              setOver(undefined)
              const id = e.dataTransfer.getData('text/plain')
              if (id) setLeadStatus([id], status)
            }}
            className={cx('flex w-72 shrink-0 snap-start flex-col rounded-xl border bg-slate-100/70 transition-colors dark:bg-slate-900/60',
              isTarget ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/5' : 'border-transparent')}>
            <header className="flex items-center gap-2 px-3 py-2.5">
              <span className={cx('size-2 rounded-full', STATUS_DOT[status])} />
              <h3 className="text-sm font-semibold">{status}</h3>
              {needsAction > 0 && (
                <span title={`${needsAction} need attention`}
                  className="rounded-full bg-rose-100 px-1.5 text-[10px] font-semibold text-rose-700 tabular-nums dark:bg-rose-500/15 dark:text-rose-300">
                  {needsAction}
                </span>
              )}
              <span className="ml-auto text-xs text-slate-500 tabular-nums">{items.length}</span>
            </header>
            <div className="flex max-h-[calc(100vh-300px)] min-h-32 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {shown.map(l => (
                <LeadCard key={l.id} lead={l} task={nextTask.get(l.id)}
                  dragging={dragId === l.id}
                  onDragStart={e => { e.dataTransfer.setData('text/plain', l.id); e.dataTransfer.effectAllowed = 'move'; setDragId(l.id) }}
                  onDragEnd={() => { setDragId(undefined); setOver(undefined) }}
                  onMove={dir => move(l.id, status, dir)} />
              ))}
              {items.length > shown.length && (
                <button className="rounded-lg py-1.5 text-xs font-medium text-slate-500 hover:bg-white dark:hover:bg-slate-800" onClick={() => setLimit(m => ({ ...m, [status]: shown.length + COLUMN_LIMIT }))}>
                  <Plus size={12} className="inline" /> {items.length - shown.length} more
                </button>
              )}
              {items.length === 0 && (
                <p className={cx('rounded-lg border border-dashed p-4 text-center text-xs transition-colors',
                  isTarget ? 'border-indigo-400 bg-white/60 font-medium text-indigo-600 dark:bg-slate-900/60 dark:text-indigo-300' : 'border-slate-300 text-slate-400 dark:border-slate-700')}>
                  {isTarget ? `Move to ${status}` : 'Drop leads here'}
                </p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
