import type { Lead, User } from '../data/types'

const MIN = 60_000

/** 0–100. Rule-based so the sales team can understand it; swap for a model score from the backend later. */
export function leadScore(l: Lead, now = Date.now()): number {
  if (l.status === 'Purchased') return 100
  if (l.status === 'Lost') return 0
  let s = { High: 45, Medium: 28, Low: 10 }[l.intent]
  s += { New: 0, Contacted: 8, 'Visit booked': 20, Visited: 28 }[l.status]
  const ageH = (now - new Date(l.createdAt).getTime()) / (60 * MIN)
  s += ageH < 24 ? 12 : ageH < 72 ? 6 : ageH > 24 * 21 ? -10 : 0
  const said = l.activities.map(a => a.text).join('|')
  if (/· Interested/.test(said)) s += 15
  if (/Not interested/.test(said)) s -= 20
  if (l.source === 'Referral') s += 10
  if (l.notes.length) s += 3
  return Math.max(1, Math.min(99, Math.round(s)))
}

export type ScoreBand = 'Hot' | 'Warm' | 'Cold'
export const scoreBand = (score: number, hot: number): ScoreBand => (score >= hot ? 'Hot' : score >= 40 ? 'Warm' : 'Cold')

/** Minutes from lead creation to first contact; null if never contacted. */
export const responseMinutes = (l: Lead) =>
  l.firstContactAt ? Math.max(0, (new Date(l.firstContactAt).getTime() - new Date(l.createdAt).getTime()) / MIN) : null

/** Minutes a new, untouched lead has been waiting; null otherwise. */
export const waitingMinutes = (l: Lead, now = Date.now()) =>
  !l.firstContactAt && l.status === 'New' ? (now - new Date(l.createdAt).getTime()) / MIN : null

export type SlaTone = 'ok' | 'warn' | 'late'
export const slaTone = (mins: number, sla: number): SlaTone => (mins <= sla * 0.6 ? 'ok' : mins <= sla ? 'warn' : 'late')

export const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function repStats(leads: Lead[], users: User[], slaMinutes: number) {
  return users
    .map(u => {
      const mine = leads.filter(l => l.assigneeId === u.id)
      const times = mine.map(responseMinutes).filter((x): x is number => x != null)
      const bought = mine.filter(l => l.status === 'Purchased')
      const won = bought.length
      const closed = won + mine.filter(l => l.status === 'Lost').length
      return {
        user: u,
        assigned: mine.length,
        medianResponse: median(times),
        withinSla: times.length ? (times.filter(t => t <= slaMinutes).length / times.length) * 100 : null,
        won,
        revenue: bought.reduce((s, l) => s + (l.sale?.amount ?? 0), 0),
        winRate: closed ? (won / closed) * 100 : null,
      }
    })
    .filter(r => r.assigned > 0)
}

export const isClosed = (l: Lead) => l.status === 'Purchased' || l.status === 'Lost'

/**
 * Per-manager rollup for the owner: every lead handled anywhere in that manager's subtree,
 * so the owner judges a branch, not one person. `team` excludes the manager themselves.
 */
export function teamStats(leads: Lead[], users: User[], slaMinutes: number, subtree: (id: string) => User[]) {
  return users
    .filter(u => u.role === 'Owner' || u.role === 'Manager')
    .map(mgr => {
      const branch = subtree(mgr.id)
      const ids = new Set(branch.map(u => u.id))
      const mine = leads.filter(l => l.assigneeId && ids.has(l.assigneeId))
      const times = mine.map(responseMinutes).filter((x): x is number => x != null)
      const bought = mine.filter(l => l.status === 'Purchased')
      const closed = bought.length + mine.filter(l => l.status === 'Lost').length
      return {
        manager: mgr,
        headcount: branch.length - 1, // branch includes the manager
        team: branch.filter(u => u.id !== mgr.id),
        assigned: mine.length,
        unworked: mine.filter(l => l.status === 'New' && !l.firstContactAt).length,
        breached: times.filter(t => t > slaMinutes).length,
        medianResponse: median(times),
        withinSla: times.length ? (times.filter(t => t <= slaMinutes).length / times.length) * 100 : null,
        won: bought.length,
        revenue: bought.reduce((s, l) => s + (l.sale?.amount ?? 0), 0),
        winRate: closed ? (bought.length / closed) * 100 : null,
      }
    })
    .filter(r => r.headcount > 0)
}

export interface TemplateVars { first_name: string; agent: string; brand: string }
export function fillTemplate(body: string, vars: TemplateVars) {
  return body.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? vars[k as keyof typeof vars] : m))
}

export function downloadCsv(filename: string, rows: Record<string, string | number | null>[]) {
  if (!rows.length) return
  const esc = (v: string | number | null) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = Object.keys(rows[0])
  const csv = [head.join(','), ...rows.map(r => head.map(h => esc(r[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
