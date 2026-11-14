import { useState } from 'react'
import { RoleSwitch } from '../components/Shell'
import type { Route } from '../components/Shell'
import { Bar, Card, CardHead, PageHead, PeriodChips, Stat, Toast } from '../components/ui'
import type { Period } from '../components/ui'
import { MY_PIPELINE, PERIOD_LABEL, PERIOD_SHARE, TASKS } from '../data/mock'
import { STAGE_COLOR, TASK_CHIP, type Role } from '../data/types'
import { barWidth } from '../lib/format'

const MY_TASK_IDS = ['t5', 't6', 't8', 't11', 't13', 't14', 't17']

export default function SalesDashboard({
  role,
  setRole,
  go,
}: {
  role: Role
  setRole: (r: Role) => void
  go: (r: Route) => void
}) {
  const [period, setPeriod] = useState<Period>('month')
  const [contacted, setContacted] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({ t5: true, t6: true })

  const plan = MY_TASK_IDS.map((id) => TASKS.find((t) => t.id === id)!).map((t) => ({
    ...t,
    // The new-lead task flips to done the moment she says she has messaged Ishita.
    done: done[t.id] ?? (t.id === 't8' ? contacted : t.done),
    title: t.id === 't8' && contacted ? 'First message sent' : t.title,
    flag: t.id === 't8' && !contacted ? 'Due now' : '',
  }))

  const doneCount = plan.filter((p) => p.done).length
  const share = PERIOD_SHARE[period]
  // Mock data only has month totals, so shorter periods are scaled from them.
  const scale = (n: number) => Math.round(n * share)
  const my = {
    visits: scale(21),
    target: scale(25),
    replyMins: period === 'month' ? 8 : period === 'week' ? 9 : 7,
  }
  const pipeline = MY_PIPELINE.map(([stage, count]) => ({
    stage,
    count: scale(
      stage === 'New lead' && contacted ? 0 : stage === 'Messaged' && contacted ? 13 : count,
    ),
  }))
  const pipeMax = Math.max(...pipeline.map((p) => p.count)) || 1

  const upcoming = TASKS.filter((t) => t.due === 'upcoming' && t.rep === 'Neha Shah').slice(0, 5)

  return (
    <>
      <PageHead title="Good afternoon, Neha" sub="Here's your day · Friday, 13 November · sample data">
        <RoleSwitch role={role} setRole={setRole} />
        <PeriodChips value={period} onChange={setPeriod} />
      </PageHead>

      {!contacted ? (
        <section
          aria-label="New lead to contact"
          className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl bg-rail px-5 py-[18px] text-white"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-[0.04em] text-[#E5C8CF]">
              NEW LEAD · JUST ASSIGNED TO YOU BY MANSI
            </span>
            <span className="text-xl font-bold">Ishita Vyas · Sannjh bridal</span>
            <span className="text-sm text-[#E7DDDF]">
              Instant Form · Facebook · +91 97129 •••90 · wants a full bridal set, wedding in March
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-[10px] bg-white/10 px-3 py-2.5 text-sm font-bold text-[#FFD2C9]">
              Contact within 8 min
            </span>
            <a
              href="#/lead"
              onClick={(e) => {
                e.preventDefault()
                go('lead')
              }}
              className="flex min-h-11 items-center rounded-[10px] border border-white/35 px-4 text-sm font-semibold text-white no-underline"
            >
              Open lead
            </a>
            <button
              type="button"
              onClick={() => {
                setContacted(true)
                setToast('Ishita moved to Messaged. Add the message you sent on her lead page.')
              }}
              className="min-h-11 cursor-pointer rounded-[10px] border-0 bg-white px-4 text-sm font-bold text-rail"
            >
              I've messaged her
            </button>
          </div>
        </section>
      ) : null}

      <section
        aria-label="My numbers"
        className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
      >
        <Card className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-mute">Today's plan</span>
          <span className="text-[34px] font-bold tracking-[-0.02em]">
            {doneCount} of {plan.length}
          </span>
          <Bar width={barWidth(doneCount, plan.length)} />
          <span className="text-[13px] text-ink-soft">tasks done</span>
        </Card>
        <Stat
          label="Store visits today"
          value="2"
          note="Riya done · Kinjal at 4:00 PM"
          noteTone="soft"
        />
        <Card className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-mute">
            Visits {PERIOD_LABEL[period]}
          </span>
          <span className="text-[34px] font-bold tracking-[-0.02em]">
            {my.visits}{' '}
            <span className="text-base font-medium text-ink-mute">of {my.target} target</span>
          </span>
          <Bar width={barWidth(my.visits, my.target)} color="var(--color-teal)" />
          <span className="text-[13px] text-ink-soft">
            {Math.max(my.target - my.visits, 0)} more to reach your target
          </span>
        </Card>
        <Stat
          label="Your first reply time"
          value={`${my.replyMins} min`}
          note={`Fastest in the team ${PERIOD_LABEL[period]}`}
          noteTone="good"
        />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <Card className="flex min-w-0 flex-[3_1_520px] flex-col">
          <CardHead
            title="Today's plan"
            aside={
              <a
                href="#/tasks"
                onClick={(e) => {
                  e.preventDefault()
                  go('tasks')
                }}
                className="font-semibold"
              >
                All my tasks
              </a>
            }
          />
          {plan.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-line-soft py-3"
            >
              <label className="flex h-7 w-7 cursor-pointer items-center justify-center">
                <span className="sr-only">Mark done: {t.title}</span>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => setDone((d) => ({ ...d, [t.id]: !t.done }))}
                  className="h-[18px] w-[18px] cursor-pointer accent-plum"
                />
              </label>
              <span
                className={`w-[72px] text-[13px] ${t.done ? 'text-ink-mute' : 'font-semibold text-ink'}`}
              >
                {t.time}
              </span>
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-[3px]">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${TASK_CHIP[t.type]}`}
                  >
                    {t.type}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      t.done ? 'text-ink-mute line-through' : 'text-ink'
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
              <span className={`text-xs font-semibold ${t.done ? 'text-good' : 'text-bad'}`}>
                {t.done ? 'Done' : t.flag}
              </span>
            </div>
          ))}
        </Card>

        <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
          <Card className="flex flex-col gap-2.5">
            <CardHead
              title="My 98 leads this month"
              aside={
                <a
                  href="#/leads"
                  onClick={(e) => {
                    e.preventDefault()
                    go('leads')
                  }}
                  className="font-semibold"
                >
                  Open
                </a>
              }
            />
            {pipeline.map((p) => (
              <div
                key={p.stage}
                className="grid items-center gap-2.5 text-[13px] [grid-template-columns:120px_minmax(0,1fr)_28px]"
              >
                <span className="text-[#3F3A36]">{p.stage}</span>
                <Bar width={barWidth(p.count, pipeMax)} color={STAGE_COLOR[p.stage]} />
                <span className="text-right font-semibold">{p.count}</span>
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-1">
            <CardHead
              title="Coming up this week"
              aside={
                <a
                  href="#/calendar"
                  onClick={(e) => {
                    e.preventDefault()
                    go('calendar')
                  }}
                  className="font-semibold"
                >
                  Calendar
                </a>
              }
            />
            {upcoming.map((u) => (
              <div key={u.id} className="flex items-center gap-3 border-t border-line-soft py-2.5">
                <span className="w-[92px] shrink-0 text-xs font-semibold">{u.time}</span>
                <span className="min-w-0 flex-1 text-[13px]">
                  <span
                    className={`mr-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${TASK_CHIP[u.type]}`}
                  >
                    {u.type}
                  </span>
                  {u.lead} · {u.context}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {toast ? <Toast text={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  )
}
