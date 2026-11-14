import { useState, type ReactNode } from 'react'
import { Avatar, Card, Pill, Toast } from '../components/ui'
import { LEADS, STAGE_TOTALS, SYNC, TEAMS } from '../data/mock'
import { COLLECTIONS, REPS, STAGES, STAGE_COLOR, type Stage } from '../data/types'

const SELECT =
  'min-h-10 rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink'
const BTN_DARK = 'min-h-10 rounded-[10px] bg-[#2B2724] px-4 text-[13px] font-medium text-white'
const BTN_LIGHT =
  'min-h-10 rounded-[10px] border border-[#DCD5D1] bg-surface px-4 text-[13px] font-medium text-ink'
const ICON_BTN =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-[13px] text-ink-soft disabled:opacity-30'

/** Dark save strip. Click shows "Saving…", then "Saved ✓" and a toast with `done`. */
export function SaveBar({ text, label, done }: { text: string; label: string; done: string }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const save = () => {
    setState('saving')
    // ponytail: fake delay, swap for the real API call when there is a backend
    window.setTimeout(() => {
      setState('saved')
      window.setTimeout(() => setState('idle'), 4000)
    }, 600)
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#2B2724] px-5 py-3.5 text-[13px] text-white">
        <span>{text}</span>
        <button
          type="button"
          onClick={save}
          disabled={state === 'saving'}
          className="min-h-10 min-w-[132px] rounded-[10px] bg-white px-4 text-[13px] font-medium text-[#2B2724] disabled:cursor-wait disabled:opacity-70"
        >
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved ✓' : label}
        </button>
      </div>
      {state === 'saved' ? <Toast text={done} onDismiss={() => setState('idle')} /> : null}
    </>
  )
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-xs text-ink-mute">{hint}</div>
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pipeline stages                                                     */
/* ------------------------------------------------------------------ */

type StageKind = 'Working' | 'Won' | 'Closed' | 'Parked'
type StageRow = { id: string; name: string; color: string; kind: StageKind; followUp: string; leads: number }

const KIND_PILL: Record<StageKind, string> = {
  Working: 'bg-[#E6F3FA] text-[#0B5A80]',
  Won: 'bg-[#E7F5EC] text-[#1E6B3A]',
  Closed: 'bg-[#EFEEED] text-[#52504D]',
  Parked: 'bg-[#DDF3F1] text-[#0F5F58]',
}
const KIND_OF = (s: Stage): StageKind =>
  s === 'Purchased' ? 'Won' : s === 'No reply' || s === 'Not interested' ? 'Closed' : s === 'Future contact' ? 'Parked' : 'Working'
const FOLLOW_UP: Partial<Record<Stage, string>> = {
  'New lead': 'Within 15 minutes',
  Messaged: 'Next day',
  'Call 1': 'After 2 days',
  'Call 2': 'After 2 days',
  'Call 3': 'After 3 days',
  'Call 4': 'After 3 days',
  'Visit scheduled': 'Day before visit',
  'Future contact': 'On the chosen date',
}
const FOLLOW_OPTIONS = ['No task', 'Within 15 minutes', 'Within 1 hour', 'Next day', 'After 2 days', 'After 3 days', 'After 1 week', 'Day before visit', 'On the chosen date']

export function PipelineStages() {
  const [rows, setRows] = useState<StageRow[]>(
    STAGES.map((s) => ({ id: s, name: s, color: STAGE_COLOR[s], kind: KIND_OF(s), followUp: FOLLOW_UP[s] ?? 'No task', leads: STAGE_TOTALS[s] })),
  )
  const set = (id: string, patch: Partial<StageRow>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const move = (i: number, d: number) =>
    setRows((all) => {
      const next = [...all]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-0">
        <div className="px-5 py-4">
          <h2 className="m-0 text-base font-semibold">Pipeline stages</h2>
          <p className="mt-0.5 mb-0 text-[13px] text-ink-mute">
            Columns on the Leads board, in this order. Each stage can create a follow-up task for the salesperson on its own.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                <th scope="col" className="w-[84px] px-5 py-2.5 font-medium">Order</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Stage name</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Counts as</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Automatic follow-up task</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Leads now</th>
                <th scope="col" className="px-5 py-2.5"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-line-soft">
                  <td className="px-5 py-2.5">
                    <span className="flex gap-1">
                      <button type="button" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(i, -1)} className={ICON_BTN}>↑</button>
                      <button type="button" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className={ICON_BTN}>↓</button>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <input type="color" aria-label={`${r.name} colour`} value={r.color} onChange={(e) => set(r.id, { color: e.target.value })} className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                      <input aria-label="Stage name" value={r.name} onChange={(e) => set(r.id, { name: e.target.value })} className={`${SELECT} w-full min-w-[150px] font-medium`} />
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <select aria-label={`${r.name} counts as`} value={r.kind} onChange={(e) => set(r.id, { kind: e.target.value as StageKind })} className={`${SELECT} w-[120px]`}>
                      {(Object.keys(KIND_PILL) as StageKind[]).map((k) => <option key={k}>{k}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select aria-label={`${r.name} follow-up`} value={r.followUp} onChange={(e) => set(r.id, { followUp: e.target.value })} className={`${SELECT} w-[190px]`}>
                      {FOLLOW_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.leads}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={r.leads > 0}
                      title={r.leads > 0 ? 'Move its leads to another stage first' : undefined}
                      onClick={() => setRows((all) => all.filter((x) => x.id !== r.id))}
                      className="text-[13px] font-medium text-bad disabled:cursor-not-allowed disabled:text-ink-mute disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5">
          <div className="flex flex-wrap gap-2 text-xs text-ink-mute">
            {(Object.keys(KIND_PILL) as StageKind[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <Pill tone={KIND_PILL[k]}>{k}</Pill>
                {{ Working: 'still being followed up', Won: 'counts as a sale', Closed: 'lost, no more tasks', Parked: 'come back later' }[k]}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRows((all) => [...all, { id: `new-${all.length}`, name: 'New stage', color: '#8A817C', kind: 'Working', followUp: 'No task', leads: 0 }])}
            className={BTN_LIGHT}
          >
            + Add stage
          </button>
        </div>
      </Card>
      <SaveBar text="Renaming a stage keeps every lead in it. Removing needs the stage to be empty." label="Save stages" done="Pipeline stages saved. The Leads board now uses the new order." />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Lead assignment                                                     */
/* ------------------------------------------------------------------ */

const METHODS = [
  { id: 'team', label: 'By collection, then take turns', hint: 'Lead goes to the team that owns its collection. Inside the team, salespeople take turns.' },
  { id: 'turns', label: 'Take turns across everyone', hint: 'Ignore collections. Every active salesperson gets the next lead in order.' },
  { id: 'manual', label: 'Manager assigns by hand', hint: 'New leads wait as Unassigned until a manager picks someone.' },
] as const
type Method = (typeof METHODS)[number]['id']

const SALES = Object.keys(REPS).filter((r) => r !== 'Unassigned')
const teamOf = (rep: string) => TEAMS.find((t) => t.members.includes(rep))?.name ?? '—'

export function LeadAssignment() {
  const [method, setMethod] = useState<Method>('team')
  const [pool, setPool] = useState(() =>
    SALES.map((rep) => ({ rep, on: rep !== 'Ravi Mehta', cap: rep === 'Neha Shah' ? '20' : '15', today: LEADS.filter((l) => l.rep === rep && l.when === 'today').length })),
  )
  const [reassignAfter, setReassignAfter] = useState('1 hour')
  const [offHours, setOffHours] = useState('Hold until 10:00 AM')
  const [walkIns, setWalkIns] = useState(true)
  const waiting = LEADS.filter((l) => l.rep === 'Unassigned').length

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-0">
        <div className="px-5 py-4">
          <h2 className="m-0 text-base font-semibold">How new leads are shared</h2>
          <p className="mt-0.5 mb-0 text-[13px] text-ink-mute">
            Applies to every lead that arrives from Meta, the website or an import. {waiting} leads are waiting as Unassigned right now.
          </p>
        </div>
        {METHODS.map((m) => (
          <label key={m.id} className="flex cursor-pointer items-start gap-3 border-t border-line-soft px-5 py-3.5">
            <input type="radio" name="assign-method" checked={method === m.id} onChange={() => setMethod(m.id)} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--color-plum,#7A1F3D)]" />
            <span>
              <span className="block text-[13px] font-medium">{m.label}</span>
              <span className="block text-xs text-ink-mute">{m.hint}</span>
            </span>
          </label>
        ))}
      </Card>

      {method !== 'manual' ? (
        <Card className="p-0">
          <div className="px-5 py-4">
            <h2 className="m-0 text-base font-semibold">Who gets leads</h2>
            <p className="mt-0.5 mb-0 text-[13px] text-ink-mute">
              Switch someone off for leave or training. When everyone hits their daily limit, extra leads go to the team manager.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                  <th scope="col" className="px-5 py-2.5 font-medium">Salesperson</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Team</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Gets new leads</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Daily limit</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Got today</th>
                </tr>
              </thead>
              <tbody>
                {pool.map((p) => {
                  const [initials, bg] = REPS[p.rep]
                  const upd = (patch: Partial<typeof p>) => setPool((all) => all.map((x) => (x.rep === p.rep ? { ...x, ...patch } : x)))
                  return (
                    <tr key={p.rep} className="border-t border-line-soft">
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <Avatar initials={initials} bg={bg} />
                          <span className="font-semibold">{p.rep}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">{teamOf(p.rep)}</td>
                      <td className="px-3 py-2.5">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input type="checkbox" checked={p.on} onChange={(e) => upd({ on: e.target.checked })} className="h-[18px] w-[18px] accent-[var(--color-plum,#7A1F3D)]" />
                          <span className={p.on ? 'font-medium text-good' : 'text-ink-mute'}>{p.on ? 'Yes' : 'Paused'}</span>
                        </label>
                      </td>
                      <td className="px-3 py-2.5">
                        <select aria-label={`${p.rep} daily limit`} value={p.cap} disabled={!p.on} onChange={(e) => upd({ cap: e.target.value })} className={`${SELECT} w-[120px] disabled:opacity-50`}>
                          {['5', '10', '15', '20', '30', 'No limit'].map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{p.today}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card className="p-0">
        <div className="px-5 py-4">
          <h2 className="m-0 text-base font-semibold">Rules</h2>
        </div>
        <Row label="Reassign if nobody replies" hint="Lead moves to the next person and the manager is told">
          <select aria-label="Reassign after" value={reassignAfter} onChange={(e) => setReassignAfter(e.target.value)} className={`${SELECT} w-[172px]`}>
            {['30 minutes', '1 hour', '2 hours', '4 hours', 'Never'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Row>
        <Row label="Leads that arrive after store hours" hint="Store hours are 10:00 AM to 8:00 PM">
          <select aria-label="After hours" value={offHours} onChange={(e) => setOffHours(e.target.value)} className={`${SELECT} w-[172px]`}>
            {['Hold until 10:00 AM', 'Assign right away'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Row>
        <Row label="Walk-ins stay with whoever added them" hint="Leads added by hand skip the turn order">
          <input type="checkbox" aria-label="Walk-ins stay with whoever added them" checked={walkIns} onChange={(e) => setWalkIns(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--color-plum,#7A1F3D)]" />
        </Row>
      </Card>

      <SaveBar text="New rules apply to the next lead that arrives. Leads already assigned stay where they are." label="Save assignment" done="Assignment rules saved. They apply from the next new lead." />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

const ownerTeam = (c: string) => TEAMS.find((t) => t.collections.includes(c))?.name ?? ''
const formsFor = (c: string) => SYNC.forms.filter((f) => f.name.toLowerCase().includes(c.toLowerCase()))

export function Collections() {
  const [rows, setRows] = useState(() =>
    COLLECTIONS.map((name) => ({
      name,
      team: ownerTeam(name),
      words: name.toLowerCase(),
      on: true,
      leads: LEADS.filter((l) => l.collection === name).length,
    })),
  )
  const [adding, setAdding] = useState('')
  const noTeam = rows.filter((r) => r.on && !r.team).length
  const set = (name: string, patch: Partial<(typeof rows)[number]>) => setRows((all) => all.map((r) => (r.name === name ? { ...r, ...patch } : r)))

  return (
    <div className="flex flex-col gap-4">
      {noTeam ? (
        <p className="m-0 rounded-xl border border-[#F5D9A8] bg-[#FEF6E7] px-5 py-3 text-[13px] text-[#7A4A06]">
          {noTeam} collections have no team. Their leads land as Unassigned and wait for a manager.
        </p>
      ) : null}
      <Card className="p-0">
        <div className="px-5 py-4">
          <h2 className="m-0 text-base font-semibold">Collections</h2>
          <p className="mt-0.5 mb-0 text-[13px] text-ink-mute">
            Every lead belongs to one collection. The collection decides which team gets the lead. Match words are looked for in the Meta form's "Interested Item" answer.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                <th scope="col" className="px-5 py-2.5 font-medium">Collection</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Handled by team</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Match words</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Meta forms</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Leads</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Shown in lists</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const forms = formsFor(r.name)
                return (
                  <tr key={r.name} className={`border-t border-line-soft ${r.on ? '' : 'opacity-60'}`}>
                    <td className="px-5 py-2.5 font-semibold">{r.name}</td>
                    <td className="px-3 py-2.5">
                      <select aria-label={`${r.name} team`} value={r.team} onChange={(e) => set(r.name, { team: e.target.value })} className={`${SELECT} w-[190px] ${r.team ? '' : 'text-[#9A2A1C]'}`}>
                        <option value="">No team · Unassigned</option>
                        {TEAMS.map((t) => <option key={t.name}>{t.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <input aria-label={`${r.name} match words`} value={r.words} onChange={(e) => set(r.name, { words: e.target.value })} placeholder="comma separated" className={`${SELECT} w-[200px]`} />
                    </td>
                    <td className="px-3 py-2.5">
                      {forms.length ? (
                        forms.map((f) => (
                          <Pill key={f.name} tone={f.mapped ? 'bg-[#E7F5EC] text-[#1E6B3A]' : 'bg-[#FEF3C7] text-[#7A4A06]'}>
                            {f.mapped ? f.name : `${f.name} · not linked`}
                          </Pill>
                        ))
                      ) : (
                        <span className="text-ink-mute">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.leads}</td>
                    <td className="px-5 py-2.5 text-right">
                      <input type="checkbox" aria-label={`Show ${r.name}`} checked={r.on} onChange={(e) => set(r.name, { on: e.target.checked })} className="h-[18px] w-[18px] accent-[var(--color-plum,#7A1F3D)]" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <form
          className="flex flex-wrap items-end gap-3 border-t border-line-soft px-5 py-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            const name = adding.trim()
            if (!name || rows.some((r) => r.name.toLowerCase() === name.toLowerCase())) return
            setRows((all) => [...all, { name, team: '', words: name.toLowerCase(), on: true, leads: 0 }])
            setAdding('')
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-mute">
            New collection
            <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="e.g. Utsav" className={`${SELECT} w-[220px]`} />
          </label>
          <button type="submit" className={BTN_DARK}>Add collection</button>
          <p className="m-0 max-w-[300px] text-xs text-ink-mute">Hiding a collection keeps its leads. It only stops it showing in filters and new-lead forms.</p>
        </form>
      </Card>
      <SaveBar text="Changing a team only affects new leads. Existing leads keep their salesperson." label="Save collections" done="Collections saved." />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

type Conn = {
  id: string
  name: string
  what: string
  status: 'Connected' | 'Needs attention' | 'Not connected'
  details: [string, string][]
}

const CONN_PILL: Record<Conn['status'], string> = {
  Connected: 'bg-[#E7F5EC] text-[#1E6B3A]',
  'Needs attention': 'bg-[#FEF3C7] text-[#7A4A06]',
  'Not connected': 'bg-[#EFEEED] text-[#52504D]',
}

const unmapped = SYNC.forms.filter((f) => !f.mapped).length
const CONNECTIONS: Conn[] = [
  {
    id: 'meta',
    name: 'Meta ad account',
    what: 'Pulls leads from Instant Forms, Messenger and Instagram DMs, plus campaign spend and results.',
    status: unmapped ? 'Needs attention' : 'Connected',
    details: [
      ['Account', SYNC.account],
      ['Pages', SYNC.pages.join(', ')],
      ['Lead forms', `${SYNC.forms.length} found · ${unmapped} not linked to a collection`],
      ['Last sync', `${SYNC.lastSync} · next ${SYNC.nextSync}`],
      ['Connected by', 'Hardik Shah · token renews 2 Jan 2027'],
    ],
  },
  {
    id: 'sheet',
    name: 'Google Sheet backup',
    what: 'Every lead and every change is copied to a Google Sheet, including deleted leads.',
    status: 'Connected',
    details: [
      ['Sheet', 'Selverra CRM backup · 2026'],
      ['Google account', 'hardik@selverra.example'],
      ['Last copy', 'Today, 10:31 AM · 5,214 rows'],
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    what: 'Send the first message to new leads and log replies on the lead timeline.',
    status: 'Not connected',
    details: [],
  },
]

export function Connections({ onOpenSync }: { onOpenSync: () => void }) {
  const [freq, setFreq] = useState('Every hour')
  return (
    <div className="flex flex-col gap-4">
      {CONNECTIONS.map((c) => (
        <Card key={c.id} className="p-0">
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
            <div className="min-w-0 max-w-[560px]">
              <span className="flex items-center gap-2">
                <h2 className="m-0 text-base font-semibold">{c.name}</h2>
                <Pill tone={CONN_PILL[c.status]}>{c.status}</Pill>
              </span>
              <p className="mt-0.5 mb-0 text-[13px] text-ink-mute">{c.what}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.status === 'Not connected' ? (
                <button type="button" className={BTN_DARK}>Connect</button>
              ) : (
                <>
                  {c.id === 'meta' ? <button type="button" onClick={onOpenSync} className={BTN_LIGHT}>Open Sync Data</button> : null}
                  <button type="button" className={BTN_LIGHT}>Reconnect</button>
                  <button type="button" className="min-h-10 rounded-[10px] px-3 text-[13px] font-medium text-bad">Disconnect</button>
                </>
              )}
            </div>
          </div>
          {c.details.length ? (
            <dl className="m-0 grid gap-x-6 border-t border-line-soft px-5 py-3.5 text-[13px] sm:grid-cols-[140px_minmax(0,1fr)]">
              {c.details.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="py-1 text-ink-mute">{k}</dt>
                  <dd className="m-0 py-1 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {c.id === 'meta' ? (
            <Row label="How often to pull new leads" hint="More often means faster first replies">
              <select aria-label="Sync frequency" value={freq} onChange={(e) => setFreq(e.target.value)} className={`${SELECT} w-[172px]`}>
                {['Every 15 minutes', 'Every 30 minutes', 'Every hour', 'Every 3 hours'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </Row>
          ) : null}
        </Card>
      ))}
      <p className="m-0 text-xs text-ink-mute">
        Only owners can connect or disconnect accounts. Disconnecting stops new data coming in. Nothing already in the CRM is deleted.
      </p>
    </div>
  )
}
