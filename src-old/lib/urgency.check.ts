// Run: node src/lib/urgency.check.ts
// Guards the kanban/table urgency stripe: which signal wins, and what counts as "needs action".
// Mirrors `urgency` in pages/archive/Leads.tsx — keep the two in step.
import assert from 'node:assert/strict'
import { slaTone, waitingMinutes } from './leads.ts'
import type { Lead, Task } from '../data/types.ts'

const SLA = 15
const now = Date.UTC(2026, 10, 12, 12, 0)
const iso = (minsFromNow: number) => new Date(now + minsFromNow * 60_000).toISOString()

function urgency(lead: Lead, task: Task | undefined, slaMinutes: number, at: number) {
  const waiting = waitingMinutes(lead, at)
  if (waiting != null && slaTone(waiting, slaMinutes) === 'late') return { bar: 'bg-rose-500', label: 'Reply overdue', action: true }
  if (task && new Date(task.dueAt).getTime() < at) return { bar: 'bg-amber-500', label: 'Follow-up overdue', action: true }
  if (lead.status === 'Visit booked' && lead.visitAt) return { bar: 'bg-violet-500', label: 'Visit booked', action: false }
  return null
}

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'L1', name: 'Test', phone: '', email: '', source: 'Meta Lead Ad', categoryId: 'k1',
  campaignId: null, adSetId: null, adId: null, status: 'New', lostReason: null, assigneeId: 'u4',
  visitAt: null, sale: null, answers: [], intent: 'Medium', firstContactAt: iso(-100),
  notes: [], activities: [], createdAt: iso(-120), ...over,
})
const task = (dueMins: number): Task =>
  ({ id: 't1', leadId: 'L1', title: 'Call back', type: 'call', dueAt: iso(dueMins), done: false, assigneeId: 'u4' })

// ---- a replied-to lead with nothing pending is not urgent ----
assert.equal(urgency(lead(), undefined, SLA, now), null, 'answered lead, no task: no stripe')
assert.equal(urgency(lead(), task(60), SLA, now), null, 'a task due later is not urgent')

// ---- an unanswered lead past the SLA is the top signal ----
const waitingLead = lead({ firstContactAt: null, createdAt: iso(-90) })
assert.equal(waitingMinutes(waitingLead, now), 90, 'waiting since creation')
const late = urgency(waitingLead, undefined, SLA, now)
assert.equal(late?.label, 'Reply overdue')
assert.equal(late?.bar, 'bg-rose-500')
assert.equal(late?.action, true)

// A lead inside the SLA window is not yet "late", so it gets no stripe.
assert.equal(urgency(lead({ firstContactAt: null, createdAt: iso(-5) }), undefined, SLA, now), null,
  'still inside the SLA: no stripe yet')

// ---- an overdue follow-up is second ----
const od = urgency(lead(), task(-30), SLA, now)
assert.equal(od?.label, 'Follow-up overdue')
assert.equal(od?.bar, 'bg-amber-500')
assert.equal(od?.action, true)

// ---- priority order: reply overdue beats follow-up overdue beats visit ----
assert.equal(urgency(waitingLead, task(-30), SLA, now)?.label, 'Reply overdue',
  'an unanswered enquiry outranks an overdue task')
const booked = lead({ status: 'Visit booked', visitAt: iso(240) })
assert.equal(urgency(booked, task(-30), SLA, now)?.label, 'Follow-up overdue',
  'an overdue task outranks a booked visit')
// Note: `waitingMinutes` only fires while status is 'New' (see lib/leads.ts), so "unanswered
// AND visit booked" is not a reachable state — booking a visit means someone made contact.
// The reachable top-priority case is an unanswered New lead that also has an overdue task.
assert.equal(urgency(waitingLead, task(-30), SLA, now)?.bar, 'bg-rose-500',
  'reply overdue outranks an overdue task on the same card')
assert.equal(waitingMinutes({ ...waitingLead, status: 'Visit booked' }, now), null,
  'a lead past New is never counted as waiting for a first reply')

// ---- a booked visit is informational, not a to-do ----
const visit = urgency(booked, undefined, SLA, now)
assert.equal(visit?.label, 'Visit booked')
assert.equal(visit?.bar, 'bg-violet-500')
assert.equal(visit?.action, false, 'a booked visit must NOT inflate the needs-action count')
assert.equal(urgency(lead({ status: 'Visit booked', visitAt: null }), undefined, SLA, now), null,
  'Visit booked with no date set is not a stripe')

// ---- the column badge counts only actionable cards ----
const column: [Lead, Task | undefined][] = [
  [waitingLead, undefined],      // reply overdue  → counts
  [lead(), task(-5)],            // follow-up late → counts
  [booked, undefined],           // visit booked   → does not count
  [lead(), task(120)],           // nothing due    → does not count
  [lead(), undefined],           // quiet          → does not count
]
assert.equal(column.filter(([l, t]) => urgency(l, t, SLA, now)?.action).length, 2,
  'two of five cards need action')

// ---- the SLA setting actually moves the line ----
const borderline = lead({ firstContactAt: null, createdAt: iso(-20) })
assert.ok(urgency(borderline, undefined, 15, now), '20m waiting breaches a 15m SLA')
assert.equal(urgency(borderline, undefined, 120, now), null, 'the same lead is fine under a 120m SLA')

console.log('urgency.check.ts OK')
