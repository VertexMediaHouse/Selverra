import { useState } from 'react'
import type { Route } from '../components/Shell'
import { IconBack, IconMessage, IconPhone } from '../components/icons'
import { Card, CardHead, Pill, Toast } from '../components/ui'
import { LEAD_DETAIL } from '../data/mock'
import { STAGES, STAGE_COLOR, TASK_CHIP, TEMP_PILL, type Stage } from '../data/types'

const L = LEAD_DETAIL

export default function LeadDetail({ go }: { go: (r: Route) => void }) {
  const [stage, setStage] = useState<Stage>(L.stage)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [log, setLog] = useState(L.timeline)

  const addNote = () => {
    const text = note.trim()
    if (!text) return
    setLog((l) => [{ at: 'Just now', who: L.rep, kind: 'Other' as const, text }, ...l])
    setNote('')
    setToast('Note added to the lead history.')
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

      <Card className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="m-0 text-2xl font-bold">{L.name}</h1>
              <Pill tone={TEMP_PILL[L.status]}>{L.status}</Pill>
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
              {L.phone} · {L.email} · {L.city}
            </p>
            <p className="m-0 text-sm text-ink-mute">
              Came in {L.received} from {L.source} · first reply in {L.replyMins} min · with {L.rep}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`tel:${L.phone.replace(/[^\d+]/g, '')}`}
              className="flex min-h-11 items-center gap-2 rounded-[10px] border border-line px-4 text-sm font-semibold text-ink no-underline"
            >
              <IconPhone />
              Call
            </a>
            <a
              href="#/lead"
              onClick={(e) => e.preventDefault()}
              className="flex min-h-11 items-center gap-2 rounded-[10px] bg-rail px-4 text-sm font-semibold text-white no-underline"
            >
              <IconMessage />
              Message
            </a>
          </div>
        </div>

        <label className="flex max-w-xs flex-col gap-1 border-t border-line-soft pt-3.5 text-xs font-medium text-ink-mute">
          Stage
          <select
            value={stage}
            onChange={(e) => {
              const next = e.target.value as Stage
              setStage(next)
              setToast(
                next === 'Purchased'
                  ? 'Moved to Purchased. Add what they bought and the amount.'
                  : `Moved to ${next}. The next follow-up task was created.`,
              )
            }}
            className="min-h-10 rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink"
          >
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </Card>

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <Card className="flex flex-col gap-3">
          <CardHead title="Where this lead came from" />
          <dl className="m-0 grid gap-x-4 gap-y-2.5 text-[13px] [grid-template-columns:auto_1fr]">
            {[
              ['Source', L.source],
              ['Campaign', L.campaign],
              ['Ad set', L.adset],
              ['Ad', L.ad],
              ['Collection', L.collection],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-mute">{k}</dt>
                <dd className="m-0 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <a
            href="#/campaign"
            onClick={(e) => {
              e.preventDefault()
              go('campaign')
            }}
            className="text-[13px] font-semibold"
          >
            Open this campaign →
          </a>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHead title="What they told us on the form" />
          <dl className="m-0 flex flex-col gap-2.5 text-[13px]">
            {L.formAnswers.map(([q, a]) => (
              <div key={q} className="flex flex-col gap-0.5 border-t border-line-soft pt-2.5 first:border-0 first:pt-0">
                <dt className="text-ink-mute">{q}</dt>
                <dd className="m-0 font-medium">{a}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <Card className="flex flex-col gap-3">
        <CardHead title="History" aside={`${log.length} entries`} />

        <div className="flex flex-col gap-2 border-b border-line-soft pb-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-mute">
            Add a note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="What was said, what they want, what happens next…"
              className="resize-y rounded-[10px] border border-[#DCD5D1] bg-surface px-3 py-2 text-[13px] text-ink"
            />
          </label>
          <button
            type="button"
            onClick={addNote}
            disabled={!note.trim()}
            className="min-h-10 w-fit cursor-pointer rounded-[10px] border-0 bg-rail px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add note
          </button>
        </div>

        {log.map((e, i) => (
          <div key={i} className="flex gap-3 border-t border-line-soft py-3 first:border-0">
            <span
              className={`h-fit whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${TASK_CHIP[e.kind]}`}
            >
              {e.kind}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-ink-mute">
                {e.at} · {e.who}
              </span>
              <p className="m-0 text-sm text-ink">{e.text}</p>
            </div>
          </div>
        ))}
      </Card>

      {toast ? <Toast text={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  )
}
