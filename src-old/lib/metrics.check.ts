// Run: node src/lib/metrics.check.ts
import assert from 'node:assert/strict'
import { addDays, cplVerdict, daySpan, pctChange, previousRange, totals } from './metrics.ts'

const row = (spend: number, impressions: number, clicks: number, leads: number) =>
  ({ date: '2026-01-01', campaignId: 'c', adSetId: 'a', adId: 'x', spend, impressions, clicks, leads, ctr: 0, cpc: 0, cpl: 0 })

const t = totals([row(100, 1000, 10, 2), row(300, 3000, 50, 0)])
assert.equal(t.spend, 400)
assert.equal(t.cpl, 200) // 400 / 2, not the average of per-row CPLs
assert.equal(t.ctr, 1.5) // 60 / 4000
assert.equal(totals([]).cpl, null)

assert.equal(addDays('2026-03-01', -1), '2026-02-28')
assert.equal(daySpan('2026-01-01', '2026-01-07'), 7)
assert.deepEqual(previousRange('2026-01-08', '2026-01-14'), { from: '2026-01-01', to: '2026-01-07' })

assert.equal(pctChange(150, 100), 50)
assert.equal(pctChange(5, 0), null)
assert.equal(cplVerdict(70, 100), 'winner')
assert.equal(cplVerdict(130, 100), 'loser')
assert.equal(cplVerdict(100, 100), null)
console.log('metrics ok')

import { pacing } from './metrics.ts'
const p = pacing(1000, 6600, 6, 30) // spent 6.6k vs 6k expected
assert.equal(Math.round(p.pace!), 110)
assert.equal(p.state, 'on')
assert.equal(p.forecast, 33000)
assert.equal(pacing(1000, 9000, 6, 30).state, 'over')
console.log('pacing ok')

import { sales } from './metrics.ts'
const L = (status: string, amount?: number) => ({ status, sale: amount ? { amount, grams: 10, items: '', at: '' } : null, activities: [] }) as never
const s = sales([L('New'), L('Visited'), L('Purchased', 6000), L('Purchased', 4000)], 2500)
assert.equal(s.visits, 3) // purchased leads also visited
assert.equal(s.revenue, 10000)
assert.equal(s.roas, 4)
assert.equal(s.aov, 5000)
assert.equal(s.visitRate, 75)
console.log('sales ok')
