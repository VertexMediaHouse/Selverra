import { useMemo, useState } from 'react'
import type { Route } from '../components/Shell'
import {
  IconExport,
  IconImport,
  IconKanban,
  IconList,
  IconPlus,
  IconSearch,
} from '../components/icons'
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

const AD_SETS = [
  'Brides-to-be 22–32 · Ahmedabad',
  'Lookalike 1% – past buyers',
  'Festive gifting · Gujarat',
]

/** The quick chips above the dropdowns. Each one is a saved slice of the filters. */
const QUICK: { id: string; label: string; match?: (l: Lead) => boolean }[] = [
  { id: 'all', label: 'All leads' },
  { id: 'new', label: 'New leads', match: (l) => l.stage === 'New lead' },
  { id: 'unassigned', label: 'Unassigned', match: (l) => l.rep === 'Unassigned' },
  { id: 'hot', label: 'Hot leads', match: (l) => l.status === 'Hot' },
  { id: 'visits', label: 'Visits scheduled', match: (l) => l.stage === 'Visit scheduled' },
  { id: 'purchased', label: 'Purchased', match: (l) => l.stage === 'Purchased' },
  { id: 'future', label: 'Future contact', match: (l) => l.stage === 'Future contact' },
]

type Filters = {
  date: string
  campaign: string
  adset: string
  source: string
  stage: string
  status: string
  rep: string
  collection: string
}

const EMPTY: Filters = {
  date: 'This month',
  campaign: 'All',
  adset: 'All',
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
  const [q, setQ] = useState('')
  const [quick, setQuick] = useState('all')
  const set = (k: keyof Filters) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  const rows = useMemo(() => {
    const scope = DATE_SCOPE[f.date] ?? DATE_SCOPE['This month']
    const needle = q.trim().toLowerCase()
    const chip = QUICK.find((c) => c.id === quick)?.match
    return LEADS.map((l) => (moved[l.id] ? { ...l, stage: moved[l.id] } : l)).filter(
      (l) =>
        scope.includes(l.when) &&
        (!chip || chip(l)) &&
        (needle === '' ||
          l.name.toLowerCase().includes(needle) ||
          l.phone.toLowerCase().includes(needle) ||
          l.source.toLowerCase().includes(needle)) &&
        (f.campaign === 'All' || l.campaign === f.campaign) &&
        (f.adset === 'All' || l.adset === f.adset) &&
        (f.source === 'All' || l.source === f.source) &&
        (f.stage === 'All' || l.stage === f.stage) &&
        (f.status === 'All' || l.status === f.status) &&
        (f.rep === 'All' || l.rep === f.rep) &&
        (f.collection === 'All' || l.collection === f.collection),
    )
  }, [f, q, quick, moved])

  const dirty = q !== '' || quick !== 'all' || (Object.keys(f) as (keyof Filters)[]).some((k) => f[k] !== EMPTY[k])
  const reset = () => {
    setF(EMPTY)
    setQ('')
    setQuick('all')
  }
  return { f, set, rows, q, setQ, quick, setQuick, dirty, reset }
}

type Bar = ReturnType<typeof useFilters>

function FilterBar({ bar }: { bar: Bar }) {
  const { f, set, q, setQ, quick, setQuick, dirty, reset } = bar
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative w-[300px] shrink-0">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-mute">
            <IconSearch />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search leads"
            placeholder="Search name, phone or Instagram handle"
            className="min-h-10 w-full rounded-[10px] border border-[#DCD5D1] bg-surface py-0 pr-3 pl-9 text-[13px] text-ink placeholder:text-ink-mute"
          />
        </div>

        <div role="group" aria-label="Quick filters" className="flex flex-wrap items-center gap-2">
          {QUICK.map((c) => {
            const on = c.id === quick
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setQuick(c.id)}
                className={`min-h-10 cursor-pointer whitespace-nowrap rounded-full px-4 text-[13px] ${
                  on
                    ? 'border-0 bg-ink font-semibold text-white'
                    : 'border border-[#DCD5D1] bg-surface font-medium text-ink-soft'
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select label="Date" value={f.date} options={['This month', 'Today', 'This week']} onChange={set('date')} />
        <Select label="Campaign" value={f.campaign} options={['All', ...CAMPAIGN_NAMES]} onChange={set('campaign')} />
        <Select label="Ad set" value={f.adset} options={['All', ...AD_SETS]} onChange={set('adset')} />
        <Select label="Source" value={f.source} options={['All', ...SOURCES]} onChange={set('source')} />
        <Select label="Stage" value={f.stage} options={['All', ...STAGES]} onChange={set('stage')} />
        <Select label="Status" value={f.status} options={['All', 'Hot', 'Warm', 'Cold']} onChange={set('status')} />
        <Select label="Salesperson" value={f.rep} options={['All', ...Object.keys(REPS)]} onChange={set('rep')} />
        <Select label="Collection" value={f.collection} options={['All', ...COLLECTIONS]} onChange={set('collection')} />
        {dirty ? (
          <button
            type="button"
            onClick={reset}
            className="min-h-10 cursor-pointer border-0 bg-transparent px-1 text-[13px] font-semibold text-plum underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </Card>
  )
}

/** Import / Export, shown beside the view switch in both views. */
function HeadActions({ go }: { go: (r: Route) => void }) {
  const btn =
    'flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#DCD5D1] bg-surface px-3.5 text-sm font-semibold text-ink-soft'
  return (
    <>
      <button type="button" className={btn}>
        <IconImport />
        Import
      </button>
      <button type="button" className={btn}>
        <IconExport />
        Export
      </button>
      <AddLead go={go} />
    </>
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
  const bar = useFilters()
  const { rows } = bar
  const [picked, setPicked] = useState<Record<string, true>>({})

  const shown = rows.map((l) => l.id)
  const pickedHere = shown.filter((id) => picked[id])
  const allOn = shown.length > 0 && pickedHere.length === shown.length
  const toggleAll = () =>
    setPicked(allOn ? {} : Object.fromEntries(shown.map((id) => [id, true as const])))
  const toggle = (id: string) =>
    setPicked((p) => {
      const { [id]: had, ...rest } = p
      return had ? rest : { ...rest, [id]: true }
    })

  return (
    <>
      <PageHead
        title="Leads"
        sub="Every enquiry from ads, DMs, comments, website, walk-ins and imports in one place"
      >
        <ViewSwitch view="list" go={go} />
        <HeadActions go={go} />
      </PageHead>

      <FilterBar bar={bar} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-ink-mute">
          <strong className="font-semibold text-ink">{rows.length} leads</strong> match these filters
          (sample rows)
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={pickedHere.length === 0}
            className="min-h-10 cursor-pointer rounded-[10px] border border-[#DCD5D1] bg-surface px-3.5 text-[13px] font-semibold text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Assign selected to…
          </button>
          <button
            type="button"
            disabled={pickedHere.length === 0}
            className="min-h-10 cursor-pointer rounded-[10px] border border-[#DCD5D1] bg-surface px-3.5 text-[13px] font-semibold text-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Change stage…
          </button>
          <button
            type="button"
            className="min-h-10 cursor-pointer rounded-[10px] border border-[#DCD5D1] bg-surface px-3.5 text-[13px] font-semibold text-ink-soft"
          >
            Export these {rows.length}
          </button>
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                <th scope="col" className="w-10 px-5 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={allOn}
                    onChange={toggleAll}
                    aria-label="Select all shown leads"
                    className="h-4 w-4 cursor-pointer accent-rail"
                  />
                </th>
                <th scope="col" className="px-3 py-3 font-medium">Lead</th>
                <th scope="col" className="px-3 py-3 font-medium">Source</th>
                <th scope="col" className="px-3 py-3 font-medium">Campaign · Ad set</th>
                <th scope="col" className="px-3 py-3 font-medium">Collection</th>
                <th scope="col" className="px-3 py-3 font-medium">Stage</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-3 py-3 font-medium">Salesperson</th>
                <th scope="col" className="px-3 py-3 font-medium">Received</th>
                <th scope="col" className="px-5 py-3 font-medium">Next step</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const [initials, bg] = REPS[l.rep]
                return (
                  <tr key={l.id} className="border-t border-line-soft align-top">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={!!picked[l.id]}
                        onChange={() => toggle(l.id)}
                        aria-label={`Select ${l.name}`}
                        className="h-4 w-4 cursor-pointer accent-rail"
                      />
                    </td>
                    <td className="px-3 py-3">
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
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block rounded-md bg-chip px-2 py-1 text-xs text-ink-soft">
                        {l.source}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <a
                          href="#/campaigns"
                          onClick={(e) => {
                            e.preventDefault()
                            go('campaigns')
                          }}
                          className="font-medium text-plum no-underline"
                        >
                          {l.campaign}
                        </a>
                        <span className="text-xs text-plum/70">{l.adset}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{l.collection}</td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          background: `${STAGE_COLOR[l.stage]}1A`,
                          color: STAGE_COLOR[l.stage],
                        }}
                      >
                        {l.stage}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={TEMP_PILL[l.status]}>{l.status}</Pill>
                    </td>
                    <td
                      className={`px-3 py-3 ${l.rep === 'Unassigned' ? 'font-semibold text-bad' : ''}`}
                    >
                      {l.rep === 'Unassigned' ? (
                        'Unassigned'
                      ) : (
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <Avatar initials={initials} bg={bg} />
                          {l.rep}
                        </span>
                      )}
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
  const bar = useFilters(moved)
  const { rows } = bar

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
        <HeadActions go={go} />
      </PageHead>

      <FilterBar bar={bar} />

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
