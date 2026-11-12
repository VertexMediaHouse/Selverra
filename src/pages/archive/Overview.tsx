import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CalendarDays, CheckCircle2, Flame, Trophy } from 'lucide-react'
import { Avatar, Card, CHART, CollectionIcon, Dot, cx, DateRangeFilter, EmptyState, KpiCard, PageHeader, Progress, ScorePill, Skeleton, SlaTimer, STATUS_DOT, TableSkeleton, tooltipProps } from '../../components/ui'
import { DataTable } from '../../components/DataTable'
import { TrendChart } from '../../components/TrendChart'
import { AlertItem } from '../../components/Alerts'
import { useInsights, useNow, useStore } from '../../store'
import { fmt } from '../../lib/format'
import { LEAD_STATUSES } from '../../data/types'
import { dailySeries, groupBy, inRange, leadDay, monthInfo, pacing, pctChange, previousRange, sales, todayIso, totals } from '../../lib/metrics'
import { isClosed, leadScore, median, repStats, responseMinutes, scoreBand, waitingMinutes } from '../../lib/leads'

/** The owner's cockpit: money, demand, speed and pipeline on one screen. */
export default function Overview() {
  const { filters, scoped, campaigns, categories, festivals, categoryById, userById, users, settings, alerts, alertsLoading, setFilters, openLead, loading: storeLoading } = useStore()
  const { from, to, category } = filters
  const prev = previousRange(from, to)
  const now = useNow(60_000)
  // One fetch covering both windows, so every KPI can carry a delta.
  const { data: rows = [], loading: rowsLoading } = useInsights(prev.from, to, category)
  const month = monthInfo()
  const { data: mtdRows = [] } = useInsights(month.start, todayIso(), category)
  const loading = storeLoading || rowsLoading

  const cur = useMemo(() => scoped.leads.filter(l => inRange(leadDay(l), from, to)), [scoped.leads, from, to])
  const old = useMemo(() => scoped.leads.filter(l => inRange(leadDay(l), prev.from, prev.to)), [scoped.leads, prev.from, prev.to])

  const m = useMemo(() => {
    const t = totals(rows.filter(r => r.date >= from))
    const p = totals(rows.filter(r => r.date < from))
    const s = sales(cur, t.spend)
    const ps = sales(old, p.spend)
    const responded = cur.map(responseMinutes).filter((x): x is number => x != null)
    const prevResponded = old.map(responseMinutes).filter((x): x is number => x != null)
    const closed = cur.filter(isClosed).length
    const prevClosed = old.filter(isClosed).length
    const series = dailySeries(rows.filter(r => r.date >= from), from, to)
    const soldByDay = groupBy(cur.filter(l => l.sale), leadDay)
    return {
      t, p, s, ps, series, hasPrev: old.length > 0 || rows.some(r => r.date < from),
      // Lead count from the CRM, not the ad rows, so walk-ins and referrals are included.
      leads: cur.length, prevLeads: old.length,
      open: cur.filter(l => !isClosed(l)).length,
      untouched: cur.filter(l => l.status === 'New' && !l.firstContactAt).length,
      overdue: cur.filter(l => (waitingMinutes(l, now) ?? 0) > settings.slaMinutes).length,
      medianResponse: median(responded), prevMedianResponse: median(prevResponded),
      conversion: closed ? (s.purchases / closed) * 100 : null,
      prevConversion: prevClosed ? (ps.purchases / prevClosed) * 100 : null,
      // Cost per enquiry against real CRM lead volume, including non-ad sources.
      costPerLead: cur.length ? t.spend / cur.length : null,
      prevCostPerLead: old.length ? p.spend / old.length : null,
      spark: {
        spend: series.map(d => d.spend),
        leads: series.map(d => d.leads),
        revenue: series.map(d => (soldByDay.get(d.date) ?? []).reduce((x, l) => x + (l.sale?.amount ?? 0), 0)),
      },
    }
  }, [rows, cur, old, from, to, now, settings.slaMinutes])

  const funnel = useMemo(() => {
    const byStatus = groupBy(cur, l => l.status)
    const peak = Math.max(1, ...LEAD_STATUSES.map(st => (byStatus.get(st) ?? []).length))
    return LEAD_STATUSES.map(st => {
      const n = (byStatus.get(st) ?? []).length
      return { status: st, count: n, pct: (n / peak) * 100 }
    })
  }, [cur])

  /** Open, high-score leads with nothing scheduled — the owner's "chase these" list. */
  const hot = useMemo(() => {
    const scheduled = new Set(scoped.tasks.filter(t => !t.done).map(t => t.leadId))
    return cur
      .filter(l => !isClosed(l))
      .map(l => ({ lead: l, score: leadScore(l, now) }))
      .filter(x => scoreBand(x.score, settings.hotScore) === 'Hot' || !scheduled.has(x.lead.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [cur, scoped.tasks, now, settings.hotScore])

  const bySource = useMemo(() => [...groupBy(cur, l => l.source)]
    .map(([name, ls]) => {
      const s = sales(ls, 0)
      return { name, leads: ls.length, visits: s.visits, purchases: s.purchases, revenue: s.revenue, rate: ls.length ? (s.purchases / ls.length) * 100 : null }
    })
    .sort((a, b) => b.leads - a.leads), [cur])

  const byCategory = useMemo(() => {
    const spendByCat = groupBy(rows.filter(r => r.date >= from), r => r.categoryId)
    const leadsByCat = groupBy(cur, l => l.categoryId)
    return categories.map(c => {
      const t = totals(spendByCat.get(c.id) ?? [])
      const ls = leadsByCat.get(c.id) ?? []
      return { ...c, spend: t.spend, leads: ls.length, ...sales(ls, t.spend) }
    }).filter(c => c.leads > 0 || c.spend > 0).sort((a, b) => b.revenue - a.revenue)
  }, [rows, cur, categories, from])

  const team = useMemo(() => repStats(cur, users, settings.slaMinutes).sort((a, b) => b.revenue - a.revenue), [cur, users, settings.slaMinutes])

  /** Month-to-date budget health across every active campaign. */
  const budget = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'ACTIVE' && (!category || c.categoryId === category))
    const daily = active.reduce((s, c) => s + c.dailyBudget, 0)
    const mtdSpend = mtdRows.reduce((s, r) => s + r.spend, 0)
    return { active: active.length, ...pacing(daily, mtdSpend, month.daysElapsed, month.daysInMonth), mtdSpend }
  }, [campaigns, mtdRows, category, month.daysElapsed, month.daysInMonth])

  const upcoming = useMemo(() => {
    const t = todayIso()
    return festivals.filter(f => f.date >= t).slice(0, 4).map(f => ({ ...f, days: Math.round((new Date(`${f.date}T00:00:00`).getTime() - new Date(`${t}T00:00:00`).getTime()) / 86400000) }))
  }, [festivals])

  const d = (a: number | null, b: number | null) => (m.hasPrev ? pctChange(a, b) : null)
  const currentCategory = categoryById.get(category)

  return (
    <>
      <PageHeader
        title={currentCategory ? <span className="flex items-center gap-2"><CollectionIcon id={currentCategory.id} size={17} />{currentCategory.name}</span> : 'Business overview'}
        subtitle={`${fmt.date(from)} – ${fmt.date(to)} · compared with the previous ${m.series.length} days`}
        actions={<DateRangeFilter />} />

      {/* Money: what the business earned and what it cost. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard loading={loading} label="Sales value" value={fmt.currency(m.s.revenue)} delta={d(m.s.revenue, m.ps.revenue)} spark={m.spark.revenue} color={CHART.leads} hint={`${m.s.purchases} bills · avg ${fmt.currency(m.s.aov)}`} />
        <KpiCard loading={loading} label="Gold / silver sold" value={`${fmt.number(m.s.grams)}g`} delta={d(m.s.grams, m.ps.grams)} hint="Across all bills in range" />
        <KpiCard loading={loading} label="Ad spend" value={fmt.currency(m.t.spend)} delta={d(m.t.spend, m.p.spend)} inverse spark={m.spark.spend} color={CHART.spend} />
        <KpiCard loading={loading} label="ROAS" value={m.s.roas == null ? '—' : `${m.s.roas.toFixed(1)}×`} delta={d(m.s.roas, m.ps.roas)} hint="Sales value ÷ ad spend" />
        <KpiCard loading={loading} label="Enquiries" value={fmt.number(m.leads)} delta={d(m.leads, m.prevLeads)} spark={m.spark.leads} color={CHART.leads} hint="All sources" />
        <KpiCard loading={loading} label="Cost per enquiry" value={fmt.currency(m.costPerLead)} delta={d(m.costPerLead, m.prevCostPerLead)} inverse hint="Ad spend ÷ all enquiries" />
      </div>

      {/* Operations: is the team actually working the pipeline. */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard loading={loading} label="Open pipeline" value={fmt.number(m.open)} delta={null} hint="Not yet won or lost" />
        <KpiCard loading={loading} label="New & untouched" value={fmt.number(m.untouched)} delta={null} hint="No first contact yet" />
        <KpiCard loading={loading} label="Past SLA" value={fmt.number(m.overdue)} delta={null} hint={`Waiting over ${settings.slaMinutes} min`} />
        <KpiCard loading={loading} label="Median response" value={fmt.duration(m.medianResponse)} delta={d(m.medianResponse, m.prevMedianResponse)} inverse hint="Enquiry to first contact" />
        <KpiCard loading={loading} label="Store visits" value={fmt.number(m.s.visits)} delta={d(m.s.visitRate, m.ps.visitRate)} hint={`${fmt.percent(m.s.visitRate, 0)} of enquiries walked in`} />
        <KpiCard loading={loading} label="Close rate" value={fmt.percent(m.conversion, 0)} delta={d(m.conversion, m.prevConversion)} hint="Of closed enquiries" />
      </div>

      {upcoming.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {upcoming.map(f => (
            <div key={f.id} className={cx('flex min-w-60 shrink-0 items-start gap-2.5 rounded-xl bg-[var(--color-rail-bg)] px-3 py-2.5',
              f.days <= 7 && 'ring-1 ring-amber-400/40')}>
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{f.name} <span className="font-normal text-white/50">· {f.days === 0 ? 'today' : `in ${f.days}d`}{f.approx && ' (approx)'}</span></p>
                <p className="truncate text-xs text-white/55" title={f.tip}>{f.categoryIds.map(id => categoryById.get(id)?.name).filter(Boolean).join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Ad spend vs enquiries" className="xl:col-span-2">
          {loading ? <Skeleton className="h-72" /> : m.t.spend === 0 ? <EmptyState title="No ad spend in this range" hint="Pick a wider date range." /> : <TrendChart series={m.series} />}
        </Card>
        <Card padded={false} title={<span className="flex items-center gap-2">Needs attention {alerts.length > 0 && <span className="rounded-full bg-rose-100 px-1.5 text-[11px] text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{alerts.length}</span>}</span>}>
          {alertsLoading ? <div className="space-y-3 p-5 pt-0">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div> : alerts.length === 0
            ? <EmptyState icon={<CheckCircle2 size={20} />} title="All clear" hint="No anomalies in the last 7 days." />
            : <ul className="max-h-[340px] divide-y divide-slate-100 overflow-y-auto border-t border-slate-100 px-2 dark:divide-slate-800 dark:border-slate-800">{alerts.map(a => <AlertItem key={a.id} alert={a} />)}</ul>}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Pipeline" action={<a href="#/leads" className="text-xs text-[var(--color-accent-mint-text)] hover:underline">Open enquiries</a>}>
          {loading ? <TableSkeleton rows={6} /> : cur.length === 0 ? <EmptyState title="No enquiries in this range" /> : (
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
          {loading ? <TableSkeleton rows={5} /> : hot.length === 0
            ? <EmptyState icon={<CheckCircle2 size={20} />} title="Nothing waiting" hint="Every open enquiry has a next step." />
            : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {hot.map(({ lead }) => (
                  <li key={lead.id}>
                    <button onClick={() => openLead(lead.id)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/5">
                      <Avatar name={lead.name} size="md" color={categoryById.get(lead.categoryId)?.color} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{lead.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {userById.get(lead.assigneeId ?? '')?.name.split(' ')[0] ?? 'Unassigned'} · {lead.source}
                        </span>
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

        <Card title="Where enquiries come from">
          {loading ? <Skeleton className="h-64" /> : bySource.length === 0 ? <EmptyState title="No enquiries in this range" /> : (
            <>
              <div className="h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={bySource} dataKey="leads" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2} strokeWidth={0}>
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
                    <span className="w-12 text-right font-medium tabular-nums">{fmt.percent(s.rate, 0)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-500">Right column is the close rate for that source.</p>
            </>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Product categories" padded={false} className="overflow-hidden xl:col-span-2" action={<span className="hidden pr-5 text-xs text-slate-500 sm:inline">Click to filter the dashboard</span>}>
          {loading ? <TableSkeleton rows={6} /> : byCategory.length === 0 ? <EmptyState title="No data in this range" /> : (
            <DataTable rows={byCategory} rowKey={c => c.id} onRowClick={c => setFilters({ category: c.id, campaignId: '' })} initialSort={{ key: 'revenue', dir: 'desc' }}
              columns={[
                { key: 'name', label: 'Category', value: c => c.name, render: c => <span className="flex items-center gap-2 font-medium"><CollectionIcon id={c.id} size={15} />{c.name}</span> },
                { key: 'leads', label: 'Enquiries', value: c => c.leads, align: 'right' },
                { key: 'visits', label: 'Visits', value: c => c.visits, align: 'right', className: 'hidden sm:table-cell' },
                { key: 'purchases', label: 'Bills', value: c => c.purchases, align: 'right' },
                { key: 'spend', label: 'Spend', value: c => c.spend, align: 'right', className: 'hidden md:table-cell', render: c => fmt.currency(c.spend) },
                { key: 'revenue', label: 'Sales', value: c => c.revenue, align: 'right', render: c => <span className="font-medium">{fmt.currency(c.revenue)}</span> },
                { key: 'roas', label: 'ROAS', value: c => c.roas, align: 'right', render: c => (
                  <span className={cx('font-semibold', (c.roas ?? 0) >= 5 ? 'text-emerald-600 dark:text-emerald-400' : (c.roas ?? 0) >= 2 ? 'text-amber-600' : 'text-rose-600')}>
                    {c.roas == null ? '—' : `${c.roas.toFixed(1)}×`}
                  </span>
                ) },
              ]} />
          )}
        </Card>

        <Card title="Budget this month" action={<a href="#/budgets" className="text-xs text-[var(--color-accent-mint-text)] hover:underline">Manage</a>}>
          {loading ? <Skeleton className="h-48" /> : budget.active === 0 ? <EmptyState title="No active campaigns" hint="Nothing is spending right now." /> : (
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tabular-nums">{fmt.currency(budget.mtdSpend)}</span>
                  <span className="text-xs text-slate-500">of {fmt.currency(budget.monthBudget)}</span>
                </div>
                <div className="mt-2">
                  <Progress value={budget.monthBudget ? Math.min(100, (budget.mtdSpend / budget.monthBudget) * 100) : 0}
                    tone={budget.state === 'over' ? 'red' : budget.state === 'under' ? 'amber' : 'green'} />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Day {month.daysElapsed} of {month.daysInMonth} · expected {fmt.currency(budget.expected)} by now</p>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Pace</dt>
                  <dd className={cx('font-medium tabular-nums', budget.state === 'over' ? 'text-rose-600' : budget.state === 'under' ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400')}>
                    {fmt.percent(budget.pace, 0)} {budget.state === 'over' ? 'overspending' : budget.state === 'under' ? 'underspending' : 'on track'}
                  </dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Month forecast</dt><dd className="font-medium tabular-nums">{fmt.currency(budget.forecast)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Active campaigns</dt><dd className="font-medium tabular-nums">{budget.active}</dd></div>
              </dl>
            </div>
          )}
        </Card>
      </div>

      <Card title="Team" className="mt-6 overflow-hidden" padded={false} action={<span className="text-xs text-slate-500">Target: first contact within {settings.slaMinutes} min</span>}>
        {loading ? <TableSkeleton rows={4} /> : team.length === 0 ? <EmptyState title="No assigned enquiries in this range" /> : (
          <DataTable rows={team} rowKey={r => r.user.id} initialSort={{ key: 'revenue', dir: 'desc' }}
            columns={[
              { key: 'rep', label: 'Staff', value: r => r.user.name, render: r => (
                <span className="flex items-center gap-2.5">
                  <Avatar name={r.user.name} />
                  <span><span className="block font-medium">{r.user.name}</span><span className="block text-xs text-slate-500">{r.user.role}</span></span>
                  {r === team[0] && r.revenue > 0 && <Trophy size={14} className="text-amber-500" />}
                </span>
              ) },
              { key: 'assigned', label: 'Enquiries', value: r => r.assigned, align: 'right' },
              { key: 'speed', label: 'Median response', value: r => r.medianResponse, align: 'right',
                render: r => <span className={cx('font-medium', (r.medianResponse ?? 0) > settings.slaMinutes ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400')}>{fmt.duration(r.medianResponse)}</span> },
              { key: 'sla', label: `Within ${settings.slaMinutes}m`, value: r => r.withinSla, align: 'right', className: 'hidden md:table-cell w-44', render: r => (
                <span className="flex items-center justify-end gap-2"><span className="w-20"><Progress value={r.withinSla ?? 0} tone={(r.withinSla ?? 0) >= 70 ? 'green' : (r.withinSla ?? 0) >= 40 ? 'amber' : 'red'} /></span><span className="w-10 tabular-nums">{fmt.percent(r.withinSla, 0)}</span></span>
              ) },
              { key: 'won', label: 'Bills', value: r => r.won, align: 'right' },
              { key: 'revenue', label: 'Sales value', value: r => r.revenue, align: 'right', render: r => <span className="font-medium">{fmt.currency(r.revenue)}</span> },
              { key: 'win', label: 'Close rate', value: r => r.winRate, render: r => fmt.percent(r.winRate, 0), align: 'right', className: 'hidden lg:table-cell' },
            ]} />
        )}
      </Card>
    </>
  )
}
