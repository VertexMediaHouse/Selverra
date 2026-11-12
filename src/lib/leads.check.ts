// Run: node src/lib/leads.check.ts
import assert from 'node:assert/strict'
import { fillTemplate, leadScore, median, responseMinutes, scoreBand, slaTone, waitingMinutes } from './leads.ts'

const base = {
  id: 'L1', categoryId: 'k1', name: 'A B', phone: '', email: '', source: 'Meta Lead Ad', campaignId: null, adSetId: null, adId: null,
  status: 'New', lostReason: null, assigneeId: null, visitAt: null, sale: null, answers: [], intent: 'High', firstContactAt: null, notes: [], activities: [],
  createdAt: '2026-01-01T10:00:00.000Z',
} as const
const now = new Date('2026-01-01T10:20:00.000Z').getTime()

assert.equal(waitingMinutes({ ...base }, now), 20)
assert.equal(responseMinutes({ ...base, status: 'Contacted', firstContactAt: '2026-01-01T10:05:00.000Z' }), 5)
assert.equal(slaTone(20, 15), 'late')
assert.equal(slaTone(5, 15), 'ok')
assert.equal(leadScore({ ...base, status: 'Purchased' }, now), 100)
assert.ok(leadScore({ ...base, status: 'Visited' }, now) > leadScore({ ...base }, now))
assert.ok(leadScore({ ...base }, now) > leadScore({ ...base, intent: 'Low' }, now))
assert.equal(scoreBand(75, 70), 'Hot')
assert.equal(scoreBand(20, 70), 'Cold')
assert.equal(median([5, 1, 3]), 3)
assert.equal(median([]), null)
assert.equal(fillTemplate('Hi {{first_name}} from {{brand}} {{x}}', { first_name: 'Ria', agent: 'A', brand: 'Rajat' }), 'Hi Ria from Rajat {{x}}')
console.log('leads ok')
