import { useState } from 'react'
import { RoleSwitch } from '../components/Shell'
import type { Route } from '../components/Shell'
import { Avatar, Bar, Card, CardHead, PageHead, PeriodChips, Pill, Stat } from '../components/ui'
import type { Period } from '../components/ui'
import { PERIOD_LABEL, PERIOD_SHARE, TASKS, TEAM, VISITS } from '../data/mock'
import { REPS, type Role } from '../data/types'
import { barWidth, inr } from '../lib/format'

export default function ManagerDashboard({
  role,
  setRole,
  go,
}: {
  role: Role
  setRole: (r: Role) => void
  go: (r: Route) => void
}) {
  const [period, setPeriod] = useState<Period>('month')
  const share = PERIOD_SHARE[period]
  // Mock data only has month totals, so shorter periods are scaled from them.
  const scale = (n: number) => Math.round(n * share)
  const team = TEAM.map((t) => ({
    ...t,
    leads: scale(t.leads),
    visits: scale(t.visits),
    target: scale(t.target),
    won: scale(t.won),
    value: scale(t.value),
    late: scale(t.late),
  }))
  const totalLeads = team.reduce((a, t) => a + t.leads, 0)
  const totalVisits = team.reduce((a, t) => a + t.visits, 0)
  const totalWon = team.reduce((a, t) => a + t.won, 0)
  const totalValue = team.reduce((a, t) => a + t.value, 0)
  const totalLate = team.reduce((a, t) => a + t.late, 0)
  const maxLeads = Math.max(...team.map((t) => t.leads)) || 1

  const unassigned = ['Ishita Vyas', 'Aarav Desai']
  const overdue = TASKS.filter((t) => t.due === 'overdue')

  return (
    <>
      <PageHead title="Team dashboard" sub="Mansi Shah · Bridal and Gifting · November, sample data">
        <RoleSwitch role={role} setRole={setRole} />
        <PeriodChips value={period} onChange={setPeriod} />
      </PageHead>

      <section
        aria-label="Needs your decision"
        className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[14px] border border-[#F3D3CD] bg-[#FFF4F2] px-[18px] py-3.5 text-sm"
      >
        <span className="font-semibold text-[#8A1F14]">Needs your decision</span>
        <a href="#/leads" onClick={(e) => { e.preventDefault(); go('leads') }} className="text-[#5C1610]">
          {unassigned.length} new leads waiting to be assigned
        </a>
        <a href="#/tasks" onClick={(e) => { e.preventDefault(); go('tasks') }} className="text-[#5C1610]">
          {totalLate} follow-ups overdue across the team
        </a>
        <a href="#/tasks" onClick={(e) => { e.preventDefault(); go('tasks') }} className="text-[#5C1610]">
          Ravi is 41 min on first reply — slowest
        </a>
      </section>

      <section
        aria-label="Team numbers"
        className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
      >
        <Stat label={`Leads ${PERIOD_LABEL[period]}`} value={totalLeads} note="across 4 salespeople" />
        <Stat
          label="Visits scheduled"
          value={totalVisits}
          note={`of ${team.reduce((a, t) => a + t.target, 0)} target`}
          noteTone="soft"
        />
        <Stat label="Purchased" value={totalWon} note={inr(totalValue) + ' sales value'} noteTone="good" />
        <Stat label="Overdue follow-ups" value={totalLate} note="3 are older than a day" noteTone="bad" />
      </section>

      <Card className="flex flex-col gap-0">
        <CardHead title="How each salesperson is doing" aside={PERIOD_LABEL[period]} />
        <div className="-mx-5 mt-2 overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                <th scope="col" className="px-5 py-2.5 font-medium">Salesperson</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Leads</th>
                <th scope="col" className="px-3 py-2.5 font-medium">First reply</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Visits</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Purchased</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Sales value</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {team.map((t) => {
                const [initials, bg] = REPS[t.rep]
                const slow = t.replyMins > 20
                return (
                  <tr key={t.rep} className="border-t border-line-soft">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar initials={initials} bg={bg} />
                        <span className="font-semibold">{t.rep}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span className="w-8 font-semibold">{t.leads}</span>
                        <span className="w-20">
                          <Bar width={barWidth(t.leads, maxLeads)} />
                        </span>
                      </span>
                    </td>
                    <td className={`px-3 py-3 font-semibold ${slow ? 'text-bad' : 'text-good'}`}>
                      {t.replyMins} min
                    </td>
                    <td className="px-3 py-3">
                      {t.visits} <span className="text-ink-mute">of {t.target}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold">{t.won}</td>
                    <td className="px-3 py-3 text-right font-semibold text-good">{inr(t.value)}</td>
                    <td className="px-5 py-3 text-right">
                      {t.late ? (
                        <Pill tone="bg-[#FDE8E6] text-[#9A2A1C]">{t.late} late</Pill>
                      ) : (
                        <span className="text-ink-mute">none</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
        <Card className="flex flex-col gap-3">
          <CardHead title="Waiting to be assigned" aside={`${unassigned.length} leads`} />
          {unassigned.map((name) => (
            <div key={name} className="flex items-center gap-3 border-t border-line-soft py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <a
                  href="#/lead"
                  onClick={(e) => {
                    e.preventDefault()
                    go('lead')
                  }}
                  className="text-sm font-semibold text-ink no-underline"
                >
                  {name}
                </a>
                <span className="text-[13px] text-ink-mute">
                  {name === 'Ishita Vyas'
                    ? 'Sannjh · Instant Form · waiting 1 hr'
                    : 'Regalia · Instagram DM · waiting 2 hrs'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => go('leads')}
                className="min-h-10 cursor-pointer rounded-[10px] border-0 bg-rail px-4 text-[13px] font-semibold text-white"
              >
                Assign
              </button>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHead title="Overdue across the team" aside={`${overdue.length} tasks`} />
          {overdue.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-t border-line-soft py-3">
              <span className="w-[72px] shrink-0 text-[13px] font-semibold text-bad">{t.time}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold">{t.title}</span>
                <span className="text-[13px] text-ink-mute">
                  {t.lead} · {t.context} · {t.rep}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <Card className="flex flex-col gap-3">
        <CardHead title="Today's store visits" aside={`${VISITS.length} scheduled`} />
        {VISITS.map((v) => (
          <div key={v.name} className="flex items-center gap-3.5 border-t border-line-soft py-3">
            <span className="w-[72px] shrink-0 text-sm font-semibold">{v.time}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold">{v.name}</span>
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
    </>
  )
}
