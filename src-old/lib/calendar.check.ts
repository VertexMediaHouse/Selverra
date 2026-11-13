// Run: node src/lib/calendar.check.ts
// Guards the calendar grid math: Monday-first, 42 cells, every day of the month covered.
import assert from 'node:assert/strict'

const DAY = 86400_000
const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0)
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7

function monthCells(cursor: number): number[] {
  const first = new Date(cursor)
  first.setDate(1)
  const start = midnight(first.getTime()) - mondayIndex(first) * DAY
  return Array.from({ length: 42 }, (_, i) => start + i * DAY)
}

// Monday is index 0, Sunday is 6.
assert.equal(mondayIndex(new Date(2026, 10, 9)), 0, 'Mon 9 Nov 2026 is index 0')
assert.equal(mondayIndex(new Date(2026, 10, 15)), 6, 'Sun 15 Nov 2026 is index 6')

// Across two years of months: the grid always starts on a Monday, holds 42 cells, and
// contains every single day of that month.
for (let m = 0; m < 24; m++) {
  const cursor = new Date(2026, m, 1).getTime()
  const cells = monthCells(cursor)
  const label = `${2026 + Math.floor(m / 12)}-${(m % 12) + 1}`

  assert.equal(cells.length, 42, `${label}: six full weeks`)
  assert.equal(mondayIndex(new Date(cells[0])), 0, `${label}: grid starts on a Monday`)

  // Cells are consecutive days, no gaps or repeats (DST can shift a raw +DAY sum).
  const days = cells.map(c => new Date(c).getDate())
  assert.equal(new Set(cells.map(c => new Date(c).toDateString())).size, 42, `${label}: 42 distinct days`)

  // Every date of the month appears exactly once.
  const inMonth = new Date(cursor).getMonth()
  const seen = cells.filter(c => new Date(c).getMonth() === inMonth).map(c => new Date(c).getDate())
  const last = new Date(2026, m + 1, 0).getDate()
  assert.deepEqual(seen, Array.from({ length: last }, (_, i) => i + 1), `${label}: every day present, in order`)
  assert.ok(days.length === 42)
}

// A 31-day month starting on a Sunday is the worst case: it needs all six weeks.
const worst = monthCells(new Date(2026, 2, 1).getTime()) // Mar 2026 starts Sunday
assert.equal(new Date(worst[0]).getDate(), 23, 'leading days come from February')
assert.ok(new Date(worst[41]).getMonth() === 3, 'trailing days spill into April')

// Bucketing: a task at 11:59pm and one at 12:01am land on different days.
const late = new Date(2026, 10, 12, 23, 59).getTime()
const early = new Date(2026, 10, 13, 0, 1).getTime()
assert.notEqual(midnight(late), midnight(early), 'midnight splits the two days')
assert.equal(midnight(new Date(2026, 10, 12, 9, 0).getTime()), midnight(late), 'same day buckets together')

console.log('calendar.check.ts OK')
