import { useMemo, useState } from 'react'
import { ChevronRight, Pause, Play, Search } from 'lucide-react'
import type { Ad, AdSet, Campaign, DeliveryStatus, Insight } from '../../data/types'
import { Card, CollectionIcon, Dot, DateRangeFilter, DeliveryBadge, EmptyState, PageHeader, Select, Skeleton, TableSkeleton, VerdictBadge } from '../../components/ui'
import { DataTable, type Column } from '../../components/DataTable'
import { TrendChart } from '../../components/TrendChart'
import { useInsights, useStore } from '../../store'
import { fmt } from '../../lib/format'
import { cplVerdict, dailySeries, groupBy, totals, type Totals } from '../../lib/metrics'

export type MetricRow = Totals & { id: string; name: string; status: DeliveryStatus; sub?: string; dot?: string }

/** Rows for a list of entities, with totals from the matching insight rows (zeros when none). */
export function metricRows<E extends { id: string; name: string; status: DeliveryStatus }>(
  entities: E[], rows: Insight[], key: (r: Insight) => string, sub?: (e: E) => string, dot?: (e: E) => string | undefined,
): MetricRow[] {
  const g = groupBy(rows, key)
  return entities.map(e => ({ id: e.id, name: e.name, status: e.status, sub: sub?.(e), dot: dot?.(e), ...totals(g.get(e.id) ?? []) }))
}

export function metricColumns(avgCpl: number | null, nameLabel = 'Name'): Column<MetricRow>[] {
  return [
    {
      key: 'name', label: nameLabel, value: r => r.name, className: 'min-w-56',
      render: r => (
        <div className="whitespace-normal">
          <p className="font-medium">{r.name}</p>
          {r.sub && <p className="flex items-center gap-1.5 text-xs text-slate-500">{r.dot && <Dot color={r.dot} />}{r.sub}</p>}
        </div>
      ),
    },
    { key: 'status', label: 'Status', value: r => r.status, render: r => <DeliveryBadge status={r.status} /> },
    { key: 'spend', label: 'Spend', value: r => r.spend, render: r => fmt.currency(r.spend), align: 'right' },
    { key: 'impressions', label: 'Impr.', value: r => r.impressions, render: r => fmt.compact(r.impressions), align: 'right', className: 'hidden md:table-cell' },
    { key: 'ctr', label: 'CTR', value: r => r.ctr, render: r => fmt.percent(r.ctr, 2), align: 'right' },
    { key: 'cpc', label: 'CPC', value: r => r.cpc, render: r => fmt.currency2(r.cpc), align: 'right', className: 'hidden md:table-cell' },
    { key: 'leads', label: 'Leads', value: r => r.leads, render: r => fmt.number(r.leads), align: 'right' },
    { key: 'cpl', label: 'CPL', value: r => r.cpl, render: r => <span className="font-medium">{fmt.currency(r.cpl)}</span>, align: 'right' },
    { key: 'verdict', label: '', render: r => <VerdictBadge verdict={cplVerdict(r.cpl, avgCpl)} /> },
  ]
}

export default function Campaigns({ campaignId }: { campaignId?: string }) {
  const { campaignById, loading } = useStore()
  const campaign = campaignId ? campaignById.get(campaignId) : undefined
  if (campaignId && !loading && !campaign) {
    return <Card><EmptyState title="Campaign not found" action={<a className="btn" href="#/campaigns">Back to campaigns</a>} /></Card>
  }
  if (campaignId) return campaign ? <CampaignDetail campaign={campaign} /> : <TableSkeleton />
  return <CampaignList />
}

function CampaignList() {
  const { scoped, filters, loading, categoryById, updateCampaign } = useStore()
  const campaigns = scoped.campaigns
  const { data: rows = [], loading: rowsLoading } = useInsights(filters.from, filters.to, filters.category)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const avgCpl = totals(rows).cpl

  const all = useMemo(() => metricRows(campaigns, rows, r => r.campaignId,
    c => `${categoryById.get(c.categoryId)?.name ?? ''} · ${c.objective}`,
    c => categoryById.get(c.categoryId)?.color), [campaigns, rows, categoryById])
  const columns = [...metricColumns(avgCpl, 'Campaign'), {
    key: 'act', label: '', render: (r: MetricRow) => (
      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); updateCampaign(r.id, { status: r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }, `${r.status === 'ACTIVE' ? 'Paused' : 'Resumed'} ${r.name}`) }}
        aria-label={r.status === 'ACTIVE' ? `Pause ${r.name}` : `Resume ${r.name}`} title={r.status === 'ACTIVE' ? 'Pause' : 'Resume'}>
        {r.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
      </button>
    ),
  }]
  const q = query.trim().toLowerCase()
  const visible = all.filter(r => (!q || r.name.toLowerCase().includes(q)) && (!status || r.status === status))

  return (
    <>
      <PageHeader title="Campaigns" subtitle="Winner / loser badges compare each campaign's CPL with the account average (±20%)." actions={<DateRangeFilter />} />
      <Card>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input data-search className="input w-full pl-9" placeholder="Search campaigns" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search campaigns" />
          </label>
          <Select label="Status" value={status} onChange={setStatus}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </Select>
        </div>
        <div className="-mx-5">
          {loading || rowsLoading ? <TableSkeleton rows={10} /> : (
            <DataTable rows={visible} columns={columns} rowKey={r => r.id}
              onRowClick={r => { window.location.hash = `#/campaigns/${r.id}` }}
              initialSort={{ key: 'spend', dir: 'desc' }}
              empty={<EmptyState title="No campaigns match" hint="Try a different search or status." action={<button className="btn" onClick={() => { setQuery(''); setStatus('') }}>Clear filters</button>} />} />
          )}
        </div>
      </Card>
    </>
  )
}

function CampaignDetail({ campaign }: { campaign: Campaign }) {
  const { filters, updateCampaign, categoryById } = useStore()
  const { data: all = [], loading } = useInsights(filters.from, filters.to, campaign.categoryId)
  const category = categoryById.get(campaign.categoryId)
  const [adSetId, setAdSetId] = useState<string>()
  const adSet: AdSet | undefined = campaign.adSets.find(a => a.id === adSetId)

  const rows = useMemo(() => all.filter(r => r.campaignId === campaign.id), [all, campaign.id])
  const scoped = adSet ? rows.filter(r => r.adSetId === adSet.id) : rows
  const t = totals(scoped)
  const avgCpl = totals(rows).cpl

  const tableRows = adSet
    ? metricRows<Ad>(adSet.ads, scoped, r => r.adId, a => a.format)
    : metricRows<AdSet>(campaign.adSets, rows, r => r.adSetId, a => `${a.ads.length} ads · ${a.audience}`)

  const stats = [
    ['Spend', fmt.currency(t.spend)], ['Leads', fmt.number(t.leads)], ['CPL', fmt.currency(t.cpl)],
    ['CTR', fmt.percent(t.ctr, 2)], ['CPC', fmt.currency2(t.cpc)], ['Daily budget', fmt.currency(campaign.dailyBudget)],
  ]

  return (
    <>
      <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <span className="flex items-center gap-1.5"><CollectionIcon id={category?.id} size={14} />{category?.name}</span>
        <ChevronRight size={14} />
        <a href="#/campaigns" className="hover:text-slate-900 dark:hover:text-white">Campaigns</a>
        <ChevronRight size={14} />
        {adSet ? <button className="hover:text-slate-900 dark:hover:text-white" onClick={() => setAdSetId(undefined)}>{campaign.name}</button>
          : <span className="text-slate-900 dark:text-white">{campaign.name}</span>}
        {adSet && <><ChevronRight size={14} /><span className="text-slate-900 dark:text-white">{adSet.name}</span></>}
      </nav>
      <PageHeader title={adSet?.name ?? campaign.name}
        subtitle={adSet ? `Ad set · ${adSet.audience}` : `${category?.name} · ${campaign.objective} · ${campaign.platform} · ${campaign.adSets.length} ad sets`}
        actions={<>
          <DeliveryBadge status={adSet?.status ?? campaign.status} />
          {!adSet && (
            <button className="btn btn-sm" onClick={() => updateCampaign(campaign.id, { status: campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }, `${campaign.status === 'ACTIVE' ? 'Paused' : 'Resumed'} ${campaign.name}`)}>
              {campaign.status === 'ACTIVE' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
            </button>
          )}
          <DateRangeFilter />
        </>} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-500">{label}</p>
            {loading ? <Skeleton className="mt-2 h-6 w-20" /> : <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>}
          </div>
        ))}
      </div>

      <Card title="Daily trend" className="mt-6">
        {loading ? <Skeleton className="h-72" /> : t.spend === 0
          ? <EmptyState title="No delivery in this range" hint={campaign.status === 'PAUSED' ? 'This campaign is paused. Widen the date range to see past delivery.' : undefined} />
          : <TrendChart series={dailySeries(scoped, filters.from, filters.to)} />}
      </Card>

      <Card title={adSet ? 'Ads' : 'Ad sets'} className="mt-6" action={!adSet && <span className="text-xs text-slate-500">Click an ad set to see its ads</span>}>
        <div className="-mx-5">
          {loading ? <TableSkeleton rows={4} /> : (
            <DataTable rows={tableRows} columns={metricColumns(avgCpl, adSet ? 'Ad' : 'Ad set')} rowKey={r => r.id}
              onRowClick={adSet ? undefined : r => setAdSetId(r.id)} initialSort={{ key: 'spend', dir: 'desc' }}
              empty={<EmptyState title="Nothing here yet" />} />
          )}
        </div>
      </Card>
    </>
  )
}
