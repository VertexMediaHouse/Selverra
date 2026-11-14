import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[14px] border border-line bg-surface p-5 ${className}`}>{children}</div>
  )
}

export function CardHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-1">
      <h2 className="m-0 text-base font-semibold">{title}</h2>
      {aside ? <span className="text-[13px] text-ink-mute">{aside}</span> : null}
    </div>
  )
}

export function Stat({
  label,
  value,
  note,
  noteTone = 'mute',
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  noteTone?: 'mute' | 'good' | 'bad' | 'soft'
}) {
  const tone = {
    mute: 'text-ink-mute',
    soft: 'text-ink-soft',
    good: 'text-good',
    bad: 'text-bad',
  }[noteTone]
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-ink-mute">{label}</span>
      <span className="text-4xl font-bold tracking-[-0.02em]">{value}</span>
      {note ? <span className={`text-[13px] ${tone}`}>{note}</span> : null}
    </Card>
  )
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {children}
    </span>
  )
}

export function StatusPill({ active }: { active: boolean }) {
  return (
    <Pill tone={active ? 'bg-[#DCF5E3] text-good' : 'bg-[#EFEEED] text-[#52504D]'}>
      {active ? 'Active' : 'Paused'}
    </Pill>
  )
}

/** Segmented control. One button per option, the chosen one raised. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-xl bg-chip p-1">
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`min-h-10 cursor-pointer rounded-[9px] border-0 px-4 text-[13px] ${
              on
                ? 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                : 'bg-transparent font-medium text-ink-soft'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Select({
  label,
  value,
  options,
  onChange,
  wide = false,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  /** Fill the parent instead of the fixed 172px filter-row width. For selects
   *  laid out in a grid, where a clipped value would hide the choice. */
  wide?: boolean
}) {
  return (
    <label
      className={`flex flex-col gap-1 text-xs font-medium text-ink-mute ${
        wide ? 'w-full min-w-0' : 'w-[172px] shrink-0'
      }`}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 w-full rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

export function Bar({ width, color = 'var(--color-plum)' }: { width: string; color?: string }) {
  return (
    <span className="block h-2 overflow-hidden rounded-[4px] bg-line-soft">
      <span className="block h-2 rounded-[4px]" style={{ width, background: color }} />
    </span>
  )
}

export function Avatar({ initials, bg }: { initials: string; bg: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: bg }}
    >
      {initials}
    </span>
  )
}

export function Toast({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lg"
    >
      {text}
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-8 cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#E5D7DA]"
      >
        Dismiss
      </button>
    </div>
  )
}

export function PageHead({
  title,
  sub,
  children,
}: {
  title: string
  sub?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="m-0 text-[26px] font-bold tracking-[-0.01em]">{title}</h1>
        {sub ? <p className="mt-1.5 mb-0 text-sm text-ink-mute">{sub}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2.5">{children}</div> : null}
    </header>
  )
}

export type Period = 'today' | 'week' | 'month'

/** Today / This week / This month chip group, shared by all three dashboards. */
export function PeriodChips({
  value,
  onChange,
}: {
  value: Period
  onChange: (p: Period) => void
}) {
  return (
    <div role="group" aria-label="Time period" className="flex gap-1 rounded-xl bg-chip p-1">
      {(
        [
          ['today', 'Today'],
          ['week', 'This week'],
          ['month', 'This month'],
        ] as [Period, string][]
      ).map(([id, label]) => {
        const on = id === value
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={`min-h-10 cursor-pointer rounded-[9px] border-0 px-4 text-[13px] ${
              on
                ? 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                : 'bg-transparent font-medium text-ink-soft'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
