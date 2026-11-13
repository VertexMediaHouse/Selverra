import { useState } from 'react'
import type { Route } from '../components/Shell'
import { Card, PageHead, Segmented, Select } from '../components/ui'
import { TASKS } from '../data/mock'
import { REPS, TASK_CHIP, type Task } from '../data/types'

type Scope = 'all' | 'overdue' | 'today' | 'upcoming'

const GROUPS: { due: Task['due']; title: string; tone: string }[] = [
  { due: 'overdue', title: 'Overdue', tone: 'text-bad' },
  { due: 'today', title: 'Today', tone: 'text-ink' },
  { due: 'upcoming', title: 'Later this week', tone: 'text-ink' },
]

export default function Tasks({ go }: { go: (r: Route) => void }) {
  const [scope, setScope] = useState<Scope>('all')
  const [rep, setRep] = useState('All')
  const [type, setType] = useState('All')
  const [done, setDone] = useState<Record<string, boolean>>(
    Object.fromEntries(TASKS.filter((t) => t.done).map((t) => [t.id, true])),
  )

  const visible = TASKS.filter(
    (t) =>
      (scope === 'all' || t.due === scope) &&
      (rep === 'All' || t.rep === rep) &&
      (type === 'All' || t.type === type),
  )

  const counts = {
    overdue: TASKS.filter((t) => t.due === 'overdue' && !done[t.id]).length,
    today: TASKS.filter((t) => t.due === 'today').length,
    upcoming: TASKS.filter((t) => t.due === 'upcoming').length,
  }

  return (
    <>
      <PageHead
        title="Tasks"
        sub={`${counts.overdue} overdue · ${counts.today} today · ${counts.upcoming} later this week · sample data`}
      >
        <Segmented
          label="Which tasks"
          value={scope}
          onChange={setScope}
          options={[
            { id: 'all', label: 'All' },
            { id: 'overdue', label: `Overdue (${counts.overdue})` },
            { id: 'today', label: 'Today' },
            { id: 'upcoming', label: 'Later' },
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

      {GROUPS.filter((g) => scope === 'all' || scope === g.due).map((g) => {
        const rows = visible.filter((t) => t.due === g.due)
        if (!rows.length) return null
        return (
          <Card key={g.due} className="flex flex-col">
            <div className="flex items-center justify-between gap-3 pb-1">
              <h2 className={`m-0 text-base font-semibold ${g.tone}`}>{g.title}</h2>
              <span className="text-[13px] text-ink-mute">{rows.length} tasks</span>
            </div>
            {rows.map((t) => {
              const isDone = !!done[t.id]
              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-line-soft py-3"
                >
                  <label className="flex h-7 w-7 cursor-pointer items-center justify-center">
                    <span className="sr-only">Mark done: {t.title}</span>
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => setDone((d) => ({ ...d, [t.id]: !isDone }))}
                      className="h-[18px] w-[18px] cursor-pointer accent-plum"
                    />
                  </label>
                  <span
                    className={`w-[112px] text-[13px] ${
                      isDone
                        ? 'text-ink-mute'
                        : g.due === 'overdue'
                          ? 'font-semibold text-bad'
                          : 'font-semibold text-ink'
                    }`}
                  >
                    {t.time}
                  </span>
                  <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-[3px]">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${TASK_CHIP[t.type]}`}
                      >
                        {t.type}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isDone ? 'text-ink-mute line-through' : 'text-ink'
                        }`}
                      >
                        {t.title}
                      </span>
                    </span>
                    <span className="text-xs text-ink-soft">
                      <a
                        href="#/lead"
                        onClick={(e) => {
                          e.preventDefault()
                          go('lead')
                        }}
                        className="text-ink-soft"
                      >
                        {t.lead}
                      </a>{' '}
                      · {t.context}
                    </span>
                  </div>
                  <span className="ml-auto text-xs text-ink-mute">{t.rep}</span>
                </div>
              )
            })}
          </Card>
        )
      })}

      {visible.length === 0 ? (
        <Card>
          <p className="m-0 py-6 text-center text-sm text-ink-mute">No tasks match these filters.</p>
        </Card>
      ) : null}
    </>
  )
}
