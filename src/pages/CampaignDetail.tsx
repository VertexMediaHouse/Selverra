import { useState } from 'react'
import type { Route } from '../components/Shell'
import { IconBack } from '../components/icons'
import { Card, Pill, StatusPill } from '../components/ui'
import { AD_FORMAT_COLOR, AD_SETS } from '../data/mock'
import { inr, num } from '../lib/format'

const KPIS = [
  ['Spend', '₹38,400'],
  ['Impressions', '2,14,000'],
  ['Clicks', '4,100'],
  ['CTR', '1.92%'],
  ['Leads', '138'],
  ['Cost per lead', '₹278'],
  ['Visits scheduled', '26'],
  ['Cost per visit', '₹1,477'],
  ['Purchased', '12'],
  ['Sales value', '₹5,76,000'],
]

export default function CampaignDetail({ go }: { go: (r: Route) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ as1: true, as2: true, as3: false })

  return (
    <>
      <a
        href="#/campaigns"
        onClick={(e) => {
          e.preventDefault()
          go('campaigns')
        }}
        className="inline-flex min-h-8 items-center gap-1.5 text-[13px] font-semibold no-underline"
      >
        <IconBack />
        All campaigns
      </a>

      <Card className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="m-0 text-2xl font-bold">Sannjh Bridal – Lead Form</h1>
              <StatusPill active />
              <span className="rounded-md bg-[#F3F0EE] px-2 py-[3px] text-xs font-medium text-[#3F3A36]">
                Leads
              </span>
            </div>
            <p className="m-0 text-sm text-ink-soft">
              Bridal silver enquiries from brides-to-be in Ahmedabad, through Instagram and Facebook
              forms.
            </p>
          </div>
          <a
            href="#/leads"
            onClick={(e) => {
              e.preventDefault()
              go('leads')
            }}
            className="inline-flex min-h-11 items-center rounded-[10px] bg-rail px-4 text-sm font-semibold text-white no-underline"
          >
            See this campaign's 138 leads
          </a>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-soft">
          <span>
            <strong className="text-ink">₹1,300/day</strong> total budget, set on ad sets
          </span>
          <span>
            Started <strong className="text-ink">20 Oct 2026</strong>
          </span>
          <span>
            Runs on <strong className="text-ink">Instagram, Facebook</strong>
          </span>
          <span>
            Form <strong className="text-ink">Sannjh bridal enquiry</strong>
          </span>
          <span>
            Collection <strong className="text-ink">Sannjh</strong>
          </span>
        </div>

        <dl className="m-0 grid gap-2.5 border-t border-line-soft pt-3.5 [grid-template-columns:repeat(auto-fit,minmax(110px,1fr))]">
          {KPIS.map(([label, value]) => (
            <div key={label}>
              <dt className="mb-[3px] text-xs text-ink-mute">{label}</dt>
              <dd className="m-0 text-lg font-bold">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="m-0 text-[13px] text-ink-soft">
          Leads by source: Instant Form · Instagram 96 · Instant Form · Facebook 38 · Facebook
          comment 4
        </p>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-lg font-semibold">Ad sets and ads</h2>
        <span className="text-[13px] text-ink-mute">3 ad sets · 6 of 7 ads running</span>
      </div>

      {AD_SETS.map((s) => {
        const isOpen = !!open[s.id]
        const metrics = [
          ['Spend', inr(s.spend)],
          ['CTR', s.ctr.toFixed(2) + '%'],
          ['Leads', num(s.leads)],
          ['Cost/lead', inr(s.spend / s.leads)],
          ['Visits', num(s.visits)],
          ['Cost/visit', inr(s.spend / s.visits)],
          ['Purchased', num(s.won)],
        ]
        return (
          <section key={s.id} className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [s.id]: !isOpen }))}
              className="flex w-full cursor-pointer flex-wrap items-center gap-x-5 gap-y-3 border-0 bg-surface px-5 py-4 text-left text-ink"
            >
              <span aria-hidden="true" className="w-3.5 text-sm text-ink-mute">
                {isOpen ? '▾' : '▸'}
              </span>
              <span className="flex min-w-0 flex-[1_1_300px] flex-col gap-[3px]">
                <span className="text-[15px] font-semibold">{s.name}</span>
                <span className="text-[13px] text-ink-mute">
                  {s.audience} · {s.budget} · {s.adsLine}
                </span>
              </span>
              <span className="flex flex-wrap gap-[18px] text-[13px]">
                {metrics.map(([label, value]) => (
                  <span key={label} className="flex min-w-16 flex-col gap-0.5">
                    <span className="text-[11px] text-ink-mute">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </span>
                ))}
              </span>
            </button>

            {isOpen ? (
              <div className="overflow-x-auto border-t border-line-soft">
                <table className="w-full min-w-[900px] border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                      <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">Ad</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Spend</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Impressions</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">CTR</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Leads</th>
                      <th scope="col" className="py-2.5 pr-5 pl-3 text-right font-medium">
                        Cost per lead
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.ads.map((a) => (
                      <tr key={a.name} className="border-t border-line-soft">
                        <td className="py-3 pr-3 pl-5">
                          <div className="flex items-center gap-3">
                            <div
                              role="img"
                              aria-label={`${a.format} thumbnail placeholder`}
                              className="box-border flex h-[52px] w-[52px] shrink-0 items-end rounded-lg px-1.5 py-1 text-[10px] font-bold text-white"
                              style={{ background: AD_FORMAT_COLOR[a.format] }}
                            >
                              {a.format}
                            </div>
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="font-semibold">{a.name}</span>
                              <span className="text-ink-mute">
                                “{a.headline}” · button: {a.cta}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Pill
                            tone={
                              a.status === 'Active'
                                ? 'bg-[#DCF5E3] text-good'
                                : 'bg-[#EFEEED] text-[#52504D]'
                            }
                          >
                            {a.status}
                          </Pill>
                        </td>
                        <td className="px-3 py-3 text-right">{inr(a.spend)}</td>
                        <td className="px-3 py-3 text-right">{num(a.impressions)}</td>
                        <td className="px-3 py-3 text-right">{a.ctr.toFixed(2)}%</td>
                        <td className="px-3 py-3 text-right font-semibold text-plum">{num(a.leads)}</td>
                        <td className="py-3 pr-5 pl-3 text-right">{inr(a.spend / a.leads)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        )
      })}
    </>
  )
}
