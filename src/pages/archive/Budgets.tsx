import { useMemo, useState } from 'react'
import { ArrowRight, Pause, Play, Sparkles } from 'lucide-react'
import type { Campaign } from '../../data/types'
import { Badge, Card, CollectionIcon, cx, DeliveryBadge, EmptyState, PageHeader, Progress, Skeleton, TableSkeleton } from '../../components/ui'
import { DataTable } from '../../components/DataTable'
import { useInsights, useStore } from '../../store'
import { fmt } from '../../lib/format'
import { addDays, groupBy, monthInfo, pacing, todayIso, totals } from '../../lib/metrics'

const round50 = (n: number) => Math.max(50, Math.round(n / 50) * 50)

export default function Budgets() {
  const { scoped, filters, categoryById, updateCampaign, loading: storeLoading } = useStore()
  const today = todayIso()
  const month = monthInfo(today)
  const d14 = addDays(today, -13)
  const from = month.start < d14 ? month.start : d14
  const { data: rows = [], loading: rowsLoading } = useInsights(from, today, filters.category)
  const loading = storeLoading || rowsLoading
  const daysLeft = month.daysInMonth - month.daysElapsed

  const data = useMemo(() => {
    const byC = groupBy(rows, r => r.campaignId)
    const list = scoped.campaigns.map(c => {
      const rs = byC.get(c.id) ?? []
      const mtd = totals(rs.filter(r => r.date >= month.start)).spend
      const recent = totals(rs.filter(r => r.date >= d14))
      // Paused campaigns keep what they spent so far but plan nothing more.
      const p = pacing(c.status === 'ACTIVE' ? c.dailyBudget : 0, mtd, month.daysElapsed, month.daysInMonth)
      const forecast = c.status === 'ACTIVE' ? p.forecast : mtd
      return { c, mtd, p, forecast, cpl14: recent.cpl, leads14: recent.leads }
    })
    const active = list.filter(x => x.c.status === 'ACTIVE')
    const budget = active.reduce((s, x) => s + x.c.dailyBudget * month.daysInMonth, 0)
    const spent = list.reduce((s, x) => s + x.mtd, 0)
    const forecast = list.reduce((s, x) => s + x.forecast, 0)

    // Rebalance within a product category: comparing CPL across categories is apples to oranges.
    const recs = [...groupBy(active.filter(x => x.cpl14 != null && x.leads14 >= 3), x => x.c.categoryId)].flatMap(([, xs]) => {
      if (xs.length < 2) return []
      const sorted = [...xs].sort((a, b) => a.cpl14! - b.cpl14!)
      const best = sorted[0], worst = sorted[sorted.length - 1]
      if (worst.cpl14! < best.cpl14! * 1.4) return []
      const shift = round50(worst.c.dailyBudget * 0.25)
      const gain = (shift * daysLeft) / best.cpl14! - (shift * daysLeft) / worst.cpl14!
      return gain >= 1 ? [{ best, worst, shift, gain }] : []
    }).sort((a, b) => b.gain - a.gain).slice(0, 3)
    return { list, budget, spent, forecast, recs }
  }, [rows, scoped.campaigns, month.start, month.daysElapsed, month.daysInMonth, d14, daysLeft])

  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' })
  const share = (month.daysElapsed / month.daysInMonth) * 100
  const totalPace = data.budget ? (data.spent / ((data.budget / month.daysInMonth) * month.daysElapsed)) * 100 : null

  const apply = (r: (typeof data.recs)[number]) => {
    updateCampaign(r.worst.c.id, { dailyBudget: r.worst.c.dailyBudget - r.shift }, `Moved ${fmt.currency(r.shift)}/day`)
    updateCampaign(r.best.c.id, { dailyBudget: r.best.c.dailyBudget + r.shift }, `Moved ${fmt.currency(r.shift)}/day to ${r.best.c.name}`)
  }

  const summary = [
    { label: `${monthName} budget`, value: fmt.currency(data.budget), sub: `${scoped.campaigns.filter(c => c.status === 'ACTIVE').length} active campaigns` },
    { label: 'Spent so far', value: fmt.currency(data.spent), sub: `Day ${month.daysElapsed} of ${month.daysInMonth} · ${fmt.percent(totalPace, 0)} of plan` },
    { label: 'Month-end forecast', value: fmt.currency(data.forecast), sub: data.budget ? `${data.forecast > data.budget ? '+' : ''}${fmt.currency(data.forecast - data.budget)} vs budget` : '—', warn: data.forecast > data.budget * 1.1 },
    { label: 'Days left', value: String(daysLeft), sub: `Left to spend: ${fmt.currency(Math.max(0, data.budget - data.spent))}` },
  ]

  return (
    <>
      <PageHeader title="Budgets & pacing" subtitle="Compares month-to-date spend with each campaign's daily budget. Click a budget to edit it." />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summary.map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            {loading ? <Skeleton className="mt-2 h-7 w-28" /> : <p className={cx('mt-1 text-2xl font-semibold tabular-nums tracking-tight', s.warn ? 'text-rose-600' : 'text-[var(--color-text-primary)]')}>{s.value}</p>}
            <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>
      {!loading && <div className="mt-3"><Progress value={(data.spent / (data.budget || 1)) * 100} marker={share} tone={totalPace && totalPace > 115 ? 'red' : 'indigo'} /></div>}

      {!loading && data.recs.length > 0 && (
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {data.recs.map(r => (
            <div key={r.worst.c.id} className="card relative overflow-hidden p-4">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--color-accent-mint)]" />
              <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"><Sparkles size={14} /> Rebalance suggestion</p>
              <p className="mt-2 text-sm">Move <b>{fmt.currency(r.shift)}/day</b> from</p>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate rounded-md bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" title={r.worst.c.name}>{r.worst.c.name} · {fmt.currency(r.worst.cpl14)}</span>
                <ArrowRight size={14} className="shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" title={r.best.c.name}>{r.best.c.name} · {fmt.currency(r.best.cpl14)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">≈ <b className="text-[var(--color-accent-mint-text)]">+{Math.round(r.gain)} leads</b> by month end, same spend (based on 14-day CPL).</p>
              <button className="btn btn-primary btn-sm mt-3" onClick={() => apply(r)}>Apply</button>
            </div>
          ))}
        </div>
      )}

      <Card padded={false} className="mt-6 overflow-hidden">
        {loading ? <TableSkeleton rows={8} /> : data.list.length === 0 ? <EmptyState title="No campaigns" /> : (
          <DataTable rows={data.list} rowKey={x => x.c.id} initialSort={{ key: 'pace', dir: 'desc' }} rowClassName={x => x.c.status === 'PAUSED' && 'opacity-60'}
            columns={[
              { key: 'name', label: 'Campaign', value: x => x.c.name, className: 'min-w-56', render: x => (
                <div className="whitespace-normal">
                  <a href={`#/campaigns/${x.c.id}`} className="font-medium hover:text-indigo-600">{x.c.name}</a>
                  {!filters.category && <p className="flex items-center gap-1.5 text-xs text-slate-500"><CollectionIcon id={x.c.categoryId} size={13} />{categoryById.get(x.c.categoryId)?.name}</p>}
                </div>
              ) },
              { key: 'status', label: 'Status', value: x => x.c.status, render: x => <DeliveryBadge status={x.c.status} /> },
              { key: 'daily', label: 'Daily budget', value: x => x.c.dailyBudget, align: 'right', render: x => <BudgetInput campaign={x.c} onSave={v => updateCampaign(x.c.id, { dailyBudget: v }, `Daily budget set to ${fmt.currency(v)}`)} /> },
              { key: 'mtd', label: 'Spent (MTD)', value: x => x.mtd, render: x => fmt.currency(x.mtd), align: 'right' },
              { key: 'pace', label: 'Pacing', value: x => (x.c.status === 'ACTIVE' ? x.p.pace : null), className: 'w-52', render: x => x.c.status !== 'ACTIVE' ? <span className="text-xs text-slate-400">Paused</span> : (
                <div className="w-44">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className={cx('font-medium', x.p.state === 'over' ? 'text-rose-600' : x.p.state === 'under' ? 'text-amber-600' : 'text-emerald-600')}>{fmt.percent(x.p.pace, 0)}</span>
                    <Badge color={x.p.state === 'over' ? 'red' : x.p.state === 'under' ? 'amber' : 'green'}>{x.p.state === 'over' ? 'Over' : x.p.state === 'under' ? 'Under' : 'On track'}</Badge>
                  </div>
                  <Progress value={(x.mtd / (x.p.monthBudget || 1)) * 100} marker={share} tone={x.p.state === 'over' ? 'red' : x.p.state === 'under' ? 'amber' : 'green'} />
                </div>
              ) },
              { key: 'forecast', label: 'Forecast', value: x => x.forecast, align: 'right', className: 'hidden md:table-cell', render: x => (
                <span title={`Budget ${fmt.currency(x.p.monthBudget)}`}>{fmt.currency(x.forecast)}<span className="block text-[11px] text-slate-400">of {fmt.currencyCompact(x.c.status === 'ACTIVE' ? x.p.monthBudget : x.mtd)}</span></span>
              ) },
              { key: 'cpl', label: 'CPL (14d)', value: x => x.cpl14, render: x => fmt.currency(x.cpl14), align: 'right', className: 'hidden lg:table-cell' },
              { key: 'act', label: '', render: x => (
                <button className="btn btn-ghost btn-sm" title={x.c.status === 'ACTIVE' ? 'Pause' : 'Resume'} aria-label={x.c.status === 'ACTIVE' ? `Pause ${x.c.name}` : `Resume ${x.c.name}`}
                  onClick={() => updateCampaign(x.c.id, { status: x.c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }, `${x.c.status === 'ACTIVE' ? 'Paused' : 'Resumed'} ${x.c.name}`)}>
                  {x.c.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
                </button>
              ) },
            ]} />
        )}
      </Card>
    </>
  )
}

function BudgetInput({ campaign, onSave }: { campaign: Campaign; onSave: (v: number) => void }) {
  const [v, setV] = useState<string | null>(null)
  const commit = () => {
    const n = Number(v)
    if (v != null && Number.isFinite(n) && n >= 100 && n !== campaign.dailyBudget) onSave(Math.round(n))
    setV(null)
  }
  if (v == null) {
    return <button className="rounded-md px-2 py-1 tabular-nums hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setV(String(campaign.dailyBudget))} title="Edit daily budget">{fmt.currency(campaign.dailyBudget)}</button>
  }
  return (
    <input autoFocus type="number" min={100} step={50} className="input h-8 w-28 text-right tabular-nums" value={v} aria-label="Daily budget"
      onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setV(null) }} />
  )
}
