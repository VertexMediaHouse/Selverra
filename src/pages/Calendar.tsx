import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Route } from '../components/Shell'
import { Card, PageHead, Segmented, Select } from '../components/ui'
import { LEADS, TASKS } from '../data/mock'
import {
  COLLECTIONS,
  REPS,
  SOURCES,
  STAGES,
  TASK_CHIP,
  type Task,
  type TaskType,
} from '../data/types'

/** "Today" in the sample data: Fri 13 Nov 2026. The calendar opens on this month. */
const TODAY = new Date(2026, 10, 13)

/** Local YYYY-MM-DD. Not toISOString(), which shifts to UTC and moves the
 *  date for anyone east of Greenwich. */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Monday-start week containing `d`. */
function weekStart(d: Date) {
  const dow = d.getDay()
  return addDays(d, dow === 0 ? -6 : 1 - dow)
}

/** Which date a task sits on. Upcoming tasks carry the day-of-month in their
 *  time string ("Sat 14 · 12:00 PM"); everything else is due today. All sample
 *  data is November 2026. */
function dateOf(t: Task): string {
  if (t.due !== 'upcoming') return iso(TODAY)
  const n = Number(t.time.match(/\d+/)?.[0])
  return Number.isFinite(n) ? iso(new Date(2026, 10, n)) : iso(TODAY)
}

const timeOf = (t: Task) => (t.due === 'upcoming' ? t.time.split('· ')[1] ?? t.time : t.time)

/** Minutes past midnight, for sorting a day's tasks into real clock order. */
function minutesOf(t: Task) {
  const m = timeOf(t).match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  const h = Number(m[1]) % 12
  return (h + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + Number(m[2])
}

/** Compact "11 AM" / "12:30 PM" — the month cells and the agenda rail drop ":00". */
const shortTime = (t: Task) => timeOf(t).replace(':00', '')

const CAMPAIGN_NAMES = [
  'Sannjh Bridal – Lead Form',
  'Uphaar Gifting – Messenger',
  'Regalia – Instagram DM',
  'Moksha Temple Decor – Lead Form',
  'New Traffic Campaign',
  'No campaign',
]

const AD_SETS = [
  'Brides-to-be 22–32 · Ahmedabad',
  'Lookalike 1% – past buyers',
  'Festive gifting · Gujarat',
]

/** The coloured legend above the grid. Each entry switches one band of the
 *  calendar on or off; "New leads count" is the grey per-day total, not a task
 *  type, so it carries no `type`. */
const LAYERS: { id: string; label: string; dot: string; type?: TaskType }[] = [
  { id: 'visits', label: 'Site visits', dot: '#7E3AF2', type: 'Site visit' },
  { id: 'calls', label: 'Calls', dot: '#0B7FB5', type: 'Call' },
  { id: 'messages', label: 'Messages', dot: '#0F8A80', type: 'Message' },
  { id: 'tasks', label: 'Follow-ups & tasks', dot: '#C08A1E', type: 'Other' },
  { id: 'future', label: 'Future contact', dot: '#9D174D', type: 'Future contact' },
  { id: 'leads', label: 'New leads count', dot: '#5B6676' },
]

/** Per-day new-lead counts for November 2026, as the month grid shows them.
 *  Keyed by day of month; days left out had none. */
const NEW_LEADS: Record<number, number> = {
  1: 20, 2: 26, 3: 31, 4: 27, 5: 30, 6: 34, 7: 26, 8: 19,
  9: 27, 10: 25, 11: 23, 12: 34, 13: 18, 14: 29, 15: 22,
}

const MONTH_FMT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
const DAY_FULL_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const WEEK_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' })
const DAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' })
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Campaign, source and collection for a lead name, so the agenda rows and the
 *  filter row agree on which slice a task belongs to. */
const LEAD_BY_NAME = new Map(LEADS.map((l) => [l.name, l]))

export default function Calendar({ go }: { go: (r: Route) => void }) {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [cursor, setCursor] = useState(TODAY)
  const [selected, setSelected] = useState(iso(TODAY))
  const [off, setOff] = useState<Record<string, boolean>>({})
  const [f, setF] = useState({
    campaign: 'All',
    adset: 'All',
    source: 'All',
    stage: 'All',
    status: 'All',
    rep: 'All',
    collection: 'All',
  })
  /** Tasks dragged to another day: task id to YYYY-MM-DD. */
  const [moved, setMoved] = useState<Record<string, string>>({})
  const [over, setOver] = useState<string | null>(null)

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const dayKey = (t: Task) => moved[t.id] ?? dateOf(t)
  const showLeads = !off.leads

  /** Every task that passes the legend and the filter row. The lead-side
   *  filters only narrow tasks whose lead is in the sample book; a task for a
   *  lead we do not hold stays visible rather than vanishing silently. */
  const items = useMemo(() => {
    const hidden = new Set(
      LAYERS.filter((l) => l.type && off[l.id]).map((l) => l.type as TaskType),
    )
    return TASKS.filter((t) => {
      // Overdue work has no date of its own — it belongs on the Tasks page, not
      // stacked onto today's agenda.
      if (t.due === 'overdue') return false
      if (hidden.has(t.type)) return false
      if (f.rep !== 'All' && t.rep !== f.rep) return false
      const l = LEAD_BY_NAME.get(t.lead)
      if (!l) return true
      return (
        (f.campaign === 'All' || l.campaign === f.campaign) &&
        (f.adset === 'All' || l.adset === f.adset) &&
        (f.source === 'All' || l.source === f.source) &&
        (f.stage === 'All' || l.stage === f.stage) &&
        (f.status === 'All' || l.status === f.status) &&
        (f.collection === 'All' || l.collection === f.collection)
      )
    })
  }, [f, off])

  /** Day key to that day's tasks, clock-ordered. */
  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of items) {
      const k = moved[t.id] ?? dateOf(t)
      const list = m.get(k)
      if (list) list.push(t)
      else m.set(k, [t])
    }
    for (const list of m.values()) list.sort((a, b) => minutesOf(a) - minutesOf(b))
    return m
  }, [items, moved])

  /** The six Monday-start weeks that cover the month on show, so the grid keeps
   *  one shape and the edge days of the neighbouring months fill in. */
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = weekStart(first)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [cursor])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart(cursor), i)),
    [cursor],
  )

  const visibleDays = view === 'month' ? grid : view === 'week' ? weekDays : [cursor]

  /** Counts in the footer follow whatever range is on show. */
  const rangeItems = useMemo(() => {
    const keys = new Set(visibleDays.map(iso))
    return items.filter((t) => keys.has(dayKey(t)))
  }, [items, visibleDays, moved])

  const agenda = byDay.get(selected) ?? []
  const selDate = new Date(`${selected}T00:00:00`)
  const isToday = selected === iso(TODAY)
  const selLeads = showLeads && selDate.getMonth() === 10 ? NEW_LEADS[selDate.getDate()] : undefined

  const step = (n: number) =>
    setCursor((d) =>
      view === 'month'
        ? new Date(d.getFullYear(), d.getMonth() + n, 1)
        : addDays(d, n * (view === 'week' ? 7 : 1)),
    )

  const drop = (key: string) => (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(null)
    if (id) setMoved((p) => ({ ...p, [id]: key }))
  }

  const rangeLabel =
    view === 'month'
      ? MONTH_FMT.format(cursor)
      : view === 'week'
        ? `${WEEK_FMT.format(weekDays[0])} – ${WEEK_FMT.format(weekDays[6])} ${weekDays[6].getFullYear()}`
        : DAY_FULL_FMT.format(cursor)

  const visits = rangeItems.filter((t) => t.type === 'Site visit').length

  return (
    <>
      <PageHead
        title="Calendar"
        sub="Visits, calls, messages, tasks and future-contact dates land here on their own"
      >
        <div role="group" aria-label="Change range" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => step(-1)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[150px] px-1 text-center text-[15px] font-bold text-ink">
            {rangeLabel}
          </span>
          <button
            type="button"
            aria-label="Next"
            onClick={() => step(1)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setCursor(TODAY)
              setSelected(iso(TODAY))
            }}
            className="ml-1.5 min-h-10 cursor-pointer rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink"
          >
            Today
          </button>
        </div>
        <Segmented
          label="Calendar view"
          value={view}
          onChange={setView}
          options={[
            { id: 'month', label: 'Month' },
            { id: 'week', label: 'Week' },
            { id: 'day', label: 'Day' },
          ]}
        />
      </PageHead>

      <Card className="flex flex-col gap-3.5">
        <div role="group" aria-label="Show on calendar" className="flex flex-wrap gap-2">
          {LAYERS.map((l) => {
            const on = !off[l.id]
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                onClick={() => setOff((p) => ({ ...p, [l.id]: on }))}
                className={`flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${
                  on ? 'border-plum bg-surface text-ink' : 'border-line bg-well/60 text-ink-mute'
                }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: on ? l.dot : '#C9C2BD' }}
                />
                {l.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Select label="Campaign" value={f.campaign} options={['All', ...CAMPAIGN_NAMES]} onChange={set('campaign')} />
          <Select label="Ad set" value={f.adset} options={['All', ...AD_SETS]} onChange={set('adset')} />
          <Select label="Source" value={f.source} options={['All', ...SOURCES]} onChange={set('source')} />
          <Select label="Stage" value={f.stage} options={['All', ...STAGES]} onChange={set('stage')} />
          <Select label="Status" value={f.status} options={['All', 'Hot', 'Warm', 'Cold']} onChange={set('status')} />
          <Select label="Salesperson" value={f.rep} options={['All', ...Object.keys(REPS)]} onChange={set('rep')} />
          <Select label="Collection" value={f.collection} options={['All', ...COLLECTIONS]} onChange={set('collection')} />
        </div>
      </Card>

      <div className="grid gap-4 [grid-template-columns:minmax(0,1fr)] xl:[grid-template-columns:minmax(0,1fr)_360px]">
        <Card className="overflow-x-auto">
          <div className="min-w-[640px]">
            {view === 'day' ? null : (
              <div className="grid [grid-template-columns:repeat(7,minmax(0,1fr))]">
                {DOW.map((d) => (
                  <span key={d} className="px-2 pb-2 text-[11px] font-semibold text-ink-mute">
                    {d}
                  </span>
                ))}
              </div>
            )}

            <div
              className={`grid gap-px bg-line-soft ${
                view === 'day'
                  ? '[grid-template-columns:minmax(0,1fr)]'
                  : '[grid-template-columns:repeat(7,minmax(0,1fr))]'
              } ${view === 'month' ? '[grid-auto-rows:minmax(96px,auto)]' : ''}`}
            >
              {visibleDays.map((d) => {
                const key = iso(d)
                const dayItems = byDay.get(key) ?? []
                const shown = view === 'month' ? dayItems.slice(0, 4) : dayItems
                const extra = dayItems.length - shown.length
                const today = key === iso(TODAY)
                const inMonth = view === 'month' ? d.getMonth() === cursor.getMonth() : true
                const leads = inMonth && d.getMonth() === 10 ? NEW_LEADS[d.getDate()] : undefined
                const weekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={DAY_FMT.format(d)}
                    aria-pressed={key === selected}
                    onClick={() => setSelected(key)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (over !== key) setOver(key)
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
                    }}
                    onDrop={drop(key)}
                    className={`flex cursor-pointer flex-col items-stretch gap-1 border-0 p-1.5 text-left ${
                      view === 'month' ? 'min-h-[96px]' : 'min-h-[220px]'
                    } ${inMonth ? 'bg-surface' : 'bg-well/60'} ${
                      key === selected ? 'outline-2 -outline-offset-2 outline-plum' : ''
                    } ${over === key ? 'outline-2 outline-dashed outline-plum' : ''}`}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span
                        className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] ${
                          today
                            ? 'bg-plum font-bold text-white'
                            : !inMonth
                              ? 'font-semibold text-ink-mute'
                              : weekend
                                ? 'font-bold text-[#9A2A1C]'
                                : 'font-bold text-ink'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                      {showLeads && leads ? (
                        <span className="text-[10px] font-semibold text-ink-mute">{leads} new</span>
                      ) : null}
                    </span>

                    {shown.map((t) => (
                      <span
                        key={t.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', t.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => setOver(null)}
                        className={`block cursor-grab truncate rounded px-1 py-0.5 text-[10px] font-semibold active:cursor-grabbing ${TASK_CHIP[t.type]}`}
                      >
                        {shortTime(t)} {t.lead}
                      </span>
                    ))}

                    {extra > 0 ? (
                      <span className="px-1 text-[10px] font-semibold text-ink-mute">
                        +{extra} more
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        <Card className="flex max-h-[calc(100vh-2.5rem)] min-h-0 flex-col xl:sticky xl:top-5">
          <header className="shrink-0 pb-2">
            <h2 className="m-0 text-[15px] font-bold">
              {DAY_FULL_FMT.format(selDate)}
              {isToday ? ' · today' : ''}
            </h2>
            <p className="mt-1 mb-0 text-xs text-ink-mute">
              {agenda.filter((t) => t.type === 'Site visit').length} visits ·{' '}
              {agenda.filter((t) => t.type === 'Call').length} calls ·{' '}
              {agenda.filter((t) => t.type !== 'Site visit' && t.type !== 'Call').length} tasks
              {selLeads ? ` · ${selLeads} new leads came in` : ''}
            </p>
          </header>

          <div className="no-bar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {agenda.length === 0 ? (
            <p className="m-0 border-t border-line-soft py-4 text-xs text-ink-mute">
              Nothing booked on this day
            </p>
          ) : (
            agenda.map((t) => (
              <article key={t.id} className="flex items-start border-t border-line-soft py-2.5">
                <span className="w-[66px] shrink-0 pt-0.5 pr-3 text-[11px] font-semibold text-ink-soft">
                  {shortTime(t)}
                </span>
                <div className="flex min-w-0 flex-col gap-1 border-l border-line-soft pl-3">
                  <span
                    className={`w-fit whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${TASK_CHIP[t.type]}`}
                  >
                    {t.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => go('lead')}
                    className="w-fit cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-ink"
                  >
                    {t.title}
                  </button>
                  <span className="text-[11px] text-ink-mute">
                    <span className="text-plum underline">{t.lead}</span> · {t.context} · {t.rep}
                  </span>
                </div>
              </article>
            ))
          )}
          </div>

          <button
            type="button"
            onClick={() => go('tasks')}
            className="mt-1 shrink-0 cursor-pointer border-0 border-t border-line-soft bg-transparent py-3 text-center text-xs font-semibold text-plum"
          >
            + Add task or visit on this day
          </button>
        </Card>
      </div>

      <p className="m-0 text-xs text-ink-mute">
        {rangeItems.length} booked · {visits} store visits · sample data
      </p>
    </>
  )
}
