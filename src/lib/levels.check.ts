// Run: node src/lib/levels.check.ts
// Guards the 3-level split: what each level may open, and what the data layer hands them.
import assert from 'node:assert/strict'
import { ALL_PAGES, LEVELS, levelOf, pagesFor, seesSpend } from '../levels.ts'
import { canAccess, getSubtree, invalidateSubtreeCache } from './shares.ts'
import type { Lead, Share, User } from '../data/types.ts'

// u1 Owner → u3 Manager → u4 Sales; u9 is a second manager with u10 under them.
const users: User[] = [
  { id: 'u1', name: 'Owner', email: 'owner@gmail.com', role: 'Owner', managerId: null },
  { id: 'u3', name: 'Mgr', email: 'manager@gmail.com', role: 'Manager', managerId: 'u1' },
  { id: 'u4', name: 'Sales', email: 'sales@gmail.com', role: 'Sales', managerId: 'u3' },
  { id: 'u9', name: 'Mgr2', email: '', role: 'Manager', managerId: 'u1' },
  { id: 'u10', name: 'Sales2', email: '', role: 'Sales', managerId: 'u9' },
]
invalidateSubtreeCache()

// ---- level from role ----
assert.equal(levelOf('Owner'), 'Owner')
assert.equal(levelOf('Manager'), 'Manager')
assert.equal(levelOf('Sales'), 'Sales')
assert.equal(levelOf('Marketing'), 'Sales', 'Marketing rides along with Sales')
assert.equal(levelOf(undefined), 'Sales', 'unknown role gets the narrowest level')

// ---- each level lands somewhere it is allowed ----
for (const level of ['Owner', 'Manager', 'Sales'] as const) {
  assert.ok(pagesFor(level).has(LEVELS[level].home), `${level} home must be in its own allow-list`)
  assert.ok(pagesFor(level).has('settings'), `${level} can always reach settings`)
}

// ---- the owner sees everything: every page, no exceptions ----
assert.equal(pagesFor('Owner').size, ALL_PAGES.length, 'the owner is gated by nothing')
for (const page of ALL_PAGES) {
  assert.ok(pagesFor('Owner').has(page), `the owner must reach "${page}"`)
}
// Any page another level can open, the owner can open too.
for (const level of ['Manager', 'Sales'] as const) {
  for (const page of pagesFor(level)) {
    assert.ok(pagesFor('Owner').has(page), `owner must reach "${page}" that ${level} reaches`)
  }
}
// Every page in the owner's sidebar groups is a real route.
for (const page of LEVELS.Owner.groups.flatMap(g => g.paths)) {
  assert.ok((ALL_PAGES as readonly string[]).includes(page), `"${page}" is not a real route`)
}

// ---- the allow-list actually withholds pages ----
assert.ok(pagesFor('Owner').has('access'), 'only the owner administers access')
assert.ok(!pagesFor('Manager').has('access'))
assert.ok(!pagesFor('Sales').has('access'))
assert.ok(pagesFor('Manager').has('team'), 'a manager gets the team dashboard')
assert.ok(!pagesFor('Sales').has('team'), 'sales staff do not see team performance')
assert.ok(pagesFor('Owner').has('owner'))
assert.ok(!pagesFor('Manager').has('owner'), 'the owner dashboard is owner-only')
assert.ok(!pagesFor('Sales').has('owner'))
// ---- money stays above the sales level ----
assert.ok(!pagesFor('Sales').has('insights'), 'ad spend is not a sales concern')
assert.ok(!pagesFor('Sales').has('overview'), 'the business overview is spend, ROAS and budget pacing')
assert.ok(!seesSpend('Sales'), 'sales staff never see ad spend or other reps’ totals')
assert.ok(pagesFor('Sales').has('mywork'), 'sales staff still get their own lead dashboard')
assert.ok(seesSpend('Manager') && seesSpend('Owner'))
// Whatever the sales pages are, none of them may be a money page.
for (const page of pagesFor('Sales')) {
  assert.ok(!['owner', 'overview', 'insights', 'budgets', 'campaigns', 'access'].includes(page),
    `sales must not reach "${page}"`)
}

// ---- data layer: who sees which leads ----
const lead = (id: string, assigneeId: string | null): Lead => ({
  id, name: id, phone: '', email: '', source: 'Meta Lead Ad', categoryId: 'k1', campaignId: null, adSetId: null, adId: null,
  status: 'New', lostReason: null, assigneeId, visitAt: null, sale: null, answers: [], intent: 'Medium',
  firstContactAt: null, notes: [], activities: [], createdAt: new Date().toISOString(),
})
const leads = [lead('own', 'u4'), lead('sibling', 'u10'), lead('mgr', 'u3'), lead('loose', null)]
const shares: Share[] = []
const visible = (me: string) =>
  leads.filter(l => canAccess(users, shares, { user: me, module: 'leads', recordId: l.id, owner: l.assigneeId ?? '', action: 'view', ancestorAccess: true }))
    .map(l => l.id)

assert.deepEqual(visible('u1').sort(), ['loose', 'mgr', 'own', 'sibling'], 'owner sees every lead')
assert.deepEqual(visible('u3').sort(), ['mgr', 'own'], 'manager sees their own branch, not the sibling branch')
assert.deepEqual(visible('u4'), ['own'], 'sales staff see only their own leads')
assert.ok(!visible('u4').includes('sibling'), 'no peeking across branches')
assert.ok(!visible('u4').includes('loose'), 'unassigned leads are not public')

// A share opens exactly one record and nothing more.
shares.push({ id: 's1', module: 'leads', recordId: 'sibling', sharedBy: 'u1', sharedWith: 'u4', permission: 'view', createdAt: '' })
assert.deepEqual(visible('u4').sort(), ['own', 'sibling'], 'a share adds one record')
assert.ok(!canAccess(users, shares, { user: 'u4', module: 'leads', recordId: 'sibling', owner: 'u10', action: 'edit', ancestorAccess: true }),
  'a view share must not grant edit')

// ---- product (category) access: a share row is the only way in ----
const cat = (me: string, id: string) =>
  canAccess(users, shares, { user: me, module: 'categories', recordId: id, owner: '', action: 'view', ancestorAccess: false })

assert.ok(cat('u1', 'k1') && cat('u1', 'k9'), 'the owner works every product')
assert.ok(!cat('u3', 'k1'), 'a manager with no grant sees no product')

shares.push({ id: 'sc1', module: 'categories', recordId: 'k1', sharedBy: 'u1', sharedWith: 'u3', permission: 'edit', createdAt: '' })
assert.ok(cat('u3', 'k1'), 'a granted product opens')
assert.ok(!cat('u3', 'k9'), 'other products stay shut')
assert.ok(!cat('u9', 'k1'), 'the grant is for one manager, not every manager')
assert.ok(!cat('u4', 'k1'), 'staff do not inherit their manager’s products')

// A category grant must not leak upward: granting a report does not grant the manager.
shares.push({ id: 'sc2', module: 'categories', recordId: 'k9', sharedBy: 'u1', sharedWith: 'u4', permission: 'edit', createdAt: '' })
assert.ok(cat('u4', 'k9'))
assert.ok(!cat('u3', 'k9'), 'ancestorAccess is off for categories, so nothing climbs the tree')

// ---- subtree is downward only ----
assert.ok(!getSubtree(users, 'u3').some(u => u.id === 'u1'), 'a manager never contains their own owner')
assert.ok(!getSubtree(users, 'u4').some(u => u.id === 'u3'), 'sales never contains their manager')

console.log('levels.check.ts OK')
