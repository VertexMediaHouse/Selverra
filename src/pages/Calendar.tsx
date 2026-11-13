import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Route } from '../components/Shell'
import { Avatar, Card, CardHead, PageHead, Segmented, Select } from '../components/ui'
import { TASKS } from '../data/mock'
import { REPS, TASK_CHIP, type Task } from '../data/types'

/** "Today" in the sample data: Fri 13 Nov 2026. Every scheduled task sits in
 *  the week that starts here, so this is where the calendar opens. */
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

const WEEK_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' })
const DAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' })

export default function Calendar({ go }: { go: (r: Route) => void }) {
  const [view, setView] = useState<'week' | 'list'>('week')
  const [rep, setRep] = useState('All')
  const [type, setType] = useState('All')
  const [start, setStart] = useState(() => weekStart(TODAY))
  /** Tasks dragged to another day: task id to YYYY-MM-DD. */
  const [moved, setMoved] = useState<Record<string, string>>({})
  const [over, setOver] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    [start],
  )

  const items = TASKS.filter(
    (t) =>
      t.due !== 'overdue' &&
      (rep === 'All' || t.rep === rep) &&
      (type === 'All' || t.type === type),
  )

  const dayKey = (t: Task) => moved[t.id] ?? dateOf(t)
  const isDone = (t: Task) => done[t.id] ?? t.done

  /** Only the tasks inside the week on show — the list view and the counts in
   *  the heading both follow the arrows. */
  const weekItems = useMemo(() => {
    const keys = new Set(days.map(iso))
    return items.filter((t) => keys.has(dayKey(t))).sort((a, b) => minutesOf(a) - minutesOf(b))
  }, [items, days, moved])

  const visits = weekItems.filter((t) => t.type === 'Site visit').length

  const drop = (key: string) => (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(null)
    if (id) setMoved((p) => ({ ...p, [id]: key }))
  }

  const label = `${WEEK_FMT.format(days[0])} – ${WEEK_FMT.format(days[6])} ${days[6].getFullYear()}`

  return (
    <>
      <PageHead
        title="Calendar"
        sub={`Week of ${label} · ${weekItems.length} booked · ${visits} store visits · sample data`}
      >
        <div role="group" aria-label="Change week" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setStart((d) => addDays(d, -7))}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setStart(weekStart(TODAY))}
            className="min-h-10 cursor-pointer rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setStart((d) => addDays(d, 7))}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <Segmented
          label="Calendar view"
          value={view}
          onChange={setView}
          options={[
            { id: 'week', label: 'Week' },
            { id: 'list', label: 'List' },
          ]}
        />
      </PageHead>

      <Card className="flex flex-wrap items-end gap-3">
        <Select label="Salesperson" value={rep} options={['All', ...Object.keys(REPS)]} onChange={setRep} />
        <Select
          label="Type"
          value={type}
          options={['All', 'Call', 'Message', 'Site visit', 'Future contact', 'Other']}
          onChange={setType}
        />
      </Card>

      {view === 'week' ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1000px] gap-3 [grid-template-columns:repeat(7,minmax(0,1fr))]">
            {days.map((d) => {
              const key = iso(d)
              const today = key === iso(TODAY)
              const dayItems = weekItems.filter((t) => dayKey(t) === key)
              const dayVisits = dayItems.filter((t) => t.type === 'Site visit').length
              const left = dayItems.filter((t) => !isDone(t)).length
              return (
                <section
                  key={key}
                  aria-label={DAY_FMT.format(d)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (over !== key) setOver(key)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
                  }}
                  onDrop={drop(key)}
                  className={`flex flex-col gap-2 rounded-[14px] border p-3 ${
                    today ? 'border-plum bg-surface' : 'border-line bg-well/50'
                  } ${over === key ? 'outline-2 outline-dashed outline-plum' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <h2 className={`m-0 text-[13px] font-semibold ${today ? 'text-plum' : ''}`}>
                      {DAY_FMT.format(d)}
                    </h2>
                    {today ? (
                      <span className="rounded-full bg-plum px-2 py-0.5 text-[10px] font-bold text-white">
                        Today
                      </span>
                    ) : null}
                  </div>

                  {dayItems.length > 0 ? (
                    <p className="m-0 flex flex-wrap gap-x-2 text-[11px] text-ink-mute">
                      <span>{left} to do</span>
                      {dayVisits > 0 ? <span>· {dayVisits} visit{dayVisits > 1 ? 's' : ''}</span> : null}
                    </p>
                  ) : null}

                  {dayItems.length === 0 ? (
                    <p className="m-0 py-2 text-xs text-ink-mute">Nothing booked</p>
                  ) : (
                    dayItems.map((t) => {
                      const [initials, bg] = REPS[t.rep] ?? REPS.Unassigned
                      const complete = isDone(t)
                      return (
                        <article
                          key={t.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', t.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => setOver(null)}
                          className={`flex cursor-grab flex-col gap-1 rounded-[10px] border border-[#E2DCD8] bg-surface p-2.5 active:cursor-grabbing ${
                            complete ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-ink">{timeOf(t)}</span>
                            <label className="ml-auto flex cursor-pointer items-center gap-1">
                              <input
                                type="checkbox"
                                checked={complete}
                                draggable={false}
                                onChange={(e) =>
                                  setDone((p) => ({ ...p, [t.id]: e.target.checked }))
                                }
                                className="h-3.5 w-3.5 cursor-pointer accent-plum"
                              />
                              <span className="sr-only">Mark {t.title} done</span>
                            </label>
                          </div>
                          <span
                            className={`w-fit whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${TASK_CHIP[t.type]}`}
                          >
                            {t.type}
                          </span>
                          <button
                            type="button"
                            draggable={false}
                            onClick={() => go('lead')}
                            className={`w-fit cursor-pointer border-0 bg-transparent p-0 text-left text-xs font-semibold text-ink ${
                              complete ? 'line-through' : ''
                            }`}
                          >
                            {t.lead}
                          </button>
                          <span className="text-[11px] text-ink-mute">{t.context}</span>
                          <div className="flex items-center gap-1.5 border-t border-line-soft pt-1.5">
                            <Avatar initials={initials} bg={bg} />
                            <span className="text-[11px] text-ink-soft">{t.rep}</span>
                          </div>
                        </article>
                      )
                    })
                  )}
                </section>
              )
            })}
          </div>
        </div>
      ) : (
        <Card className="flex flex-col">
          <CardHead title="Everything booked this week" aside={`${weekItems.length} entries`} />
          {weekItems.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-line-soft py-3">
              <span className="w-[140px] text-[13px] font-semibold">{t.time}</span>
              <span
                className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${TASK_CHIP[t.type]}`}
              >
                {t.type}
              </span>
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-[3px]">
                <a
                  href="#/lead"
                  onClick={(e) => {
                    e.preventDefault()
                    go('lead')
                  }}
                  className="text-sm font-semibold text-ink no-underline"
                >
                  {t.lead}
                </a>
                <span className="text-xs text-ink-mute">
                  {t.title} · {t.context}
                </span>
              </div>
              <span className="ml-auto text-xs text-ink-mute">{t.rep}</span>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}
