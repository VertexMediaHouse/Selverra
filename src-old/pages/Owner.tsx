import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Shield, Trophy } from 'lucide-react'
import { Avatar, Card, CHART, CollectionIcon, cx, DateRangeFilter, DeliveryBadge, EmptyState, KpiCard, PageHeader, Progress, Skeleton, TableSkeleton } from '../components/ui'
import { DataTable } from '../components/DataTable'
import { TrendChart } from '../components/TrendChart'
import { useInsights, useStore } from '../store'
import { fmt } from '../lib/format'
import { dailySeries, groupBy, inRange, leadDay, pctChange, previousRange, sales, totals } from '../lib/metrics'
import { isClosed, median, repStats, responseMinutes, teamStats } from '../lib/leads'
import { getSubtree } from '../lib/shares'

/**
 * Owner dashboard. The owner does not work leads: they watch money, ad return and the people
 * who do the work. Lead-level pages live in src/pages/archive and belong to managers/sales.
 */
export default function Owner() {
  const { filters, leads, campaigns, categoryById, users, settings, loading: storeLoading } = useStore()
  const { from, to } = filters
  const prev = previousRange(from, to)
  const { data: rows = [], loading: rowsLoading } = useInsights(prev.from, to)
  const loading = storeLoading || rowsLoading

  const cur = useMemo(() => leads.filter(l => inRange(leadDay(l), from, to)), [leads, from, to])
  const old = useMemo(() => leads.filter(l => inRange(leadDay(l), prev.from, prev.to)), [leads, prev.from, prev.to])

  // ---- business KPIs ----
  const m = useMemo(() => {
    const t = totals(rows.filter(r => r.date >= from))
    const p = totals(rows.filter(r => r.date < from))
    const s = sales(cur, t.spend)
    const ps = sales(old, p.spend)
    const closed = cur.filter(isClosed).length
    const prevClosed = old.filter(isClosed).length
    const series = dailySeries(rows.filter(r => r.date >= from), from, to)
    const soldByDay = groupBy(cur.filter(l => l.sale), leadDay)
    return {
      t, p, s, ps, series,
      hasPrev: old.length > 0 || rows.some(r => r.date < from),
      leads: cur.length, prevLeads: old.length,
      medianResponse: median(cur.map(responseMinutes).filter((x): x is number => x != null)),
      prevMedianResponse: median(old.map(responseMinutes).filter((x): x is number => x != null)),
      conversion: closed ? (s.purchases / closed) * 100 : null,
      prevConversion: prevClosed ? (ps.purchases / prevClosed) * 100 : null,
      costPerLead: cur.length ? t.spend / cur.length : null,
      prevCostPerLead: old.length ? p.spend / old.length : null,
      spark: {
        spend: series.map(d => d.spend),
        leads: series.map(d => d.leads),
        revenue: series.map(d => (soldByDay.get(d.date) ?? []).reduce((x, l) => x + (l.sale?.amount ?? 0), 0)),
      },
    }
  }, [rows, cur, old, from, to])

  // ---- campaign ROI: spend vs actual sales, not just leads ----
  const roi = useMemo(() => {
    const spendByCampaign = groupBy(rows.filter(r => r.date >= from), r => r.campaignId)
    const leadsByCampaign = groupBy(cur.filter(l => l.campaignId), l => l.campaignId!)
    return campaigns.map(c => {
      const t = totals(spendByCampaign.get(c.id) ?? [])
      const ls = leadsByCampaign.get(c.id) ?? []
      return { ...c, category: categoryById.get(c.categoryId), spend: t.spend, leadCount: ls.length, ...sales(ls, t.spend) }
    }).filter(c => c.spend > 0 || c.leadCount > 0).sort((a, b) => b.revenue - a.revenue)
  }, [campaigns, rows, cur, from, categoryById])

  // ---- team: per-manager rollup over their whole subtree ----
  const branches = useMemo(() => teamStats(cur, users, settings.slaMinutes, id => getSubtree(users, id))
    .sort((a, b) => b.revenue - a.revenue), [cur, users, settings.slaMinutes])
  const peopleByBranch = useMemo(() => {
    const m = new Map<string, ReturnType<typeof repStats>>()
    for (const b of branches) m.set(b.manager.id, repStats(cur, b.team, settings.slaMinutes).sort((x, y) => y.revenue - x.revenue))
    return m
  }, [branches, cur, settings.slaMinutes])

  const d = (a: number | null, b: number | null) => (m.hasPrev ? pctChange(a, b) : null)
  const roasTone = (r: number | null) => (r ?? 0) >= 5 ? 'text-emerald-600 dark:text-emerald-400' : (r ?? 0) >= 2 ? 'text-amber-600' : 'text-rose-600'

  return (
    <>
      <PageHeader title="Owner dashboard"
        subtitle={`${fmt.date(from)} – ${fmt.date(to)} · compared with the previous ${m.series.length} days`}
        actions={<DateRangeFilter />} />

      {/* Business KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard loading={loading} label="Sales value" value={fmt.currency(m.s.revenue)} delta={d(m.s.revenue, m.ps.revenue)} spark={m.spark.revenue} color={CHART.leads} hint={`${m.s.purchases} bills · avg ${fmt.currency(m.s.aov)}`} />
        <KpiCard loading={loading} label="Ad spend" value={fmt.currency(m.t.spend)} delta={d(m.t.spend, m.p.spend)} inverse spark={m.spark.spend} color={CHART.spend} />
        <KpiCard loading={loading} label="ROAS" value={m.s.roas == null ? '—' : `${m.s.roas.toFixed(1)}×`} delta={d(m.s.roas, m.ps.roas)} hint="Sales value ÷ ad spend" />
        <KpiCard loading={loading} label="Enquiries" value={fmt.number(m.leads)} delta={d(m.leads, m.prevLeads)} spark={m.spark.leads} color={CHART.leads} hint="All sources" />
        <KpiCard loading={loading} label="Cost per enquiry" value={fmt.currency(m.costPerLead)} delta={d(m.costPerLead, m.prevCostPerLead)} inverse hint="Ad spend ÷ all enquiries" />
        <KpiCard loading={loading} label="Close rate" value={fmt.percent(m.conversion, 0)} delta={d(m.conversion, m.prevConversion)} hint="Of closed enquiries" />
      </div>

      <Card title="Ad spend vs enquiries" className="mt-6">
        {loading ? <Skeleton className="h-72" /> : m.t.spend === 0
          ? <EmptyState title="No ad spend in this range" hint="Pick a wider date range." />
          : <TrendChart series={m.series} />}
      </Card>

      {/* Campaign ROI */}
      <Card title="Campaign return" className="mt-6 overflow-hidden" padded={false}
        action={<span className="hidden pr-5 text-xs text-slate-500 sm:inline">Sales value against ad spend</span>}>
        {loading ? <TableSkeleton rows={6} /> : roi.length === 0 ? <EmptyState title="No campaign data in this range" /> : (
          <DataTable rows={roi} rowKey={c => c.id} initialSort={{ key: 'revenue', dir: 'desc' }}
            columns={[
              { key: 'name', label: 'Campaign', value: c => c.name, className: 'min-w-56', render: c => (
                <div className="whitespace-normal">
                  <p className="flex items-center gap-2 font-medium"><CollectionIcon id={c.categoryId} size={14} />{c.name}</p>
                  <p className="text-xs text-slate-500">{c.category?.name} · {c.objective}</p>
                </div>
              ) },
              { key: 'status', label: 'Status', value: c => c.status, render: c => <DeliveryBadge status={c.status} /> },
              { key: 'spend', label: 'Spend', value: c => c.spend, align: 'right', render: c => fmt.currency(c.spend) },
              { key: 'leadCount', label: 'Enquiries', value: c => c.leadCount, align: 'right' },
              { key: 'visits', label: 'Visits', value: c => c.visits, align: 'right', className: 'hidden sm:table-cell' },
              { key: 'purchases', label: 'Bills', value: c => c.purchases, align: 'right' },
              { key: 'revenue', label: 'Sales', value: c => c.revenue, align: 'right', render: c => <span className="font-medium">{fmt.currency(c.revenue)}</span> },
              { key: 'roas', label: 'ROAS', value: c => c.roas, align: 'right',
                render: c => <span className={cx('font-semibold', roasTone(c.roas))}>{c.roas == null ? '—' : `${c.roas.toFixed(1)}×`}</span> },
            ]} />
        )}
      </Card>

      {/* Team performance, rolled up the hierarchy */}
      <Card title="Team performance" className="mt-6" padded={false}
        action={<span className="pr-5 text-xs text-slate-500">Target: first contact within {settings.slaMinutes} min</span>}>
        {loading ? <TableSkeleton rows={4} /> : branches.length === 0 ? (
          <EmptyState title="No managers with a team" hint="Assign reporting lines in Settings so results roll up." />
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {branches.map((b, i) => (
              <Branch key={b.manager.id} branch={b} people={peopleByBranch.get(b.manager.id) ?? []} sla={settings.slaMinutes} top={i === 0 && b.revenue > 0} />
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Shield size={12} /> Owner view. Managers and sales staff see the enquiry workspace instead.
      </p>
    </>
  )
}

/** One manager's branch: rollup row, expandable into the individual staff under them. */
function Branch({ branch: b, people, sla, top }: {
  branch: ReturnType<typeof teamStats>[number]
  people: ReturnType<typeof repStats>
  sla: number
  top: boolean
}) {
  const [open, setOpen] = useState(false)
  const slaTone = (v: number | null) => (v ?? 0) >= 70 ? 'green' : (v ?? 0) >= 40 ? 'amber' : 'red'

  return (
    <li>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/5">
        {open ? <ChevronDown size={15} className="shrink-0 text-slate-400" /> : <ChevronRight size={15} className="shrink-0 text-slate-400" />}
        <Avatar name={b.manager.name} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-medium">
            {b.manager.name}
            {top && <Trophy size={14} className="text-amber-500" />}
          </span>
          <span className="block text-xs text-slate-500">{b.manager.role} · {b.headcount} {b.headcount === 1 ? 'person' : 'people'}</span>
        </span>
        <dl className="hidden items-center gap-6 text-right text-sm sm:flex">
          <div><dt className="text-[11px] text-slate-500">Enquiries</dt><dd className="font-medium tabular-nums">{b.assigned}</dd></div>
          <div><dt className="text-[11px] text-slate-500">Response</dt>
            <dd className={cx('font-medium tabular-nums', (b.medianResponse ?? 0) > sla ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400')}>{fmt.duration(b.medianResponse)}</dd></div>
          <div className="hidden md:block"><dt className="text-[11px] text-slate-500">Within {sla}m</dt>
            <dd className="flex items-center justify-end gap-2">
              <span className="w-16"><Progress value={b.withinSla ?? 0} tone={slaTone(b.withinSla)} /></span>
              <span className="w-9 font-medium tabular-nums">{fmt.percent(b.withinSla, 0)}</span>
            </dd></div>
          <div><dt className="text-[11px] text-slate-500">Bills</dt><dd className="font-medium tabular-nums">{b.won}</dd></div>
          <div className="w-24"><dt className="text-[11px] text-slate-500">Sales value</dt><dd className="font-semibold tabular-nums">{fmt.currency(b.revenue)}</dd></div>
        </dl>
      </button>

      {open && (
        <div className="bg-black/[0.02] px-5 pb-4 dark:bg-white/[0.02]">
          {b.unworked > 0 || b.breached > 0 ? (
            <p className="pb-3 text-xs text-amber-700 dark:text-amber-400">
              {b.unworked > 0 && `${b.unworked} enquiry${b.unworked === 1 ? '' : 's'} never contacted`}
              {b.unworked > 0 && b.breached > 0 && ' · '}
              {b.breached > 0 && `${b.breached} answered past the ${sla} min target`}
            </p>
          ) : null}
          {people.length === 0 ? (
            <p className="py-3 text-xs text-slate-500">No assigned enquiries for this team in the selected range.</p>
          ) : (
            <DataTable rows={people} rowKey={r => r.user.id} initialSort={{ key: 'revenue', dir: 'desc' }}
              columns={[
                { key: 'rep', label: 'Staff', value: r => r.user.name, render: r => (
                  <span className="flex items-center gap-2.5">
                    <Avatar name={r.user.name} size="xs" />
                    <span><span className="block font-medium">{r.user.name}</span><span className="block text-xs text-slate-500">{r.user.role}</span></span>
                  </span>
                ) },
                { key: 'assigned', label: 'Enquiries', value: r => r.assigned, align: 'right' },
                { key: 'speed', label: 'Median response', value: r => r.medianResponse, align: 'right',
                  render: r => <span className={cx('font-medium', (r.medianResponse ?? 0) > sla ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400')}>{fmt.duration(r.medianResponse)}</span> },
                { key: 'sla', label: `Within ${sla}m`, value: r => r.withinSla, align: 'right', className: 'hidden md:table-cell w-44', render: r => (
                  <span className="flex items-center justify-end gap-2">
                    <span className="w-20"><Progress value={r.withinSla ?? 0} tone={slaTone(r.withinSla)} /></span>
                    <span className="w-10 tabular-nums">{fmt.percent(r.withinSla, 0)}</span>
                  </span>
                ) },
                { key: 'won', label: 'Bills', value: r => r.won, align: 'right' },
                { key: 'revenue', label: 'Sales value', value: r => r.revenue, align: 'right', render: r => <span className="font-medium">{fmt.currency(r.revenue)}</span> },
                { key: 'win', label: 'Close rate', value: r => r.winRate, align: 'right', className: 'hidden lg:table-cell', render: r => fmt.percent(r.winRate, 0) },
              ]} />
          )}
        </div>
      )}
    </li>
  )
}
