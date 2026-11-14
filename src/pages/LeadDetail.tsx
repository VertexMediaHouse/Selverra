import { useState } from 'react'
import type { Route } from '../components/Shell'
import { IconBack, IconCalendar, IconPhone, IconPlus } from '../components/icons'
import { Card, CardHead, Pill, Select, Toast } from '../components/ui'
import { LEAD_DETAIL, MEMBERS } from '../data/mock'
import { COLLECTIONS, STAGES, STAGE_COLOR, TEMP_PILL, type Stage, type Temp } from '../data/types'

const L = LEAD_DETAIL

/** The stages a lead walks through in order. The rest are outcomes, shown apart. */
const PATH: Stage[] = [
  'New lead',
  'Messaged',
  'Call 1',
  'Call 2',
  'Call 3',
  'Call 4',
  'Visit scheduled',
  'Purchased',
]
const OUTCOMES: Stage[] = ['No reply', 'Not interested', 'Future contact']

const SALES = MEMBERS.filter((m) => m.role === 'Salesperson').map((m) => m.name)

/** A row of the contact card. A missing value reads as a prompt, not as data. */
function Row({
  label,
  value,
  chip,
  action,
}: {
  label: string
  value: string | null
  chip?: string
  action: string
}) {
  return (
    <div className="grid items-center gap-3 border-t border-line-soft py-2.5 first:border-0 first:pt-0 [grid-template-columns:minmax(110px,150px)_1fr_auto]">
      <dt className={`text-[13px] ${value ? 'text-ink-mute' : 'text-plum'}`}>{label}</dt>
      <dd
        className={`m-0 min-w-0 truncate text-[13px] ${value ? 'font-medium text-ink' : 'text-ink-mute'}`}
      >
        {value ?? 'Not shared yet'}
      </dd>
      <div className="flex items-center gap-2">
        {chip ? (
          <span className="whitespace-nowrap rounded-md bg-chip px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {chip}
          </span>
        ) : null}
        <button
          type="button"
          className="min-h-8 cursor-pointer whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 text-[12px] font-semibold text-ink"
        >
          {action}
        </button>
      </div>
    </div>
  )
}

export default function LeadDetail({
  go,
  moved,
  setMoved,
}: {
  go: (r: Route) => void
  moved: Record<string, Stage>
  setMoved: (f: (p: Record<string, Stage>) => Record<string, Stage>) => void
}) {
  // A drag on the kanban wins over the mock's own stage.
  const stage = moved[L.id] ?? L.stage
  const setStage = (next: Stage) => setMoved((p) => ({ ...p, [L.id]: next }))
  const [pick, setPick] = useState<Stage>(
    PATH[Math.min(PATH.indexOf(stage) + 1, PATH.length - 1)],
  )
  const [rep, setRep] = useState(L.rep)
  const [status, setStatus] = useState<Temp>(L.status)
  const [collection, setCollection] = useState(L.collection)
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState(L.notes)
  const [toast, setToast] = useState<string | null>(null)

  const reached = PATH.indexOf(stage)

  const addNote = () => {
    const text = note.trim()
    if (!text) return
    setNotes((n) => [{ at: 'Just now', who: rep, text }, ...n])
    setNote('')
    setToast('Note saved on this lead.')
  }

  const changeStage = () => {
    if (pick === stage) return
    setStage(pick)
    setToast(
      pick === 'Purchased'
        ? 'Moved to Purchased. Add what they bought and the amount.'
        : 'Moved to ' + pick + '. The next follow-up task was created.',
    )
  }

  return (
    <>
      <a
        href="#/leads"
        onClick={(e) => {
          e.preventDefault()
          go('leads')
        }}
        className="inline-flex min-h-8 items-center gap-1.5 text-[13px] font-semibold no-underline"
      >
        <IconBack />
        All leads
      </a>

      {/* Header: who they are, how far they have come, and the one stage control. */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="m-0 text-2xl font-bold">{L.name}</h1>
              <Pill tone={TEMP_PILL[status]}>{status}</Pill>
              <span className="flex items-center gap-2 rounded-md bg-[#F3F0EE] px-2 py-1 text-xs font-medium text-[#3F3A36]">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-[2px]"
                  style={{ background: STAGE_COLOR[stage] }}
                />
                {stage}
              </span>
            </div>
            <p className="m-0 text-sm text-ink-soft">
              {L.phone ?? 'No phone yet'} · {L.instagram} · {collection} delicate
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink"
            >
              <IconPhone />
              Add phone to call
            </button>
            <button
              type="button"
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink"
            >
              <IconCalendar size={16} />
              Schedule visit
            </button>
            <button
              type="button"
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-rail px-3.5 text-[13px] font-semibold text-white"
            >
              <IconPlus />
              Add task
            </button>
          </div>
        </div>

        {/* Stage track: one segment per stage, filled up to the one reached. */}
        <ol className="m-0 grid list-none gap-2 p-0 [grid-template-columns:repeat(auto-fit,minmax(74px,1fr))]">
          {PATH.map((s, i) => (
            <li key={s} className="flex flex-col gap-1.5">
              <span
                aria-hidden="true"
                className="block h-1 rounded-full"
                style={{ background: i <= reached ? STAGE_COLOR[stage] : 'var(--color-line)' }}
              />
              <span
                className={`text-[11px] ${i === reached ? 'font-semibold text-ink' : 'font-medium text-ink-mute'}`}
              >
                {s}
                {i === reached ? <span className="sr-only"> (current stage)</span> : null}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ink-mute">Other outcomes:</span>
          {OUTCOMES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={stage === s}
              onClick={() => {
                setStage(s)
                setToast('Marked as ' + s + '. No follow-up task was created.')
              }}
              className={`min-h-8 cursor-pointer rounded-lg border px-2.5 text-[12px] font-semibold ${
                stage === s ? 'border-ink bg-chip text-ink' : 'border-line bg-surface text-ink-soft'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3.5">
          <span className="text-xs font-medium text-ink-mute">Move this lead to</span>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="w-[200px]">
              <span className="sr-only">Next stage</span>
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value as Stage)}
                className="min-h-10 w-full rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink"
              >
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={changeStage}
              disabled={pick === stage}
              className="min-h-10 cursor-pointer rounded-[10px] border-0 bg-rail px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Change stage
            </button>
          </div>
          <p className="m-0 text-[12px] text-plum">
            Leaving &ldquo;Messaged&rdquo; asks for the message that was sent.
            &ldquo;Purchased&rdquo; asks what they bought.
          </p>
        </div>
      </Card>

      {/* Left: the lead's own details. Right: who owns it and what happens next. */}
      <section className="grid items-start gap-4 [grid-template-columns:minmax(0,1fr)] lg:[grid-template-columns:minmax(0,1.9fr)_minmax(250px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-1">
            <CardHead title="Contact information" aside="Missing details can be added by hand" />
            <dl className="m-0 flex flex-col">
              <Row label="Full name" value={L.name} chip={L.filledBy.name} action="Edit" />
              <Row
                label="Instagram"
                value={L.instagram}
                chip={L.filledBy.instagram}
                action="Edit"
              />
              <Row label="Phone" value={L.phone} action="+ Add phone" />
              <Row label="Alternate phone" value={L.altPhone} action="+ Add alternate phone" />
              <Row label="Email" value={L.email} action="+ Add email" />
              <Row label="City / area" value={L.city} chip={L.filledBy.city} action="Edit" />
              <Row label="Birthday" value={L.birthday} action="+ Add birthday" />
              <Row label="Anniversary" value={L.anniversary} action="+ Add anniversary" />
              <Row label="Address" value={L.address} action="+ Add address" />
            </dl>
          </Card>

          <Card className="flex flex-col gap-3">
            <CardHead
              title="Where this lead came from"
              aside={
                <span className="rounded-md bg-chip px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                  Filled in automatically from Meta
                </span>
              }
            />
            <dl className="m-0 grid gap-x-6 gap-y-3 text-[13px] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
              {(
                [
                  ['Source', L.source],
                  ['Received', L.received],
                  ['Campaign', L.campaign ?? 'Not from an ad — messaged the page directly'],
                  ['Ad set · Ad', L.adset ?? '—'],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="text-ink-mute">{k}</dt>
                  <dd className="m-0 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <figure className="m-0 flex flex-col gap-1 rounded-[10px] bg-well p-3">
              <figcaption className="text-xs text-ink-mute">Her first message</figcaption>
              <p className="m-0 text-[13px] text-ink">{L.firstMessage}</p>
            </figure>
          </Card>

          <Card className="flex flex-col gap-1">
            <CardHead title="Activity" aside={L.timeline.length + ' entries'} />
            {L.timeline.map((e, i) => (
              <div
                key={i}
                className="grid gap-x-4 gap-y-0.5 border-t border-line-soft py-3 first:border-0 [grid-template-columns:minmax(90px,110px)_1fr]"
              >
                <span className="text-xs text-ink-mute">{e.at}</span>
                <span className="text-[13px] font-semibold text-ink">{e.title}</span>
                <span />
                <p className="m-0 text-[13px] text-ink-mute">
                  {e.who} · {e.text}
                </p>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <CardHead title="Owner & status" />
            <Select label="Salesperson" value={rep} options={SALES} onChange={setRep} wide />
            <Select
              label="Status"
              value={status}
              options={['Hot', 'Warm', 'Cold']}
              onChange={(v) => setStatus(v as Temp)}
              wide
            />
            <Select
              label="Collection"
              value={collection}
              options={COLLECTIONS}
              onChange={setCollection}
              wide
            />
          </Card>

          <Card className="flex flex-col gap-3">
            <CardHead
              title="Next task"
              aside={
                <a
                  href="#/tasks"
                  onClick={(e) => {
                    e.preventDefault()
                    go('tasks')
                  }}
                  className="text-[13px] font-semibold"
                >
                  All tasks
                </a>
              }
            />
            <div className="flex flex-col gap-0.5 rounded-[10px] bg-[#F3EFF1] p-3">
              <span className="text-[13px] font-semibold text-plum">
                {L.nextTask.title} — {L.nextTask.when}
              </span>
              <span className="text-xs text-ink-mute">
                {L.nextTask.rep} · also shows in the Calendar
              </span>
            </div>
            <button
              type="button"
              className="min-h-10 cursor-pointer rounded-[10px] border border-line bg-surface text-[13px] font-semibold text-ink"
            >
              + Add task for this lead
            </button>
          </Card>

          <Card className="flex flex-col gap-3">
            <CardHead title="Notes" />
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-mute">
              Add a note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote()
                }}
                rows={2}
                placeholder="e.g. Prefers rose-gold finish"
                className="resize-y rounded-[10px] border border-[#DCD5D1] bg-surface px-3 py-2 text-[13px] text-ink"
              />
            </label>
            {note.trim() ? (
              <button
                type="button"
                onClick={addNote}
                className="min-h-10 w-fit cursor-pointer rounded-[10px] border-0 bg-rail px-4 text-[13px] font-semibold text-white"
              >
                Save note
              </button>
            ) : null}
            {notes.map((n, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-[10px] bg-well p-3">
                <p className="m-0 text-[13px] text-ink">{n.text}</p>
                <span className="text-xs text-ink-mute">
                  {n.who} · {n.at}
                </span>
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-2">
            <CardHead title="Duplicate check" />
            <p className="m-0 text-[13px] text-plum">
              No other lead has this Instagram handle. Once a phone number is added, the CRM checks
              it too and merges repeat enquiries.
            </p>
          </Card>
        </div>
      </section>

      {toast ? <Toast text={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  )
}
