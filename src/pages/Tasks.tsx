import { useState } from 'react'
import type { Route } from '../components/Shell'
import { Avatar, Card, PageHead, Select } from '../components/ui'
import { TASKS } from '../data/mock'
import { LEADS } from '../data/mock'
import { REPS, TASK_CHIP, type Task } from '../data/types'

type Tab = 'overdue' | 'today' | 'upcoming' | 'done'

/** The automations the CRM runs on its own. Toggles are local-only for now. */
const AUTO_RULES: { title: string; sub: string }[] = [
  { title: 'New lead is assigned', sub: 'First message or call task, due in 15 minutes' },
  { title: 'Lead unassigned for 30 minutes', sub: 'Task for the manager to assign it' },
  { title: 'Lead moves to Messaged', sub: 'Call task for the next working day' },
  { title: 'A call is not answered', sub: 'Next call task after 1 day, up to Call 4, then No reply' },
  { title: 'Site visit is booked', sub: 'Visit task at that time, plus a confirm call task 2 hours before' },
  { title: 'Lead moves to Future contact', sub: 'Task on the chosen date, also shown in the Calendar' },
  { title: 'Lead moves to Purchased', sub: 'Thank you call task after 3 days' },
]

export default function Tasks({ go }: { go: (r: Route) => void }) {
  const [whose, setWhose] = useState('Neha Shah')
  const [tab, setTab] = useState<Tab>('today')
  const [done, setDone] = useState<Record<string, boolean>>(
    Object.fromEntries(TASKS.filter((t) => t.done).map((t) => [t.id, true])),
  )
  const [auto, setAuto] = useState<Record<string, boolean>>(
    Object.fromEntries(AUTO_RULES.map((r) => [r.title, true])),
  )
  const [form, setForm] = useState({
    lead: '',
    type: 'Call',
    date: '2026-11-13',
    time: '16:00',
    rep: 'Neha Shah',
    priority: 'Normal',
    note: '',
  })

  const mine = TASKS.filter((t) => whose === 'Everyone' || t.rep === whose)
  const inTab = (t: Task, k: Tab) => (k === 'done' ? done[t.id] : t.due === k && !done[t.id])
  const counts = {
    overdue: mine.filter((t) => inTab(t, 'overdue')).length,
    today: mine.filter((t) => inTab(t, 'today')).length,
    upcoming: mine.filter((t) => inTab(t, 'upcoming')).length,
    done: mine.filter((t) => inTab(t, 'done')).length,
  }
  const rows = mine.filter((t) => inTab(t, tab))

  const field = 'min-h-10 w-full rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink'
  const labelCls = 'flex flex-col gap-1 text-xs font-medium text-ink-mute'

  return (
    <>
      <PageHead title="Tasks" sub="Work assigned by managers and follow-ups the CRM creates on its own">
        <Select
          label="Whose tasks"
          value={whose}
          options={['Everyone', ...Object.keys(REPS).filter((r) => r !== 'Unassigned')]}
          onChange={setWhose}
        />
      </PageHead>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-4">
          <div role="group" aria-label="Which tasks" className="flex flex-wrap gap-2">
            {(
              [
                ['overdue', 'Overdue'],
                ['today', 'Today'],
                ['upcoming', 'Upcoming'],
                ['done', 'Done'],
              ] as [Tab, string][]
            ).map(([id, label]) => {
              const on = id === tab
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTab(id)}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border px-3.5 text-[13px] ${
                    on
                      ? 'border-ink bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                      : 'border-line bg-transparent font-medium text-ink-soft'
                  }`}
                >
                  {label}
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-semibold ${
                      id === 'overdue' && counts.overdue ? 'bg-[#FDE8E6] text-[#9A2A1C]' : 'bg-chip text-ink-mute'
                    }`}
                  >
                    {counts[id]}
                  </span>
                </button>
              )
            })}
          </div>

          <Card className="flex flex-col p-0">
            {rows.length === 0 ? (
              <p className="m-0 py-10 text-center text-sm text-ink-mute">Nothing here.</p>
            ) : (
              rows.map((t, i) => {
                const isDone = !!done[t.id]
                const [initials, bg] = REPS[t.rep] ?? REPS.Unassigned
                return (
                  <div
                    key={t.id}
                    className={`grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-3.5 ${
                      i ? 'border-t border-line-soft' : ''
                    }`}
                  >
                    {/* Row 1: checkbox, chip + title, due time — one shared 20px line box. */}
                    <label className="flex h-5 cursor-pointer items-center justify-center">
                      <span className="sr-only">Mark done: {t.title}</span>
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => setDone((d) => ({ ...d, [t.id]: !isDone }))}
                        className="h-[18px] w-[18px] cursor-pointer accent-plum"
                      />
                    </label>
                    <span className="flex h-5 min-w-0 items-center gap-2">
                      <span
                        className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] leading-4 font-semibold ${TASK_CHIP[t.type]}`}
                      >
                        {t.type}
                      </span>
                      <span
                        className={`truncate text-sm font-semibold ${
                          isDone ? 'text-ink-mute line-through' : 'text-ink'
                        }`}
                      >
                        {t.title}
                      </span>
                    </span>
                    <span
                      className={`flex h-5 items-center text-[13px] font-semibold whitespace-nowrap ${
                        t.due === 'overdue' ? 'text-bad' : 'text-ink'
                      }`}
                    >
                      {t.due === 'upcoming' ? t.time : `Today ${t.time}`}
                    </span>

                    {/* Row 2: context under the title, rep under the time. */}
                    <span className="col-start-2 flex h-5 min-w-0 items-center truncate text-xs text-ink-soft">
                      <a
                        href="#/lead"
                        onClick={(e) => {
                          e.preventDefault()
                          go('lead')
                        }}
                        className="font-medium text-plum underline"
                      >
                        {t.lead}
                      </a>
                      <span className="truncate">
                        {' '}
                        · {t.context} · {t.type === 'Other' ? 'Assigned by a manager' : 'Automatic'}
                      </span>
                    </span>
                    <span className="flex h-5 items-center gap-1.5 justify-self-end text-xs whitespace-nowrap text-ink-soft">
                      <Avatar initials={initials} bg={bg} />
                      {t.rep}
                    </span>
                  </div>
                )
              })
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          {/* Tab row is min-h-10 above a gap-4; this column's gap is 5 (20px),
              so the spacer is 40 + 16 − 20 = 36px. */}
          <div aria-hidden="true" className="hidden h-9 lg:block" />
          <Card className="flex flex-col gap-3">
            <div>
              <h2 className="m-0 text-base font-semibold">Assign a task</h2>
              <p className="mt-1 mb-0 text-xs text-ink-mute">
                Managers and the owner can give work to anyone below them.
              </p>
            </div>
            <label className={labelCls}>
              Lead
              <input
                list="task-leads"
                value={form.lead}
                onChange={(e) => setForm({ ...form, lead: e.target.value })}
                placeholder="Search a lead (optional)"
                className={field}
              />
              <datalist id="task-leads">
                {LEADS.map((l) => (
                  <option key={l.id} value={l.name} />
                ))}
              </datalist>
            </label>
            <Select
              wide
              label="Task"
              value={form.type}
              options={['Call', 'Message', 'Site visit', 'Future contact', 'Other']}
              onChange={(v) => setForm({ ...form, type: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>
                Due date
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={field}
                />
              </label>
              <label className={labelCls}>
                Time
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={field}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                wide
                label="Assign to"
                value={form.rep}
                options={Object.keys(REPS).filter((r) => r !== 'Unassigned')}
                onChange={(v) => setForm({ ...form, rep: v })}
              />
              <Select
                wide
                label="Priority"
                value={form.priority}
                options={['Normal', 'High', 'Low']}
                onChange={(v) => setForm({ ...form, priority: v })}
              />
            </div>
            <label className={labelCls}>
              Note
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="What should they do?"
                className="w-full rounded-[10px] border border-[#DCD5D1] bg-surface p-2.5 text-[13px] text-ink"
              />
            </label>
            <button
              type="button"
              className="min-h-11 cursor-pointer rounded-[10px] border-0 bg-ink text-sm font-semibold text-white"
            >
              Assign task
            </button>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="m-0 text-base font-semibold">Automatic tasks</h2>
            <div className="flex flex-col gap-3">
              {AUTO_RULES.map((r) => (
                <label key={r.title} className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={!!auto[r.title]}
                    onChange={() => setAuto((a) => ({ ...a, [r.title]: !a[r.title] }))}
                    className="mt-0.5 h-[16px] w-[16px] shrink-0 cursor-pointer accent-plum"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-ink">{r.title}</span>
                    <span className="text-xs text-ink-soft">{r.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
