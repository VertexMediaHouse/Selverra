// One place for number/currency/date formatting. Change LOCALE/CURRENCY to re-skin everything.
export const LOCALE = 'en-IN'
export const CURRENCY = 'INR'

const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })
const money2 = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 })
const moneyCompact = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 })
const num = new Intl.NumberFormat(LOCALE)
const numCompact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })

const ok = (n: number | null | undefined): n is number => n != null && Number.isFinite(n)

export const fmt = {
  currency: (n: number | null | undefined) => (ok(n) ? money.format(n) : '—'),
  /** For small unit costs like CPC. */
  currency2: (n: number | null | undefined) => (ok(n) ? money2.format(n) : '—'),
  currencyCompact: (n: number | null | undefined) => (ok(n) ? moneyCompact.format(n) : '—'),
  number: (n: number | null | undefined) => (ok(n) ? num.format(Math.round(n)) : '—'),
  compact: (n: number | null | undefined) => (ok(n) ? numCompact.format(n) : '—'),
  percent: (n: number | null | undefined, digits = 1) => (ok(n) ? `${n.toFixed(digits)}%` : '—'),
  date: (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }),
  dateTime: (iso: string) => new Date(iso).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
  duration(mins: number | null | undefined) {
    if (!ok(mins)) return '—'
    if (mins < 1) return '<1m'
    if (mins < 60) return `${Math.round(mins)}m`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`
    return `${Math.floor(mins / 1440)}d ${Math.round((mins % 1440) / 60)}h`
  },
  /** "in 2h", "3h ago", "tomorrow 10:00". */
  due(iso: string) {
    const d = new Date(iso)
    const mins = (d.getTime() - Date.now()) / 60000
    const time = d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
    const dayDiff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
    if (mins < 0) return `${fmt.duration(-mins)} overdue`
    if (dayDiff === 0) return mins < 60 ? `in ${Math.max(1, Math.round(mins))}m` : `today ${time}`
    if (dayDiff === 1) return `tomorrow ${time}`
    return d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }) + ` ${time}`
  },
  relative(iso: string) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`
    return `${Math.round(mins / 1440)}d ago`
  },
}
