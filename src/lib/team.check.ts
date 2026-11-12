// Run: node src/lib/team.check.ts
import assert from 'node:assert/strict'
import { teamStats } from './leads.ts'
import { getSubtree } from './shares.ts'
import type { Lead, User } from '../data/types.ts'

// u1 Owner → u3 Manager → u4, u5; u4 → u6. u2 Marketing under u1 (no reports).
const users: User[] = [
  { id: 'u1', name: 'Owner', email: '', role: 'Owner', managerId: null },
  { id: 'u2', name: 'Mktg', email: '', role: 'Marketing', managerId: 'u1' },
  { id: 'u3', name: 'Mgr', email: '', role: 'Manager', managerId: 'u1' },
  { id: 'u4', name: 'S4', email: '', role: 'Sales', managerId: 'u3' },
  { id: 'u5', name: 'S5', email: '', role: 'Sales', managerId: 'u3' },
  { id: 'u6', name: 'S6', email: '', role: 'Sales', managerId: 'u4' },
]
const sub = (id: string) => getSubtree(users, id)

const lead = (over: Partial<Lead>): Lead => ({
  id: 'L', name: '', phone: '', email: '', source: 'Meta Lead Ad', categoryId: 'k1', campaignId: null, adSetId: null, adId: null,
  status: 'New', lostReason: null, assigneeId: null, visitAt: null, sale: null, answers: [], intent: 'Medium',
  firstContactAt: null, notes: [], activities: [], createdAt: '2026-01-01T10:00:00.000Z', ...over,
})
const bought = (assigneeId: string, amount: number, respMin: number) => lead({
  id: `L${assigneeId}${amount}`, assigneeId, status: 'Purchased',
  sale: { amount, grams: 10, items: 'ring', at: '2026-01-02T10:00:00.000Z' },
  firstContactAt: new Date(Date.parse('2026-01-01T10:00:00.000Z') + respMin * 60_000).toISOString(),
})

const leads = [
  bought('u4', 100_000, 5),   // fast, in u3's branch (via u4)
  bought('u6', 50_000, 40),   // slow, in u3's branch (u6 under u4)
  lead({ id: 'Lx', assigneeId: 'u5', status: 'New' }),           // untouched, u3's branch
  lead({ id: 'Ly', assigneeId: 'u5', status: 'Lost', firstContactAt: '2026-01-01T10:10:00.000Z' }),
]

const sla = 15
const rows = teamStats(leads, users, sla, sub)

// Only managers WITH reports appear: u1 (whole company) and u3. u2 has no reports.
assert.deepEqual(rows.map(r => r.manager.id).sort(), ['u1', 'u3'])

const u3 = rows.find(r => r.manager.id === 'u3')!
assert.equal(u3.headcount, 3)                 // u4, u5, u6 — manager excluded
assert.equal(u3.assigned, 4)                  // every lead in the branch rolls up
assert.equal(u3.won, 2)
assert.equal(u3.revenue, 150_000)             // 100k + 50k from DIFFERENT depths
assert.equal(u3.unworked, 1)                  // the New lead never contacted
assert.equal(u3.breached, 1)                  // the 40-min response blew the 15-min target
assert.equal(u3.medianResponse, 10)           // median of 5, 10, 40 (odd count → middle value)
assert.equal(u3.winRate, 2 / 3 * 100)         // 2 won of 3 closed (2 bought + 1 lost)

// Owner's branch is the whole company, so it totals at least as much as any sub-branch.
const u1 = rows.find(r => r.manager.id === 'u1')!
assert.equal(u1.headcount, 5)
assert.equal(u1.revenue, 150_000)
assert.ok(u1.assigned >= u3.assigned)

// A manager with no leads in range still reports zeros, not NaN.
const empty = teamStats([], users, sla, sub).find(r => r.manager.id === 'u3')!
assert.equal(empty.assigned, 0)
assert.equal(empty.revenue, 0)
assert.equal(empty.medianResponse, null)
assert.equal(empty.withinSla, null)
assert.equal(empty.winRate, null)

console.log('team.check.ts OK')
