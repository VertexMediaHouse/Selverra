import { useMemo, useState } from 'react'
import { TrendingDown } from 'lucide-react'
import type { Ad } from '../../data/types'
import { AdPreview, AdThumb } from '../../components/AdCreative'
import { TrendChart } from '../../components/TrendChart'
import { Badge, Card, CategoryTag, CollectionIcon, cx, DateRangeFilter, DeliveryBadge, EmptyState, Modal, PageHeader, Segmented, Select, Skeleton, Sparkline } from '../../components/ui'
import { go, useInsights, useStore } from '../../store'
import { fmt } from '../../lib/format'
import { addDays, dailySeries, groupBy, totals, type Totals } from '../../lib/metrics'

type Row = Totals & { ad: Ad; ctrSeries: number[]; fatigue: number | null; series: ReturnType<typeof dailySeries> }
const SORTS = { cpl: 'Lowest CPL', ctr: 'Highest CTR', spend: 'Most spend', leads: 'Most leads' } as const

export default function Creatives() {
  const { scoped, filters, query, brand, categoryById, campaignById, adById, loading: storeLoading } = useStore()
  const { data: rows = [], loading: rowsLoading } = useInsights(filters.from, filters.to, filters.category)
  const loading = storeLoading || rowsLoading
  const [format, setFormat] = useState<'All' | Ad['format']>('All')
  const [campaignId, setCampaignId] = useState('')
  const [sort, setSort] = useState<keyof typeof SORTS>('cpl')
  const [fatiguedOnly, setFatiguedOnly] = useState(false)
  const [limit, setLimit] = useState(24)
  const openAd = query.get('ad') ?? undefined

  const all = useMemo<Row[]>(() => {
    const byAd = groupBy(rows, r => r.adId)
    const cut = addDays(filters.to, -6)
    return scoped.campaigns.flatMap(c => c.adSets.flatMap(s => s.ads)).map(ad => {
      const rs = byAd.get(ad.id) ?? []
      const series = dailySeries(rs, filters.from, filters.to)
      const recent = totals(rs.filter(r => r.date >= cut))
      const before = totals(rs.filter(r => r.date < cut))
      const fatigue = recent.ctr && before.ctr && recent.impressions > 1000 ? (recent.ctr / before.ctr - 1) * 100 : null
      return { ad, ...totals(rs), series, ctrSeries: series.map(d => d.ctr ?? 0), fatigue }
    }).filter(r => r.impressions > 0)
  }, [rows, scoped.campaigns, filters.from, filters.to])

  const visible = all
    .filter(r => (format === 'All' || r.ad.format === format) && (!campaignId || r.ad.campaignId === campaignId) && (!fatiguedOnly || (r.fatigue ?? 0) <= -20))
    .sort((a, b) => sort === 'cpl' ? (a.cpl ?? Infinity) - (b.cpl ?? Infinity) : sort === 'ctr' ? (b.ctr ?? 0) - (a.ctr ?? 0) : b[sort] - a[sort])
  const fatiguedCount = all.filter(r => (r.fatigue ?? 0) <= -20).length
  const selected = openAd ? all.find(r => r.ad.id === openAd) : undefined
  const selectedAd = openAd ? adById.get(openAd) : undefined

  return (
    <>
      <PageHeader title="Creatives" subtitle={`${all.length} ads with delivery · ${fatiguedCount} showing fatigue`} actions={<DateRangeFilter />} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Segmented label="Format" value={format} onChange={setFormat} options={(['All', 'Image', 'Video', 'Carousel', 'Reel'] as const).map(f => ({ value: f, label: f }))} />
        <Select label="Campaign" value={campaignId} onChange={setCampaignId} className="max-w-60">
          <option value="">All campaigns</option>
          {scoped.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Sort" value={sort} onChange={v => setSort(v as keyof typeof SORTS)}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" className="size-4 accent-indigo-600" checked={fatiguedOnly} onChange={e => setFatiguedOnly(e.target.checked)} />
          Fatigued only <Badge color="amber">{fatiguedCount}</Badge>
        </label>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
      ) : visible.length === 0 ? <Card><EmptyState title="No creatives match" hint="Try another format or campaign." /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.slice(0, limit).map(r => {
            const category = categoryById.get(r.ad.categoryId)
            const fatigued = (r.fatigue ?? 0) <= -20
            return (
              <button key={r.ad.id} onClick={() => go(`#/creatives?ad=${r.ad.id}`)}
                className="card group overflow-hidden text-left transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none">
                <div className="relative">
                  <AdThumb ad={r.ad} category={category} brand={brand?.name} className="aspect-[4/3] transition-transform duration-300 group-hover:scale-[1.02]" />
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {fatigued && <Badge color="red" className="shadow-sm"><TrendingDown size={12} />Fatigue {Math.round(r.fatigue!)}%</Badge>}
                    <Badge className="bg-white/90 shadow-sm dark:bg-slate-900/90">{r.ad.format}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <p className="truncate text-sm font-semibold">{r.ad.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500"><CollectionIcon id={category?.id} size={13} />{campaignById.get(r.ad.campaignId)?.name}</p>
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {([['Spend', fmt.currencyCompact(r.spend)], ['CTR', fmt.percent(r.ctr, 2)], ['Leads', fmt.number(r.leads)], ['CPL', fmt.currency(r.cpl)]] as const).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-slate-50 py-1.5 dark:bg-slate-800/60"><dt className="text-[10px] text-slate-500 uppercase">{k}</dt><dd className="text-xs font-semibold tabular-nums">{v}</dd></div>
                    ))}
                  </dl>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase">CTR</span>
                    <Sparkline values={r.ctrSeries} color={fatigued ? '#a98f6b' : '#B08E54'} className="h-6 flex-1" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
      {!loading && visible.length > limit && (
        <div className="mt-6 text-center"><button className="btn" onClick={() => setLimit(l => l + 24)}>Show more · {limit} of {visible.length}</button></div>
      )}

      <Modal open={!!selectedAd} onClose={() => go('#/creatives')} wide title={selectedAd?.name ?? ''}>
        {selectedAd && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
            <AdPreview ad={selectedAd} category={categoryById.get(selectedAd.categoryId)} brand={brand?.name} />
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <DeliveryBadge status={selectedAd.status} /><CategoryTag id={selectedAd.categoryId} /><Badge>{selectedAd.format}</Badge><Badge>CTA: {selectedAd.cta}</Badge>
                {selected?.fatigue != null && <Badge color={selected.fatigue <= -20 ? 'red' : 'green'}>CTR {selected.fatigue > 0 ? '+' : ''}{Math.round(selected.fatigue)}% last 7d</Badge>}
              </div>
              <p className="text-sm text-slate-500"><a className="hover:text-indigo-600" href={`#/campaigns/${selectedAd.campaignId}`}>{campaignById.get(selectedAd.campaignId)?.name}</a></p>
              {selected ? (
                <>
                  <dl className="grid grid-cols-3 gap-3">
                    {([['Spend', fmt.currency(selected.spend)], ['Impressions', fmt.compact(selected.impressions)], ['CTR', fmt.percent(selected.ctr, 2)], ['CPC', fmt.currency2(selected.cpc)], ['Leads', fmt.number(selected.leads)], ['CPL', fmt.currency(selected.cpl)]] as const).map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-0.5 font-semibold tabular-nums">{v}</dd></div>
                    ))}
                  </dl>
                  <TrendChart series={selected.series} height={220} />
                  {(selected.fatigue ?? 0) <= -20 && (
                    <p className={cx('rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300')}>
                      This creative is wearing out. Try a new hook or visual with the same offer, then move budget to the fresh version.
                    </p>
                  )}
                </>
              ) : <p className="text-sm text-slate-500">No delivery in the selected date range.</p>}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
