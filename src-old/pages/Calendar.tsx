import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Store } from 'lucide-react'
import type { Lead, Task } from '../data/types'
import { useNow, useStore } from '../store'
import { Avatar, Card, CollectionIcon, cx, EmptyState, LeadStatusBadge, PageHeader, Segmented, TableSkeleton } from '../components/ui'
import { TASK_ICON } from '../components/LeadPanel'
import { levelOf, seesSpend } from '../levels'

/**
 * Month calendar of everything with a date on it: open follow-up tasks (call / WhatsApp / email
 * / visit) and booked showroom visits. Reads `scoped.tasks` and `scoped.leads`, so the access
 * model decides what lands on the grid — the owner sees every entry, a manager their branch,
 * a sales person only their own. No new data layer.
 */

/** A task due date or a lead's booked visit, flattened to one shape the grid can render. */
type Entry =
  | { kind: 'task'; key: string; at: number; task: Task; lead: Lead }
  | { kind: 'visit'; key: string; at: number; lead: Lead }

const DAY = 86400_000
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0)
const timeOf = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** Monday-first weekday index, so the grid starts on Monday like a shop diary. */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7

/** The 42 cells (6 weeks) covering the month `cursor` sits in. Fixed height stops the grid jumping. */
function monthCells(cursor: number): number[] {
  const first = new Date(cursor)
  first.setDate(1)
  const start = midnight(first.getTime()) - mondayIndex(first) * DAY
  return Array.from({ length: 42 }, (_, i) => start + i * DAY)
}

export default function Calendar() {
  const { me, scoped, leadById, userById, categoryById, loading, openLead } = useStore()
  const now = useNow(60_000)
  // Same rule as the Today page: sales staff get their own diary, managers and the owner can
  // switch to everyone's.
  const canSeeTeam = seesSpend(levelOf(me?.role))
  const [whoState, setWho] = useState<'mine' | 'all'>('mine')
  const who = canSeeTeam ? whoState : 'mine'
  const [monthStart, setMonthStart] = useState(() => { const d = new Date(); d.setDate(1); return midnight(d.getTime()) })
  const [selected, setSelected] = useState<number | null>(() => midnight(Date.now()))

  const mine = (assigneeId: string | null) => who === 'all' || assigneeId === me?.id

  // Entries bucketed by midnight timestamp, so a cell is one map lookup.
  const byDay = useMemo(() => {
    const map = new Map<number, Entry[]>()
    const push = (e: Entry) => {
      const day = midnight(e.at)
      const list = map.get(day)
      if (list) list.push(e)
      else map.set(day, [e])
    }
    for (const t of scoped.tasks) {
      if (t.done || !mine(t.assigneeId)) continue
      const lead = leadById.get(t.leadId)
      if (!lead) continue // a task whose lead is out of scope stays off the grid
      push({ kind: 'task', key: t.id, at: new Date(t.dueAt).getTime(), task: t, lead })
    }
    for (const l of scoped.leads) {
      if (!l.visitAt || !mine(l.assigneeId)) continue
      push({ kind: 'visit', key: `v${l.id}`, at: new Date(l.visitAt).getTime(), lead: l })
    }
    for (const list of map.values()) list.sort((a, b) => a.at - b.at)
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, leadById, who, me])

  const cells = useMemo(() => monthCells(monthStart), [monthStart])
  const today = midnight(now)
  const month = new Date(monthStart)
  const inMonth = (day: number) => new Date(day).getMonth() === month.getMonth()

  // Counts for the subtitle: what is still ahead this month, not what already happened.
  const ahead = useMemo(() => {
    let visits = 0, followUps = 0, overdue = 0
    for (const [day, list] of byDay) {
      const d = new Date(day)
      if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) continue
      for (const e of list) {
        if (e.kind === 'visit') { if (e.at >= now) visits++ }
        else if (e.at < now) overdue++
        else followUps++
      }
    }
    return { visits, followUps, overdue }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDay, monthStart, now])

  const shiftMonth = (by: number) => {
    const d = new Date(monthStart)
    d.setMonth(d.getMonth() + by)
    setMonthStart(midnight(d.getTime()))
  }
  const goToday = () => {
    const d = new Date()
    d.setDate(1)
    setMonthStart(midnight(d.getTime()))
    setSelected(midnight(Date.now()))
  }

  const dayEntries = selected == null ? [] : byDay.get(selected) ?? []
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <>
      <PageHeader title="Calendar"
        subtitle={loading ? 'Loading your diary…'
          : `${monthLabel}: ${ahead.visits} visit${ahead.visits === 1 ? '' : 's'} booked and ${ahead.followUps} follow-up${ahead.followUps === 1 ? '' : 's'} still ahead${ahead.overdue ? `, ${ahead.overdue} overdue` : ''}.`}
        actions={canSeeTeam && <Segmented label="Whose diary" value={who} onChange={setWho}
          options={[{ value: 'mine', label: 'My diary' }, { value: 'all', label: 'Everyone' }]} />} />

      {loading ? <Card><TableSkeleton rows={6} /></Card> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card padded={false} title={monthLabel} action={
            <div className="flex items-center gap-1">
              <button onClick={goToday} className="rounded-[var(--radius-input)] px-2 py-1 text-xs text-[var(--color-text-muted)] transition hover:bg-white/50">Today</button>
              <button onClick={() => shiftMonth(-1)} aria-label="Previous month"
                className="rounded-[var(--radius-input)] p-1 text-[var(--color-text-muted)] transition hover:bg-white/50"><ChevronLeft size={16} /></button>
              <button onClick={() => shiftMonth(1)} aria-label="Next month"
                className="rounded-[var(--radius-input)] p-1 text-[var(--color-text-muted)] transition hover:bg-white/50"><ChevronRight size={16} /></button>
            </div>
          }>
            <div className="grid grid-cols-7 border-b border-[var(--color-border-subtle)] text-center text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              {WEEKDAYS.map(d => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map(day => {
                const list = byDay.get(day) ?? []
                const visits = list.filter(e => e.kind === 'visit').length
                const late = list.filter(e => e.kind === 'task' && e.at < now).length
                return (
                  <button key={day} onClick={() => setSelected(day)}
                    aria-label={`${new Date(day).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}, ${list.length} entr${list.length === 1 ? 'y' : 'ies'}`}
                    aria-current={day === today ? 'date' : undefined}
                    className={cx('min-h-20 border-b border-r border-[var(--color-border-subtle)] p-1.5 text-left align-top transition',
                      inMonth(day) ? 'hover:bg-white/50' : 'bg-black/[0.02] text-[var(--color-text-muted)] dark:bg-white/[0.02]',
                      day === selected && 'ring-2 ring-inset ring-[#B08E54]')}>
                    <span className={cx('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      day === today ? 'bg-[#B08E54] font-semibold text-white' : inMonth(day) ? 'text-[var(--color-text-primary)]' : '')}>
                      {new Date(day).getDate()}
                    </span>
                    {list.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {list.slice(0, 3).map(e => (
                          <div key={e.key} className={cx('flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px]',
                            e.kind === 'visit' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : e.at < now ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-500/10 text-[var(--color-text-primary)]')}>
                            {e.kind === 'visit' ? <Store size={11} className="shrink-0" /> : <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-3">{TASK_ICON[e.task.type]}</span>}
                            <span className="truncate">{e.lead.name}</span>
                          </div>
                        ))}
                        {list.length > 3 && <div className="px-1 text-[11px] text-[var(--color-text-muted)]">+{list.length - 3} more</div>}
                      </div>
                    )}
                    {(visits > 0 || late > 0) && <span className="sr-only">{visits} visits, {late} overdue</span>}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title={selected == null ? 'Pick a day' : new Date(selected).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}>
            {dayEntries.length === 0
              ? <EmptyState icon={<CalendarDays size={18} />} title="Nothing booked" hint="No visits or follow-ups on this day." />
              : (
                <ul className="divide-y divide-[var(--color-border-subtle)]">
                  {dayEntries.map(e => {
                    const rep = e.lead.assigneeId ? userById.get(e.lead.assigneeId) : undefined
                    return (
                      <li key={e.key}>
                        <button onClick={() => openLead(e.lead.id)} className="flex w-full items-start gap-3 py-3 text-left transition hover:bg-white/40">
                          <span className={cx('mt-0.5 shrink-0 rounded-full p-1.5',
                            e.kind === 'visit' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : e.at < now ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-500/10 text-[var(--color-text-muted)]')}>
                            {e.kind === 'visit' ? <Store size={14} /> : TASK_ICON[e.task.type]}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{e.lead.name}</span>
                              <LeadStatusBadge status={e.lead.status} />
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
                              {timeOf(e.at)} · {e.kind === 'visit' ? 'Showroom visit' : e.task.title}
                              {e.kind === 'task' && e.at < now && ' · overdue'}
                            </span>
                            <span className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                              <CollectionIcon id={e.lead.categoryId} />
                              <span className="truncate">{categoryById.get(e.lead.categoryId)?.name ?? '—'}</span>
                              {who === 'all' && rep && <><Avatar name={rep.name} size="xs" /><span className="truncate">{rep.name}</span></>}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
          </Card>
        </div>
      )}
    </>
  )
}
