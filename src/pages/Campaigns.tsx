import { useState } from 'react'
import type { Route } from '../components/Shell'
import { Card, PageHead, Segmented, Select, StatusPill } from '../components/ui'
import { CAMPAIGNS } from '../data/mock'
import type { Campaign } from '../data/types'
import { inr, num, pct } from '../lib/format'

type Tab = 'active' | 'paused' | 'all'
type Kind = 'all' | 'leads' | 'awareness'

const isLeadCampaign = (c: Campaign) => c.leads !== null

export default function Campaigns({ go }: { go: (r: Route) => void }) {
  const [tab, setTab] = useState<Tab>('active')
  const [kind, setKind] = useState<Kind>('all')
  const [date, setDate] = useState('This month (1–13 Nov)')

  const rows = CAMPAIGNS.filter(
    (c) =>
      (tab === 'all' || (tab === 'active' ? c.status === 'Active' : c.status === 'Paused')) &&
      (kind === 'all' || (kind === 'leads' ? isLeadCampaign(c) : !isLeadCampaign(c))),
  )

  const leadRows = rows.filter(isLeadCampaign)
  const sum = (k: keyof Campaign, list: Campaign[]) =>
    list.reduce((a, c) => a + ((c[k] as number | null) ?? 0), 0)

  const leadSpend = sum('spend', leadRows)
  const leads = sum('leads', leadRows)
  const visits = sum('visits', leadRows)
  const value = sum('value', leadRows)

  const totals = [
    { label: 'Ad spend', value: inr(sum('spend', rows)), note: `${rows.length} campaigns shown` },
    { label: 'Leads from ads', value: num(leads), note: `from ${leadRows.length} lead campaigns` },
    { label: 'Cost per lead', value: leads ? inr(leadSpend / leads) : '—', note: 'lead campaigns only' },
    { label: 'Visits scheduled', value: num(visits), note: 'from ad leads' },
    { label: 'Cost per visit', value: visits ? inr(leadSpend / visits) : '—', note: 'lead campaigns only' },
    { label: 'Purchased', value: num(sum('won', leadRows)), note: 'leads moved to Purchased' },
    {
      label: 'Sales value',
      value: inr(value),
      note: leadSpend ? `${(value / leadSpend).toFixed(1)}× the lead-campaign spend` : '',
    },
  ]

  const active = CAMPAIGNS.filter((c) => c.status === 'Active').length

  return (
    <>
      <PageHead title="Campaigns" sub="Synced from Meta every hour · last sync 10:30 AM · sample data">
        <Select
          label="Date"
          value={date}
          options={['This month (1–13 Nov)', 'Today', 'This week', 'Last month']}
          onChange={setDate}
        />
      </PageHead>

      <section
        aria-label="Totals"
        className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]"
      >
        {totals.map((t) => (
          <div key={t.label} className="flex flex-col gap-1 rounded-[14px] border border-line bg-surface p-4">
            <span className="text-xs font-medium text-ink-mute">{t.label}</span>
            <span className="text-2xl font-bold tracking-[-0.01em]">{t.value}</span>
            <span className="text-xs text-ink-mute">{t.note}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Campaign status"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'active', label: `Running (${active})` },
            { id: 'paused', label: `Paused (${CAMPAIGNS.length - active})` },
            { id: 'all', label: `All (${CAMPAIGNS.length})` },
          ]}
        />
        <Segmented
          label="Campaign type"
          value={kind}
          onChange={setKind}
          options={[
            { id: 'all', label: 'All types' },
            { id: 'leads', label: 'Bring leads' },
            { id: 'awareness', label: 'Awareness only' },
          ]}
        />
      </div>

      {rows.map((c) => {
        const lead = isLeadCampaign(c)
        const muted = 'font-medium text-[#8A817C]'
        const metrics: { label: string; value: string; cls?: string }[] = [
          { label: 'Spend', value: inr(c.spend) },
          { label: 'Impressions', value: num(c.impressions) },
          { label: 'Clicks', value: num(c.clicks) },
          { label: 'CTR', value: pct(c.clicks, c.impressions) },
          {
            label: 'Leads',
            value: lead ? num(c.leads!) : 'No leads',
            cls: lead ? 'text-plum' : muted,
          },
          {
            label: 'Cost per lead',
            value: lead && c.leads ? inr(c.spend / c.leads) : '—',
            cls: lead ? '' : muted,
          },
          { label: 'Visits scheduled', value: lead ? num(c.visits!) : '—', cls: lead ? '' : muted },
          {
            label: 'Cost per visit',
            value: lead && c.visits ? inr(c.spend / c.visits) : '—',
            cls: lead ? '' : muted,
          },
          { label: 'Purchased', value: lead ? num(c.won!) : '—', cls: lead ? 'text-good' : muted },
          {
            label: 'Sales value',
            value: lead && c.value ? inr(c.value) : '—',
            cls: lead ? 'text-good' : muted,
          },
        ]
        return (
          <Card key={c.id} className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="#/campaign"
                    onClick={(e) => {
                      e.preventDefault()
                      go('campaign')
                    }}
                    className="text-base font-semibold text-ink no-underline"
                  >
                    {c.name}
                  </a>
                  <StatusPill active={c.status === 'Active'} />
                  <span className="rounded-md bg-[#F3F0EE] px-2 py-[3px] text-xs font-medium text-[#3F3A36]">
                    {c.objective}
                  </span>
                </div>
                <p className="m-0 truncate text-sm text-ink-soft">{c.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-[10px] border border-[#EEE9E6] bg-[#FAF8F7] px-3 py-2 text-[13px]">
                  <strong>{c.adsets}</strong> ad sets
                </span>
                <span className="rounded-[10px] border border-[#EEE9E6] bg-[#FAF8F7] px-3 py-2 text-[13px]">
                  <strong>{c.adsRunning}</strong> of {c.adsTotal} ads running
                </span>
              </div>
            </div>
            <dl className="m-0 grid gap-2.5 border-t border-line-soft pt-3.5 [grid-template-columns:repeat(auto-fit,minmax(110px,1fr))]">
              {metrics.map((m) => (
                <div key={m.label} className="min-w-0">
                  <dt className="mb-[3px] text-xs text-ink-mute">{m.label}</dt>
                  <dd className={`m-0 text-[15px] font-semibold ${m.cls ?? ''}`}>{m.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )
      })}
    </>
  )
}
