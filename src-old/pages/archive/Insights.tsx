import { useMemo, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { Card, CHART, cx, DateRangeFilter, EmptyState, PageHeader, Skeleton, TableSkeleton, tooltipProps } from '../../components/ui'
import { DataTable, type Column } from '../../components/DataTable'
import { useInsights, useStore } from '../../store'
import { fmt } from '../../lib/format'
import { groupBy, inRange, leadDay, sales, totals } from '../../lib/metrics'

const MAX_COMPARE = 3

export default function Insights() {
  const { scoped, adById, campaignById, filters, loading: storeLoading } = useStore()
  const { campaigns, leads } = scoped
  const { data: rows = [], loading: rowsLoading } = useInsights(filters.from, filters.to, filters.category)
  const loading = storeLoading || rowsLoading
  const [picked, setPicked] = useState<string[]>()

  const data = useMemo(() => {
    const rangeLeads = leads.filter(l => inRange(leadDay(l), filters.from, filters.to))
    const leadsByCampaign = groupBy(rangeLeads, l => l.campaignId ?? "")
    const rowsByCampaign = groupBy(rows, r => r.campaignId)
    const perCampaign = campaigns.map(c => {
      const t = totals(rowsByCampaign.get(c.id) ?? [])
      return { id: c.id, name: c.name, ...t, ...sales(leadsByCampaign.get(c.id) ?? [], t.spend) }
    })
    const all = totals(rows)
    const q = sales(rangeLeads, all.spend)
    const funnel = [
      { label: 'Impressions', value: all.impressions },
      { label: 'Clicks', value: all.clicks },
      { label: 'Leads', value: all.leads },
      { label: 'Visited store', value: q.visits },
      { label: 'Purchased', value: q.purchases },
    ]
    const ads = [...groupBy(rows, r => r.adId)]
      .map(([id, rs]) => ({ id, ad: adById.get(id), ...totals(rs) }))
      .filter(a => a.leads >= 2) // ponytail: min 2 leads so one lucky lead doesn't top the list
      .sort((a, b) => a.cpl! - b.cpl!)
      .slice(0, 8)
    const lost = [...groupBy(rangeLeads.filter(l => l.lostReason), l => l.lostReason!)].map(([reason, ls]) => ({ reason, n: ls.length })).sort((a, b) => b.n - a.n)
    const bySource = [...groupBy(rangeLeads, l => l.intent)].map(([intent, ls]) => ({ intent, n: ls.length, won: ls.filter(l => l.status === 'Purchased').length, q: sales(ls, 0).purchaseRate }))
    return { perCampaign, funnel, ads, lost, lostTotal: lost.reduce((n, r) => n + r.n, 0), bySource }
  }, [rows, leads, campaigns, adById, filters.from, filters.to])

  const defaultPick = [...data.perCampaign].sort((a, b) => b.spend - a.spend).slice(0, MAX_COMPARE).map(c => c.id)
  const selected = (picked ?? defaultPick).filter(id => campaigns.some(c => c.id === id))
  const toggle = (id: string) =>
    setPicked(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id].slice(-MAX_COMPARE))

  return (
    <>
      <PageHeader title="Insights" subtitle="Compare campaigns, follow the enquiry-to-sale funnel, and find what actually sells." actions={<DateRangeFilter />} />

      <Card title="Compare campaigns" action={<span className="text-xs text-slate-500">Pick up to {MAX_COMPARE}</span>}>
        <div className="mb-4 flex flex-wrap gap-2">
          {campaigns.map(c => (
            <button key={c.id} onClick={() => toggle(c.id)} aria-pressed={selected.includes(c.id)}
              className={cx('rounded-full border px-3 py-1 text-xs font-medium', selected.includes(c.id)
                ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:bg-black/5 dark:hover:bg-white/10')}>
              {c.name}
            </button>
          ))}
        </div>
        {loading ? <TableSkeleton rows={6} /> : selected.length === 0 ? <EmptyState title="Select a campaign to compare" /> : (
          <Compare items={data.perCampaign.filter(c => selected.includes(c.id))} />
        )}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Funnel">
          {loading ? <Skeleton className="h-64" /> : data.funnel[0].value === 0 ? <EmptyState title="No delivery in this range" /> : <Funnel steps={data.funnel} />}
        </Card>

        <Card title="Spend vs sale rate" action={<span className="text-xs text-slate-500">Bubble size = leads</span>}>
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <ScatterChart margin={{ left: 0, right: 10, top: 10 }}>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="spend" name="Spend" tickFormatter={fmt.currencyCompact} />
                  <YAxis type="number" dataKey="purchaseRate" name="Purchase rate" unit="%" width={45} domain={[0, 100]} />
                  <ZAxis type="number" dataKey="leads" range={[60, 600]} name="Leads" />
                  <Tooltip {...tooltipProps} cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                    const c = payload?.[0]?.payload as (typeof data.perCampaign)[number] | undefined
                    if (!c) return null
                    return (
                      <div style={tooltipProps.contentStyle} className="p-2">
                        <p className="mb-1 font-semibold">{c.name}</p>
                        <p>Spend {fmt.currency(c.spend)} · {fmt.number(c.leads)} leads</p>
                        <p>Qualified {fmt.percent(c.purchaseRate)} · CPQL {fmt.currency(c.costPerPurchase)}</p>
                      </div>
                    )
                  }} />
                  <Scatter data={data.perCampaign.filter(c => c.leads > 0)} fill={CHART.spend} fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Why enquiries are lost">
          {loading ? <Skeleton className="h-48" /> : data.lost.length === 0 ? <EmptyState title="No lost enquiries in this range" /> : (
            <ul className="space-y-2.5">
              {data.lost.map(r => {
                const share = (r.n / data.lostTotal) * 100
                return (
                  <li key={r.reason} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 truncate text-sm" title={r.reason}>{r.reason}</span>
                    <span className="h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="block h-2.5 rounded-full bg-rose-400" style={{ width: `${Math.max(2, share)}%` }} />
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs text-slate-500 tabular-nums">{r.n} · {Math.round(share)}%</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <Card title="Buying intent vs actual sales" action={<span className="text-xs text-slate-500">From Instant Form answers</span>}>
          {loading ? <Skeleton className="h-48" /> : (
            <ul className="space-y-3">
              {(['High', 'Medium', 'Low'] as const).map(intent => {
                const r = data.bySource.find(x => x.intent === intent)
                const rate = r?.q ?? 0
                return (
                  <li key={intent} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm font-medium">{intent} intent</span>
                    <span className="h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="block h-2.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(1.5, Math.min(100, rate))}%` }} />
                    </span>
                    <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{fmt.percent(r?.q ?? null, 0)}</span>
                    <span className="hidden w-32 shrink-0 text-right text-xs text-slate-500 tabular-nums sm:block">{r?.won ?? 0} of {r?.n ?? 0} bought</span>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
            Customers who said they plan to buy soon convert far better. Worth bidding harder on the campaigns that bring them.
          </p>
        </Card>
      </div>

      <Card title="Best performing ads" className="mt-6" action={<span className="text-xs text-slate-500">Lowest CPL, min. 2 leads</span>}>
        <div className="-mx-5">
          {loading ? <TableSkeleton rows={5} /> : (
            <DataTable rows={data.ads} rowKey={a => a.id} initialSort={{ key: 'cpl', dir: 'asc' }}
              empty={<EmptyState title="Not enough leads yet" hint="Ads need at least 2 leads in the range to be ranked." />}
              columns={[
                { key: 'ad', label: 'Ad', value: a => a.ad?.name ?? a.id, render: a => (
                  <div><p className="font-medium">{a.ad?.name}</p><p className="text-xs text-slate-500">{a.ad?.format} · {campaignById.get(a.ad?.campaignId ?? '')?.name}</p></div>
                ) },
                { key: 'spend', label: 'Spend', value: a => a.spend, render: a => fmt.currency(a.spend), align: 'right' },
                { key: 'ctr', label: 'CTR', value: a => a.ctr, render: a => fmt.percent(a.ctr, 2), align: 'right' },
                { key: 'leads', label: 'Leads', value: a => a.leads, align: 'right' },
                { key: 'cpl', label: 'CPL', value: a => a.cpl, render: a => <span className="font-semibold text-[var(--color-accent-mint-text)]">{fmt.currency(a.cpl)}</span>, align: 'right' },
              ] satisfies Column<(typeof data.ads)[number]>[]} />
          )}
        </div>
      </Card>
    </>
  )
}

type CompareItem = { id: string; name: string; spend: number; impressions: number; ctr: number | null; cpc: number | null; leads: number; cpl: number | null; purchaseRate: number | null; costPerPurchase: number | null; purchases: number; revenue: number; roas: number | null }

const COMPARE_ROWS: { label: string; get: (c: CompareItem) => number | null; show: (n: number | null) => string; best: 'min' | 'max' | null }[] = [
  { label: 'Spend', get: c => c.spend, show: fmt.currency, best: null },
  { label: 'Impressions', get: c => c.impressions, show: fmt.number, best: null },
  { label: 'CTR', get: c => c.ctr, show: n => fmt.percent(n, 2), best: 'max' },
  { label: 'CPC', get: c => c.cpc, show: fmt.currency2, best: 'min' },
  { label: 'Leads', get: c => c.leads, show: fmt.number, best: 'max' },
  { label: 'CPL', get: c => c.cpl, show: fmt.currency, best: 'min' },
  { label: 'Purchase rate', get: c => c.purchaseRate, show: fmt.percent, best: 'max' },
  { label: 'Cost / sale', get: c => c.costPerPurchase, show: fmt.currency, best: 'min' },
  { label: 'Bills', get: c => c.purchases, show: fmt.number, best: 'max' },
  { label: 'Sales value', get: c => c.revenue, show: fmt.currency, best: 'max' },
  { label: 'ROAS', get: c => c.roas, show: n => (n == null ? '—' : `${n.toFixed(1)}×`), best: 'max' },
]

function Compare({ items }: { items: CompareItem[] }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-[var(--color-border-subtle)] bg-black/[0.03]">
          <tr>
            <th className="th w-40">Metric</th>
            {items.map(c => <th key={c.id} className="th text-right normal-case"><a href={`#/campaigns/${c.id}`} className="hover:text-[var(--color-accent-mint-text)]">{c.name}</a></th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {COMPARE_ROWS.map(row => {
            const vals = items.map(row.get).filter((v): v is number => v != null)
            const best = items.length > 1 && row.best && vals.length ? (row.best === 'min' ? Math.min(...vals) : Math.max(...vals)) : null
            return (
              <tr key={row.label}>
                <td className="td text-slate-500">{row.label}</td>
                {items.map(c => {
                  const v = row.get(c)
                  return <td key={c.id} className={cx('td text-right tabular-nums', v != null && v === best && 'font-semibold text-[var(--color-accent-mint-text)]')}>{row.show(v)}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Each row is its own step-to-step conversion, so the bar width always equals the stated
 * percentage. A single shared scale is useless here: leads are ~0.6% of impressions, and
 * a log scale would make that look like a gentle slope instead of the real cliff.
 */
function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value
        const share = prev ? (s.value / prev) * 100 : 100
        return (
          <li key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="tabular-nums">{fmt.number(s.value)}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-2.5 rounded-full transition-[width] duration-500" style={{ width: `${Math.max(1.5, Math.min(100, share))}%`, background: CHART.series[i] }} />
              </div>
              <span className="w-28 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                {i === 0 ? 'starting point' : `${fmt.percent(share, share < 10 ? 2 : 1)} of ${steps[i - 1].label.toLowerCase()}`}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
