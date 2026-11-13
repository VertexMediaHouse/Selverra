import type { Insight, Lead } from '../data/types'

export interface Totals {
  spend: number
  impressions: number
  clicks: number
  leads: number
  ctr: number | null
  cpc: number | null
  cpl: number | null
}

const div = (a: number, b: number) => (b ? a / b : null)

/** Sum raw counts, then derive ratios (never average ratios). */
export function totals(rows: Insight[]): Totals {
  let spend = 0, impressions = 0, clicks = 0, leads = 0
  for (const r of rows) {
    spend += r.spend
    impressions += r.impressions
    clicks += r.clicks
    leads += r.leads
  }
  const ctr = div(clicks, impressions)
  return { spend, impressions, clicks, leads, ctr: ctr == null ? null : ctr * 100, cpc: div(spend, clicks), cpl: div(spend, leads) }
}

export function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    const list = m.get(k)
    if (list) list.push(r)
    else m.set(k, [r])
  }
  return m
}

// ---- dates (YYYY-MM-DD strings, local time) ----
export const isoDay = (d: Date) => d.toLocaleDateString('en-CA')
export const todayIso = () => isoDay(new Date())
export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return isoDay(d)
}
export const daySpan = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1

/** Same-length window right before [from, to]. */
export function previousRange(from: string, to: string) {
  const n = daySpan(from, to)
  return { from: addDays(from, -n), to: addDays(from, -1) }
}

export const leadDay = (l: Lead) => isoDay(new Date(l.createdAt))
export const inRange = (day: string, from: string, to: string) => day >= from && day <= to

/** One point per day, zero-filled, so charts don't skip days. */
export function dailySeries(rows: Insight[], from: string, to: string) {
  const byDay = groupBy(rows, r => r.date)
  const out: ({ date: string } & Totals)[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, ...totals(byDay.get(d) ?? []) })
  return out
}

// ---- retail funnel: leads → store visits → purchases → revenue ----
/** Lead reached the store (visited, then bought or not). */
export const hasVisited = (l: Lead) => l.status === 'Visited' || l.status === 'Purchased' || (l.status === 'Lost' && l.activities.some(a => a.text === 'Status changed to Visited'))

export function sales(leads: Lead[], spend: number) {
  const visits = leads.filter(hasVisited).length
  const bought = leads.filter(l => l.status === 'Purchased' && l.sale)
  const revenue = bought.reduce((s, l) => s + l.sale!.amount, 0)
  const grams = bought.reduce((s, l) => s + l.sale!.grams, 0)
  return {
    visits,
    purchases: bought.length,
    revenue,
    grams,
    visitRate: div(visits * 100, leads.length),
    purchaseRate: div(bought.length * 100, leads.length),
    costPerVisit: div(spend, visits),
    costPerPurchase: div(spend, bought.length),
    roas: spend ? revenue / spend : null,
    aov: div(revenue, bought.length),
  }
}

/** % change; null when there's no baseline. */
export const pctChange = (cur: number | null, prev: number | null) =>
  cur == null || prev == null || prev === 0 ? null : ((cur - prev) / prev) * 100

/** Winner/loser vs. the average CPL of the comparison set. */
export function cplVerdict(cpl: number | null, avgCpl: number | null): 'winner' | 'loser' | null {
  if (cpl == null || avgCpl == null) return null
  if (cpl <= avgCpl * 0.8) return 'winner'
  if (cpl >= avgCpl * 1.2) return 'loser'
  return null
}

// ---- budget pacing (calendar month) ----
export function monthInfo(today = todayIso()) {
  const [y, m, d] = today.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  return { start: `${today.slice(0, 8)}01`, daysElapsed: d, daysInMonth }
}

/** Month-to-date pacing for a daily budget. pace = actual / expected spend so far. */
export function pacing(dailyBudget: number, mtdSpend: number, daysElapsed: number, daysInMonth: number) {
  const expected = dailyBudget * daysElapsed
  const forecast = daysElapsed ? (mtdSpend / daysElapsed) * daysInMonth : 0
  const pace = expected ? (mtdSpend / expected) * 100 : null
  const state: 'over' | 'under' | 'on' | null = pace == null ? null : pace > 115 ? 'over' : pace < 85 ? 'under' : 'on'
  return { monthBudget: dailyBudget * daysInMonth, expected, forecast, pace, state }
}
