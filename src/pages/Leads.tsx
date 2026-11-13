import { useMemo, useState } from 'react'
import type { Route } from '../components/Shell'
import { IconKanban, IconList, IconPlus } from '../components/icons'
import { Avatar, Card, PageHead, Pill, Select } from '../components/ui'
import { LEADS, STAGE_TOTALS } from '../data/mock'
import {
  COLLECTIONS,
  REPS,
  SOURCES,
  STAGES,
  STAGE_COLOR,
  TEMP_PILL,
  type Lead,
  type Stage,
} from '../data/types'

const CAMPAIGN_NAMES = [
  'Sannjh Bridal – Lead Form',
  'Uphaar Gifting – Messenger',
  'Regalia – Instagram DM',
  'Moksha Temple Decor – Lead Form',
  'New Traffic Campaign',
  'No campaign',
]

type Filters = {
  date: string
  campaign: string
  source: string
  stage: string
  status: string
  rep: string
  collection: string
}

const EMPTY: Filters = {
  date: 'This month',
  campaign: 'All',
  source: 'All',
  stage: 'All',
  status: 'All',
  rep: 'All',
  collection: 'All',
}

const DATE_SCOPE: Record<string, Lead['when'][]> = {
  Today: ['today'],
  'This week': ['today', 'week'],
  'This month': ['today', 'week', 'month'],
}

function useFilters(moved: Record<string, Stage> = {}) {
  const [f, setF] = useState<Filters>(EMPTY)
  const set = (k: keyof Filters) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const rows = useMemo(() => {
    const scope = DATE_SCOPE[f.date] ?? DATE_SCOPE['This month']
    return LEADS.map((l) => (moved[l.id] ? { ...l, stage: moved[l.id] } : l)).filter(
      (l) =>
        scope.includes(l.when) &&
        (f.campaign === 'All' || l.campaign === f.campaign) &&
        (f.source === 'All' || l.source === f.source) &&
        (f.stage === 'All' || l.stage === f.stage) &&
        (f.status === 'All' || l.status === f.status) &&
        (f.rep === 'All' || l.rep === f.rep) &&
        (f.collection === 'All' || l.collection === f.collection),
    )
  }, [f, moved])
  return { f, set, rows, reset: () => setF(EMPTY) }
}

function FilterBar({ f, set }: { f: Filters; set: (k: keyof Filters) => (v: string) => void }) {
  return (
    <Card className="flex flex-wrap items-end gap-3">
      <Select label="Date" value={f.date} options={['This month', 'Today', 'This week']} onChange={set('date')} />
      <Select label="Campaign" value={f.campaign} options={['All', ...CAMPAIGN_NAMES]} onChange={set('campaign')} />
      <Select label="Source" value={f.source} options={['All', ...SOURCES]} onChange={set('source')} />
      <Select label="Stage" value={f.stage} options={['All', ...STAGES]} onChange={set('stage')} />
      <Select label="Status" value={f.status} options={['All', 'Hot', 'Warm', 'Cold']} onChange={set('status')} />
      <Select label="Salesperson" value={f.rep} options={['All', ...Object.keys(REPS)]} onChange={set('rep')} />
      <Select label="Collection" value={f.collection} options={['All', ...COLLECTIONS]} onChange={set('collection')} />
    </Card>
  )
}

function ViewSwitch({ view, go }: { view: 'list' | 'kanban'; go: (r: Route) => void }) {
  const tab = (id: 'list' | 'kanban', route: Route, label: string, icon: React.ReactNode) => {
    const on = id === view
    return (
      <a
        href={`#/${route}`}
        aria-current={on ? 'page' : undefined}
        onClick={(e) => {
          e.preventDefault()
          go(route)
        }}
        className={`flex min-h-10 items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] no-underline ${
          on
            ? 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
            : 'font-medium text-ink-soft'
        }`}
      >
        {icon}
        {label}
      </a>
    )
  }
  return (
    <div role="group" aria-label="View" className="flex gap-1 rounded-xl bg-chip p-1">
      {tab('list', 'leads', 'List', <IconList />)}
      {tab('kanban', 'kanban', 'Kanban', <IconKanban />)}
    </div>
  )
}

function AddLead({ go }: { go: (r: Route) => void }) {
  return (
    <button
      type="button"
      onClick={() => go('lead')}
      className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 bg-rail px-4 text-sm font-semibold text-white"
    >
      <IconPlus />
      Add lead
    </button>
  )
}

export function LeadsList({ go }: { go: (r: Route) => void }) {
  const { f, set, rows } = useFilters()
  return (
    <>
      <PageHead
        title="Leads"
        sub={`${rows.length} of ${LEADS.length} sample leads shown · every lead keeps its campaign, ad set and source`}
      >
        <ViewSwitch view="list" go={go} />
        <AddLead go={go} />
      </PageHead>

      <FilterBar f={f} set={set} />

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                <th scope="col" className="px-5 py-3 font-medium">Lead</th>
                <th scope="col" className="px-3 py-3 font-medium">Stage</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-3 py-3 font-medium">Source</th>
                <th scope="col" className="px-3 py-3 font-medium">Campaign</th>
                <th scope="col" className="px-3 py-3 font-medium">Salesperson</th>
                <th scope="col" className="px-3 py-3 font-medium">Received</th>
                <th scope="col" className="px-5 py-3 font-medium">What happens next</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const [initials, bg] = REPS[l.rep]
                return (
                  <tr key={l.id} className="border-t border-line-soft align-top">
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <a
                          href="#/lead"
                          onClick={(e) => {
                            e.preventDefault()
                            go('lead')
                          }}
                          className="font-semibold text-ink no-underline"
                        >
                          {l.name}
                        </a>
                        <span className="text-xs text-ink-mute">{l.phone}</span>
                        <span className="text-xs text-ink-mute">{l.collection}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                          style={{ background: STAGE_COLOR[l.stage] }}
                        />
                        {l.stage}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={TEMP_PILL[l.status]}>{l.status}</Pill>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{l.source}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-ink-soft">{l.campaign}</span>
                        <span className="text-xs text-ink-mute">{l.adset}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <Avatar initials={initials} bg={bg} />
                        {l.rep}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{l.received}</td>
                    <td
                      className={`px-5 py-3 ${l.late ? 'font-semibold text-bad' : 'text-ink'}`}
                    >
                      {l.next}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className="m-0 px-5 py-8 text-center text-sm text-ink-mute">
            No leads match these filters.
          </p>
        ) : null}
      </Card>
    </>
  )
}

export function LeadsKanban({ go }: { go: (r: Route) => void }) {
  const [moved, setMoved] = useState<Record<string, Stage>>({})
  const [over, setOver] = useState<Stage | null>(null)
  const { f, set, rows } = useFilters(moved)

  const drop = (stage: Stage) => (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(null)
    if (id) setMoved((p) => ({ ...p, [id]: stage }))
  }

  return (
    <>
      <PageHead
        title="Leads"
        sub="Drag a card to another column to change its stage. Moving out of Messaged asks for the message that was sent; moving to Purchased asks what they bought."
      >
        <ViewSwitch view="kanban" go={go} />
        <AddLead go={go} />
      </PageHead>

      <FilterBar f={f} set={set} />

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-start gap-3">
          {STAGES.map((stage) => {
            const cards = rows.filter((l) => l.stage === stage)
            const total = STAGE_TOTALS[stage]
            const more = total - cards.length
            return (
              <section
                key={stage}
                aria-label={stage}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (over !== stage) setOver(stage)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
                }}
                onDrop={drop(stage)}
                className={`box-border flex flex-[0_0_250px] flex-col gap-2.5 rounded-[14px] bg-well p-3 ${
                  over === stage ? 'outline-2 outline-dashed outline-rail' : ''
                }`}
              >
                <div className="flex items-center gap-2 px-1 pt-0.5 pb-1">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-[3px]"
                    style={{ background: STAGE_COLOR[stage] }}
                  />
                  <h2 className="m-0 text-sm font-semibold">{stage}</h2>
                  <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                    {total}
                  </span>
                </div>

                {cards.map((k) => {
                  const [initials, bg] = REPS[k.rep]
                  return (
                    <article
                      key={k.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', k.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={() => setOver(null)}
                      className="flex cursor-grab flex-col gap-2 rounded-xl border border-[#E2DCD8] bg-surface p-3 active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href="#/lead"
                          draggable={false}
                          onClick={(e) => {
                            e.preventDefault()
                            go('lead')
                          }}
                          className="text-sm font-semibold text-ink no-underline"
                        >
                          {k.name}
                        </a>
                        <Pill tone={TEMP_PILL[k.status]}>{k.status}</Pill>
                      </div>
                      <span className="text-xs text-ink-mute">
                        {k.collection} · {k.source}
                      </span>
                      <span className={`text-xs ${k.late ? 'font-semibold text-bad' : 'text-ink'}`}>
                        {k.next}
                      </span>
                      <div className="flex items-center gap-2 border-t border-line-soft pt-2">
                        <Avatar initials={initials} bg={bg} />
                        <span className="text-xs text-[#3F3A36]">{k.rep}</span>
                        <span className="ml-auto text-xs text-ink-mute">{k.received}</span>
                      </div>
                    </article>
                  )
                })}

                {more > 0 ? (
                  <a
                    href="#/leads"
                    onClick={(e) => {
                      e.preventDefault()
                      go('leads')
                    }}
                    className="px-1 py-1.5 text-[13px] font-semibold"
                  >
                    Show {more} more
                  </a>
                ) : null}
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}
