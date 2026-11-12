import type { Campaign, Category, FestiveDate, Insight, Lead, Task } from '../data/types'
import { addDays, groupBy, monthInfo, pacing, todayIso, totals } from './metrics'
import { waitingMinutes } from './leads'
import { fmt } from './format'

export type Severity = 'critical' | 'warning' | 'success' | 'info'
export interface Alert {
  /** Stable per condition so a dismissal sticks. */
  id: string
  severity: Severity
  title: string
  detail: string
  categoryId: string | null
  href: string
  action?: { kind: 'pause' | 'scale'; campaignId: string }
}

const ORDER: Record<Severity, number> = { critical: 0, warning: 1, success: 2, info: 3 }

/** First day of insight rows that computeAlerts needs. */
export function alertsFrom(today = todayIso()) {
  const a = addDays(today, -27)
  const m = monthInfo(today).start
  return a < m ? a : m
}

export function computeAlerts(input: { rows: Insight[]; campaigns: Campaign[]; leads: Lead[]; tasks: Task[]; slaMinutes: number; festivals?: FestiveDate[]; categories?: Category[]; now?: number }): Alert[] {
  const { rows, campaigns, leads, tasks, slaMinutes, festivals = [], categories = [], now = Date.now() } = input
  const today = todayIso()
  const d7 = addDays(today, -6)
  const d14 = addDays(today, -13)
  const d28 = addDays(today, -27)
  const month = monthInfo(today)
  const out: Alert[] = []

  const last7 = rows.filter(r => r.date >= d7)
  const avgCpl7 = totals(last7).cpl
  const byCampaign = groupBy(rows, r => r.campaignId)

  for (const c of campaigns) {
    if (c.status !== 'ACTIVE') continue
    const rs = byCampaign.get(c.id) ?? []
    const cur = totals(rs.filter(r => r.date >= d7))
    const prev = totals(rs.filter(r => r.date >= d14 && r.date < d7))
    const href = `#/campaigns/${c.id}`

    if (cur.leads === 0 && cur.spend > 2500) {
      out.push({ id: `noleads:${c.id}`, severity: 'critical', categoryId: c.categoryId, href, action: { kind: 'pause', campaignId: c.id },
        title: `No leads in 7 days: ${c.name}`, detail: `Spent ${fmt.currency(cur.spend)} with zero leads. Check the form and audience, or pause.` })
    } else if (cur.cpl && prev.cpl && cur.cpl > prev.cpl * 1.3) {
      out.push({ id: `cpl:${c.id}`, severity: 'warning', categoryId: c.categoryId, href, action: { kind: 'pause', campaignId: c.id },
        title: `CPL up ${Math.round((cur.cpl / prev.cpl - 1) * 100)}%: ${c.name}`, detail: `${fmt.currency(prev.cpl)} → ${fmt.currency(cur.cpl)} vs the previous 7 days.` })
    }
    if (cur.cpl && avgCpl7 && cur.cpl < avgCpl7 * 0.7 && cur.leads >= 4) {
      out.push({ id: `scale:${c.id}`, severity: 'success', categoryId: c.categoryId, href, action: { kind: 'scale', campaignId: c.id },
        title: `Scale candidate: ${c.name}`, detail: `CPL ${fmt.currency(cur.cpl)} is ${Math.round((1 - cur.cpl / avgCpl7) * 100)}% below average with ${cur.leads} leads this week.` })
    }
    const mtd = totals(rs.filter(r => r.date >= month.start)).spend
    const p = pacing(c.dailyBudget, mtd, month.daysElapsed, month.daysInMonth)
    // Alert only on clear misses; the Budgets page shows the finer over/under states.
    if (p.pace != null && (p.pace > 125 || p.pace < 80)) {
      out.push({ id: `pace:${c.id}:${month.start}`, severity: p.pace > 125 ? 'warning' : 'info', categoryId: c.categoryId, href: '#/budgets',
        title: `${p.pace > 125 ? 'Overspending' : 'Underspending'}: ${c.name}`, detail: `At ${Math.round(p.pace!)}% of planned spend. Forecast ${fmt.currency(p.forecast)} vs ${fmt.currency(p.monthBudget)} budget.` })
    }

    // Creative fatigue: this week's CTR vs the 3 weeks before. One alert per campaign, pointing at the worst ad.
    const tired = [...groupBy(rs, r => r.adId)].flatMap(([adId, ars]) => {
      const a = totals(ars.filter(r => r.date >= d7))
      const b = totals(ars.filter(r => r.date >= d28 && r.date < d7))
      return a.ctr && b.ctr && a.impressions > 1500 && a.ctr < b.ctr * 0.75 ? [{ adId, drop: 1 - a.ctr / b.ctr, from: b.ctr, to: a.ctr }] : []
    }).sort((x, y) => y.drop - x.drop)
    if (tired.length) {
      const w = tired[0]
      const ad = c.adSets.flatMap(s => s.ads).find(x => x.id === w.adId)
      out.push({ id: `fatigue:${c.id}:${tired.map(t => t.adId).join(',')}`, severity: 'warning', categoryId: c.categoryId, href: `#/creatives?ad=${w.adId}`,
        title: `Creative fatigue in ${c.name}`,
        detail: `${tired.length > 1 ? `${tired.length} ads losing CTR. Worst: ` : ''}"${ad?.name}" down ${Math.round(w.drop * 100)}% (${fmt.percent(w.from, 2)} → ${fmt.percent(w.to, 2)}). Refresh the creative.` })
    }
  }

  const waiting = leads.filter(l => (waitingMinutes(l, now) ?? 0) > slaMinutes)
  if (waiting.length) {
    out.push({ id: `sla:${waiting.map(l => l.id).sort().join(',')}`, severity: 'critical', categoryId: null, href: '#/today',
      title: `${waiting.length} new lead${waiting.length > 1 ? 's' : ''} waiting past ${slaMinutes} min`, detail: 'Leads contacted in the first few minutes convert far better. Call them now.' })
  }
  const leadIds = new Set(leads.map(l => l.id))
  const overdue = tasks.filter(t => !t.done && leadIds.has(t.leadId) && new Date(t.dueAt).getTime() < now)
  if (overdue.length) {
    out.push({ id: `tasks:${today}:${overdue.length}`, severity: 'warning', categoryId: null, href: '#/today',
      title: `${overdue.length} overdue follow-up${overdue.length > 1 ? 's' : ''}`, detail: 'Clear them from the Today inbox.' })
  }

  // Festivals in the next 7 days: remind to push the matching categories.
  for (const f of festivals) {
    const days = Math.round((new Date(`${f.date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
    if (days < 0 || days > 7) continue
    const names = f.categoryIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean)
    const idle = campaigns.filter(c => f.categoryIds.includes(c.categoryId) && c.status === 'PAUSED')
    out.push({ id: `fest:${f.id}`, severity: days <= 2 ? 'warning' : 'info', categoryId: null, href: '#/budgets',
      title: days === 0 ? `${f.name} is today` : `${f.name} in ${days} day${days > 1 ? 's' : ''}`,
      detail: `${f.tip} Focus: ${names.join(', ')}.${idle.length ? ` ${idle.length} related campaign${idle.length > 1 ? 's are' : ' is'} paused.` : ''}` })
  }

  return out.sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
}
