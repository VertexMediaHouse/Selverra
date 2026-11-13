import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Baby, CheckCircle2, Clock, Diamond, Flame, Flower2, Gem, Gift, Glasses, Home, Inbox, Landmark, Snowflake, Sofa, Sparkles, Sun, Trophy, TrendingDown, User, UtensilsCrossed, X, XCircle, type LucideIcon } from 'lucide-react'
import type { DeliveryStatus, Lead, LeadStatus } from '../data/types'
import { useNow, useStore } from '../store'
import { HISTORY_DAYS } from '../data/api'
import { addDays, todayIso } from '../lib/metrics'
import { isClosed, leadScore, scoreBand, slaTone, waitingMinutes } from '../lib/leads'
import { fmt } from '../lib/format'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// Soft, warm palette to sit on the cream background.
// Muted, editorial palette on ivory: warm greige for spend, gold for the lead/money line, plus a quiet categorical set.
export const CHART = { spend: '#9a948a', leads: '#B08E54', qualified: '#8a8378', series: ['#B08E54', '#6F6B64', '#8a7a5a', '#a98f6b', '#5a5750'] }
export const tooltipProps = {
  contentStyle: { background: 'var(--tt-bg)', border: '1px solid var(--tt-border)', borderRadius: 10, color: 'var(--tt-text)', fontSize: 12, boxShadow: '0 8px 24px rgba(28,27,26,.10)' },
  labelStyle: { color: 'var(--tt-text)', fontWeight: 600, marginBottom: 4 },
  cursor: { fill: 'rgba(110,105,98,0.07)' },
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="display text-[26px] leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, action, children, className, padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx('card', padded && 'p-5', className)}>
      {(title || action) && (
        <div className={cx('mb-4 flex items-center justify-between gap-2', !padded && 'px-5 pt-5')}>
          {title && <h2 className="text-[13px] font-semibold tracking-[0.02em]">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cx('animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800', className)} />
)

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return <div className="space-y-3 p-4">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
}

export function EmptyState({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">{icon ?? <Inbox size={20} />}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

const tone = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
}
export type Tone = keyof typeof tone
export const Badge = ({ color = 'slate', children, className }: { color?: Tone; children: ReactNode; className?: string }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', tone[color], className)}>{children}</span>
)

export const STATUS_COLOR: Record<LeadStatus, Tone> = { New: 'blue', Contacted: 'amber', 'Visit booked': 'indigo', Visited: 'indigo', Purchased: 'green', Lost: 'red' }
export const STATUS_DOT: Record<LeadStatus, string> = { New: 'bg-sky-500', Contacted: 'bg-amber-500', 'Visit booked': 'bg-violet-500', Visited: 'bg-indigo-500', Purchased: 'bg-emerald-500', Lost: 'bg-rose-500' }
export const LeadStatusBadge = ({ status }: { status: LeadStatus }) => (
  <Badge color={STATUS_COLOR[status]}><span className={cx('size-1.5 rounded-full', STATUS_DOT[status])} />{status}</Badge>
)

export const DeliveryBadge = ({ status }: { status: DeliveryStatus }) => (
  <Badge color={status === 'ACTIVE' ? 'green' : 'slate'}>
    <span className={cx('size-1.5 rounded-full', status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400')} />
    {status === 'ACTIVE' ? 'Active' : 'Paused'}
  </Badge>
)

export function VerdictBadge({ verdict }: { verdict: 'winner' | 'loser' | null }) {
  if (verdict === 'winner') return <Badge color="green"><Trophy size={12} /> Winner</Badge>
  if (verdict === 'loser') return <Badge color="red"><TrendingDown size={12} /> Loser</Badge>
  return null
}

/** Hot / Warm / Cold with the numeric score. */
export function ScorePill({ lead, showNumber = true }: { lead: Lead; showNumber?: boolean }) {
  const { settings } = useStore()
  if (isClosed(lead)) return <span className="text-xs text-slate-400">—</span>
  const s = leadScore(lead)
  const band = scoreBand(s, settings.hotScore)
  const Icon = band === 'Hot' ? Flame : band === 'Warm' ? Sun : Snowflake
  return (
    <Badge color={band === 'Hot' ? 'red' : band === 'Warm' ? 'amber' : 'blue'}>
      <Icon size={12} />{band}{showNumber && <span className="tabular-nums opacity-70">{s}</span>}
    </Badge>
  )
}

/** Live "waiting 12m" counter for untouched new leads, coloured against the SLA. */
export function SlaTimer({ lead, compact }: { lead: Lead; compact?: boolean }) {
  const { settings } = useStore()
  const now = useNow(20_000)
  const mins = waitingMinutes(lead, now)
  if (mins == null) return null
  const t = slaTone(mins, settings.slaMinutes)
  return (
    <Badge color={t === 'ok' ? 'green' : t === 'warn' ? 'amber' : 'red'} className={cx(t === 'late' && 'animate-[pulse_2s_ease-in-out_infinite]')}>
      <Clock size={12} />{compact ? '' : 'Waiting '}{fmt.duration(mins)}
    </Badge>
  )
}

/** % change pill. `inverse` for metrics where down is good (CPL). */
export function Delta({ value, inverse }: { value: number | null; inverse?: boolean }) {
  if (value == null) return <span className="text-xs text-slate-400">no prior data</span>
  const good = inverse ? value < 0 : value > 0
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cx('inline-flex items-center gap-0.5 rounded px-1 text-xs font-medium tabular-nums', Math.abs(value) < 0.05 ? 'text-slate-500' : good ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400')}>
      <Icon size={13} />{Math.abs(value).toFixed(1)}%
    </span>
  )
}

/** Tiny SVG trend line. Cheaper than a chart library per KPI. */
export function Sparkline({ values, color = CHART.spend, className = 'h-8 w-full' }: { values: number[]; color?: string; className?: string }) {
  if (values.length < 2) return <div className={className} />
  const max = Math.max(...values), min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 26}`)
  const id = `sg${color.slice(1)}`
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,30 ${pts.join(' ')} 100,30`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

export function KpiCard({ label, value, delta, inverse, loading, spark, color, hint }: { label: string; value: string; delta: number | null; inverse?: boolean; loading?: boolean; spark?: number[]; color?: string; hint?: string }) {
  return (
    <div className="card flex h-full flex-col p-4" title={hint}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {loading ? (
        <><Skeleton className="mt-2 h-8 w-24" /><Skeleton className="mt-auto h-8 w-full" /></>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <p className="display text-[28px] leading-none">{value}</p>
            <Delta value={delta} inverse={inverse} />
          </div>
          {/* mt-auto keeps the sparkline pinned to the bottom so cards with and without one line up. */}
          <div className="mt-auto pt-2">{spark && <Sparkline values={spark} color={color} className="h-8 w-full" />}</div>
        </>
      )}
    </div>
  )
}

export function Avatar({ name, size = 'sm', color }: { name?: string; size?: 'xs' | 'sm' | 'md'; color?: string }) {
  const initials = name ? name.split(' ').map(p => p[0]).slice(0, 2).join('') : '?'
  return (
    <span style={color ? { background: color } : undefined} title={name}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-sm font-semibold', color ? 'text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
        size === 'xs' ? 'size-5 text-[9px]' : size === 'sm' ? 'size-6 text-[10px]' : 'size-9 text-xs')}>
      {initials}
    </span>
  )
}

export const Dot = ({ color, className }: { color?: string; className?: string }) => (
  <span className={cx('inline-block size-2 shrink-0 rounded-full', className)} style={{ background: color ?? '#A6A5A3' }} />
)

// Collection logos. Category.icon holds one of these lucide names; Gem is the fallback.
const COLLECTION_ICONS: Record<string, LucideIcon> = { Sofa, Glasses, Gem, Gift, Landmark, Sparkles, Diamond, Flower2, User, Baby, Home, UtensilsCrossed }

/** Collection logo: the category's lucide glyph in its brand color. Falls back to a plain Dot. */
export function CollectionIcon({ id, size = 14, className }: { id: string | null | undefined; size?: number; className?: string }) {
  const { categoryById } = useStore()
  const c = id ? categoryById.get(id) : undefined
  if (!c) return <Dot className={className} />
  const Icon = COLLECTION_ICONS[c.icon] ?? Gem
  return <Icon size={size} className={cx('shrink-0', className)} style={{ color: c.color }} />
}

/** Product category pill. */
export function CategoryTag({ id }: { id: string | null | undefined }) {
  const { categoryById } = useStore()
  const c = id ? categoryById.get(id) : undefined
  if (!c) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <CollectionIcon id={c.id} size={13} />{c.name}
    </span>
  )
}

/** Grams of silver, e.g. "1.2 kg" past 1000g. */
export const Grams = ({ g }: { g: number | null | undefined }) =>
  <>{g == null ? '—' : g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${Math.round(g)} g`}</>

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-black/[0.04] p-0.5 dark:bg-white/[0.06]" role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.value)} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={cx('inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-xs font-medium transition-all', value === o.value ? 'bg-white text-black shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

const PRESETS = [7, 14, 30, 60] as const
/** Shared date range control; writes to the global filter state. */
export function DateRangeFilter() {
  const { filters, setFilters, setPreset } = useStore()
  const min = addDays(todayIso(), -(HISTORY_DAYS - 1))
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented label="Date range" value={filters.preset} onChange={v => v !== 'custom' && setPreset(v)}
        options={PRESETS.map(d => ({ value: d, label: `${d}d` }))} />
      <div className="flex items-center gap-1">
        <input type="date" aria-label="From" className="input h-8 px-2 text-xs" min={min} max={filters.to} value={filters.from}
          onChange={e => e.target.value && setFilters({ from: e.target.value, preset: 'custom' })} />
        <span className="text-slate-400">–</span>
        <input type="date" aria-label="To" className="input h-8 px-2 text-xs" min={filters.from} max={todayIso()} value={filters.to}
          onChange={e => e.target.value && setFilters({ to: e.target.value, preset: 'custom' })} />
      </div>
    </div>
  )
}

export function Select({ label, value, onChange, children, className }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <select aria-label={label} className={cx('input pr-8', className)} value={value} onChange={e => onChange(e.target.value)}>
      {children}
    </select>
  )
}

/** Native <dialog>: focus trap, Esc and backdrop come for free. */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} onClick={e => e.target === ref.current && onClose()}
      className={cx('m-auto w-[calc(100%-2rem)] rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-panel-bg)] p-0 text-[var(--color-text-primary)] shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px] backdrop-blur-xl', wide ? 'max-w-3xl' : 'max-w-md')}>
      {open && (
        <>
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Close"><X size={18} /></button>
          </header>
          <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">{footer}</footer>}
        </>
      )}
    </dialog>
  )
}

/** Small dropdown. Closes on outside click and Esc. */
export function Menu({ button, children, align = 'left', label }: { button: ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={label}>{button}</div>
      {open && (
        <div role="menu" className={cx('absolute z-50 mt-1 min-w-52 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-panel-bg)] p-1 text-[var(--color-text-primary)] shadow-xl backdrop-blur-xl', align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
export const MenuItem = ({ onClick, children, danger }: { onClick: () => void; children: ReactNode; danger?: boolean }) => (
  <button role="menuitem" onClick={onClick}
    className={cx('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800', danger && 'text-rose-600')}>
    {children}
  </button>
)
export const MenuLabel = ({ children }: { children: ReactNode }) => <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{children}</p>

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">{children}</kbd>
)

export function Progress({ value, tone: t = 'indigo', marker }: { value: number; tone?: 'indigo' | 'amber' | 'red' | 'green'; marker?: number }) {
  const bg = { indigo: 'bg-indigo-500', amber: 'bg-amber-500', red: 'bg-rose-500', green: 'bg-emerald-500' }[t]
  return (
    <div className="relative h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={cx('h-1.5 rounded-full', bg)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      {marker != null && <div className="absolute -top-1 h-3.5 w-0.5 rounded bg-slate-400" style={{ left: `${Math.min(100, marker)}%` }} title="Expected by today" />}
    </div>
  )
}

export function Toaster() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 py-2.5 pr-2 pl-3.5 text-sm text-white shadow-2xl dark:bg-white dark:text-black">
          {t.tone === 'error' ? <XCircle size={16} className="text-rose-400" /> : <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600" />}
          <span>{t.text}</span>
          {t.undo && <button className="rounded-md px-2 py-1 font-semibold text-indigo-300 hover:bg-white/10 dark:text-indigo-600 dark:hover:bg-slate-100" onClick={() => { t.undo!(); dismissToast(t.id) }}>Undo</button>}
          <button onClick={() => dismissToast(t.id)} className="rounded-md p-1 opacity-60 hover:opacity-100" aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}
