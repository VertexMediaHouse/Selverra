import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CalendarDays, CheckCircle2, Flame } from 'lucide-react'
import { Avatar, Card, CHART, CollectionIcon, DateRangeFilter, Dot, cx, EmptyState, KpiCard, PageHeader, Progress, ScorePill, Skeleton, SlaTimer, STATUS_DOT, TableSkeleton, tooltipProps } from '../components/ui'
import { useNow, useStore } from '../store'
import { fmt } from '../lib/format'
import { LEAD_STATUSES } from '../data/types'
import { groupBy, inRange, leadDay, sales, todayIso } from '../lib/metrics'
import { isClosed, leadScore, median, responseMinutes, scoreBand, waitingMinutes } from '../lib/leads'

/**
 * A sales person's own dashboard: their enquiries, their speed, their bills.
 * Deliberately no ad spend, ROAS, budget pacing or other reps' totals — that is
 * the manager's and owner's view (see levels.ts `seesSpend`). Everything here is
 * computed from leads this user can already see, so there is no extra fetch.
 */
export default function MyDashboard() {
  const { me, scoped, filters, categoryById, settings, festivals, openLead, loading } = useStore()
  const { from, to } = filters
  const now = useNow(60_000)

  // Only leads this person owns. `scoped.leads` may include their reports' leads too.
  const mine = useMemo(() => scoped.leads.filter(l => l.assigneeId === me?.id), [scoped.leads, me])
  const cur = useMemo(() => mine.filter(l => inRange(leadDay(l), from, to)), [mine, from, to])

  const m = useMemo(() => {
    const s = sales(cur, 0) // 0 spend: a sales person never sees ad cost
    const responded = cur.map(responseMinutes).filter((x): x is number => x != null)
    const closed = cur.filter(isClosed).length
    return {
      leads: cur.length,
      open: cur.filter(l => !isClosed(l)).length,
      untouched: cur.filter(l => l.status === 'New' && !l.firstContactAt).length,
      overdue: mine.filter(l => (waitingMinutes(l, now) ?? 0) > settings.slaMinutes).length,
      medianResponse: median(responded),
      withinSla: responded.length ? (responded.filter(t => t <= settings.slaMinutes).length / responded.length) * 100 : null,
      visits: s.visits,
      bills: s.purchases,
      revenue: s.revenue,
      grams: s.grams,
      closeRate: closed ? (s.purchases / closed) * 100 : null,
    }
  }, [cur, mine, now, settings.slaMinutes])

  const funnel = useMemo(() => {
    const byStatus = groupBy(cur, l => l.status)
    const peak = Math.max(1, ...LEAD_STATUSES.map(st => (byStatus.get(st) ?? []).length))
    return LEAD_STATUSES.map(st => {
      const n = (byStatus.get(st) ?? []).length
      return { status: st, count: n, pct: (n / peak) * 100 }
    })
  }, [cur])

  /** Open leads worth calling next: hot, or nothing scheduled against them. */
  const chase = useMemo(() => {
    const scheduled = new Set(scoped.tasks.filter(t => !t.done).map(t => t.leadId))
    return mine
      .filter(l => !isClosed(l))
      .map(l => ({ lead: l, score: leadScore(l, now) }))
      .filter(x => scoreBand(x.score, settings.hotScore) === 'Hot' || !scheduled.has(x.lead.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [mine, scoped.tasks, now, settings.hotScore])

  const byCategory = useMemo(() => [...groupBy(cur, l => l.categoryId)]
    .map(([id, ls]) => ({ id, name: categoryById.get(id)?.name ?? 'Other', leads: ls.length, ...sales(ls, 0) }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 6), [cur, categoryById])

  const bySource = useMemo(() => [...groupBy(cur, l => l.source)]
    .map(([name, ls]) => ({ name, leads: ls.length }))
    .sort((a, b) => b.leads - a.leads), [cur])

  const upcoming = useMemo(() => {
    const t = todayIso()
    return festivals.filter(f => f.date >= t).slice(0, 3)
      .map(f => ({ ...f, days: Math.round((new Date(`${f.date}T00:00:00`).getTime() - new Date(`${t}T00:00:00`).getTime()) / 86400000) }))
  }, [festivals])

  const slaTone = (v: number | null) => (v ?? 0) >= 70 ? 'green' : (v ?? 0) >= 40 ? 'amber' : 'red'

  return (
    <>
      <PageHeader title="My performance"
        subtitle={`Your enquiries · ${fmt.date(from)} – ${fmt.date(to)}`}
        actions={<DateRangeFilter />} />

      {/* Your work: volume, speed, outcome. No spend, no ROAS. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard loading={loading} delta={null} label="My enquiries" value={fmt.number(m.leads)} hint="Assigned to you in range" />
        <KpiCard loading={loading} delta={null} label="Open" value={fmt.number(m.open)} hint="Not yet won or lost" />
        <KpiCard loading={loading} delta={null} label="Past SLA" value={fmt.number(m.overdue)} hint={`Waiting over ${settings.slaMinutes} min`} />
        <KpiCard loading={loading} delta={null} label="Median reply" value={fmt.duration(m.medianResponse)} hint={`Target ${settings.slaMinutes} min`} />
        <KpiCard loading={loading} delta={null} label="Store visits" value={fmt.number(m.visits)} hint="Walked in after your call" />
        <KpiCard loading={loading} delta={null} label="My bills" value={fmt.number(m.bills)} hint={`${fmt.currency(m.revenue)} · ${fmt.number(m.grams)}g`} />
      </div>

      {upcoming.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {upcoming.map(f => (
            <div key={f.id} className={cx('flex min-w-60 shrink-0 items-start gap-2.5 rounded-xl bg-[var(--color-rail-bg)] px-3 py-2.5', f.days <= 7 && 'ring-1 ring-amber-400/40')}>
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{f.name} <span className="font-normal text-white/50">· {f.days === 0 ? 'today' : `in ${f.days}d`}</span></p>
                <p className="truncate text-xs text-white/55" title={f.tip}>{f.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="My pipeline" action={<a href="#/leads" className="text-xs text-[var(--color-accent-mint-text)] hover:underline">Open enquiries</a>}>
          {loading ? <TableSkeleton rows={6} /> : cur.length === 0 ? <EmptyState title="No enquiries in this range" hint="Pick a wider date range." /> : (
            <ul className="space-y-2.5">
              {funnel.map(f => (
                <li key={f.status}>
                  <a href={`#/leads?status=${encodeURIComponent(f.status)}`} className="group flex items-center gap-3">
                    <span className="flex w-28 shrink-0 items-center gap-2 text-sm"><span className={cx('size-2 rounded-full', STATUS_DOT[f.status])} />{f.status}</span>
                    <span className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                      <span className="block h-full rounded-md bg-[var(--color-accent-mint)] transition-opacity group-hover:opacity-80" style={{ width: `${Math.max(f.pct, f.count ? 4 : 0)}%` }} />
                    </span>
                    <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">{f.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padded={false} title={<span className="flex items-center gap-2"><Flame size={14} className="text-rose-500" />Chase these next</span>}
          action={<span className="pr-5 text-xs text-slate-500">Hot or unscheduled</span>}>
          {loading ? <TableSkeleton rows={5} /> : chase.length === 0
            ? <EmptyState icon={<CheckCircle2 size={20} />} title="Nothing waiting" hint="Every open enquiry has a next step." />
            : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {chase.map(({ lead }) => (
                  <li key={lead.id}>
                    <button onClick={() => openLead(lead.id)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/5">
                      <Avatar name={lead.name} size="md" color={categoryById.get(lead.categoryId)?.color} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{lead.name}</span>
                        <span className="block truncate text-xs text-slate-500">{categoryById.get(lead.categoryId)?.name} · {lead.source}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <ScorePill lead={lead} showNumber={false} />
                        <SlaTimer lead={lead} compact />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </Card>

        <Card title="My response speed">
          {loading ? <Skeleton className="h-48" /> : (
            <div className="space-y-5">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-semibold tabular-nums">{fmt.percent(m.withinSla, 0)}</span>
                  <span className="text-xs text-slate-500">answered within {settings.slaMinutes} min</span>
                </div>
                <div className="mt-2"><Progress value={m.withinSla ?? 0} tone={slaTone(m.withinSla)} /></div>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Median first reply</dt>
                  <dd className={cx('font-medium tabular-nums', (m.medianResponse ?? 0) > settings.slaMinutes ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400')}>{fmt.duration(m.medianResponse)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">New &amp; untouched</dt><dd className="font-medium tabular-nums">{fmt.number(m.untouched)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Close rate</dt><dd className="font-medium tabular-nums">{fmt.percent(m.closeRate, 0)}</dd></div>
              </dl>
              <p className="text-[11px] text-slate-500">The first shop to reply usually gets the visit.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="My enquiries by collection" className="xl:col-span-2">
          {loading ? <TableSkeleton rows={5} /> : byCategory.length === 0 ? <EmptyState title="No enquiries in this range" /> : (
            <ul className="space-y-2.5">
              {byCategory.map(c => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="flex w-36 shrink-0 items-center gap-2 text-sm"><CollectionIcon id={c.id} size={15} />{c.name}</span>
                  <span className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                    <span className="block h-full rounded-md bg-[var(--color-accent-mint)]" style={{ width: `${Math.max((c.leads / byCategory[0].leads) * 100, 4)}%` }} />
                  </span>
                  <span className="w-10 shrink-0 text-right text-sm tabular-nums">{c.leads}</span>
                  <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">{fmt.currency(c.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Where my enquiries come from">
          {loading ? <Skeleton className="h-56" /> : bySource.length === 0 ? <EmptyState title="No enquiries in this range" /> : (
            <>
              <div className="h-40">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={bySource} dataKey="leads" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={2} strokeWidth={0}>
                      {bySource.map((s, i) => <Cell key={s.name} fill={CHART.series[i % CHART.series.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipProps} formatter={(v, n) => [`${fmt.number(Number(v))} enquiries`, String(n)]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {bySource.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-2 text-xs">
                    <Dot color={CHART.series[i % CHART.series.length]} />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="tabular-nums text-slate-500">{s.leads}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  )
}
