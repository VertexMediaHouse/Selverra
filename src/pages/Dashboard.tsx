import { useState } from 'react'
import { RoleSwitch } from '../components/Shell'
import type { Route } from '../components/Shell'
import { Bar, Card, CardHead, PageHead, PeriodChips, Pill, Stat } from '../components/ui'
import type { Period } from '../components/ui'
import { PERIOD_SUMMARY, SOURCE_COUNTS, TODAY, VISITS } from '../data/mock'
import { SOURCES, type Role } from '../data/types'
import { barWidth } from '../lib/format'

export default function Dashboard({
  role,
  setRole,
  go,
}: {
  role: Role
  setRole: (r: Role) => void
  go: (r: Route) => void
}) {
  const [period, setPeriod] = useState<Period>('month')
  const d = PERIOD_SUMMARY[period]
  const counts = SOURCE_COUNTS[period]
  const max = Math.max(...counts) || 1

  const link = (r: Route, text: string) => (
    <a
      href={`#/${r}`}
      onClick={(e) => {
        e.preventDefault()
        go(r)
      }}
      className="mt-1 text-[13px] font-semibold"
    >
      {text}
    </a>
  )

  return (
    <>
      <PageHead title="Dashboard" sub={`${TODAY} · sample data`}>
        <RoleSwitch role={role} setRole={setRole} />
        <PeriodChips value={period} onChange={setPeriod} />
      </PageHead>

      <section
        aria-label="Needs attention"
        className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[14px] border border-[#F3D3CD] bg-[#FFF4F2] px-[18px] py-3.5 text-sm"
      >
        <span className="font-semibold text-[#8A1F14]">Needs attention now</span>
        <a href="#/leads" onClick={(e) => { e.preventDefault(); go('leads') }} className="text-[#5C1610]">
          6 new leads not called yet
        </a>
        <a href="#/tasks" onClick={(e) => { e.preventDefault(); go('tasks') }} className="text-[#5C1610]">
          4 follow-ups overdue
        </a>
        <a href="#/tasks" onClick={(e) => { e.preventDefault(); go('tasks') }} className="text-[#5C1610]">
          2 visits today not confirmed
        </a>
      </section>

      <section
        aria-label="Key numbers"
        className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]"
      >
        <Stat
          label="Campaigns running"
          value="8"
          note="5 bring leads · 3 awareness only · 1 paused"
          noteTone="soft"
        />
        <Card className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-mute">Leads {d.label}</span>
          <span className="text-4xl font-bold tracking-[-0.02em]">{d.leads}</span>
          <span className="text-[13px] text-good">{d.leadsNote}</span>
          {link('leads', 'Open leads →')}
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-mute">
            Site visits scheduled {d.label}
          </span>
          <span className="text-4xl font-bold tracking-[-0.02em]">{d.visits}</span>
          <span className="text-[13px] text-ink-soft">{d.visitsNote}</span>
          {link('tasks', 'See visit tasks →')}
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-mute">Not contacted yet</span>
          <span className="text-4xl font-bold tracking-[-0.02em]">6</span>
          <span className="text-[13px] text-bad">2 waiting over 15 minutes</span>
          {link('leads', 'Assign now →')}
        </Card>
      </section>

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
        <Card className="flex flex-col gap-3">
          <CardHead title="Today's site visits" aside="5 scheduled" />
          {VISITS.map((v) => (
            <div key={v.name} className="flex items-center gap-3.5 border-t border-line-soft py-3">
              <span className="w-[72px] shrink-0 text-sm font-semibold">{v.time}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <a
                  href="#/lead"
                  onClick={(e) => {
                    e.preventDefault()
                    go('lead')
                  }}
                  className="text-sm font-semibold text-ink no-underline"
                >
                  {v.name}
                </a>
                <span className="text-[13px] text-ink-mute">
                  {v.collection} · with {v.rep}
                </span>
              </div>
              <Pill tone={v.confirmed ? 'bg-[#E7F5EC] text-[#1E6B3A]' : 'bg-[#FEF3C7] text-[#7A4A06]'}>
                {v.confirmed ? 'Confirmed' : 'Not confirmed'}
              </Pill>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHead title="Where leads came from" aside={d.label} />
          {SOURCES.map((name, i) => (
            <div
              key={name}
              className="grid items-center gap-3 text-[13px] [grid-template-columns:180px_minmax(0,1fr)_40px]"
            >
              <span className="text-[#3F3A36]">{name}</span>
              <Bar width={barWidth(counts[i], max)} />
              <span className="text-right font-semibold">{counts[i]}</span>
            </div>
          ))}
        </Card>
      </section>
    </>
  )
}
