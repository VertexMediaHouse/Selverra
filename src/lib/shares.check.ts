// Run: node src/lib/shares.check.ts
import assert from 'node:assert/strict'
import { canAccess, effectivePermission, isAdmin, isAncestor, shareableTargets, wouldLoop } from './shares.ts'
import type { Share, User } from '../data/types.ts'

// Owner u1 → Manager u3 → Sales u4 → Sales u6; u2 reports to u1; u5 under u1.
const users: User[] = [
  { id: 'u1', name: 'Owner', email: '', role: 'Owner', managerId: null },
  { id: 'u2', name: 'Mktg', email: '', role: 'Marketing', managerId: 'u1' },
  { id: 'u3', name: 'Mgr', email: '', role: 'Manager', managerId: 'u1' },
  { id: 'u4', name: 'Sales4', email: '', role: 'Sales', managerId: 'u3' },
  { id: 'u5', name: 'Sales5', email: '', role: 'Sales', managerId: 'u1' },
  { id: 'u6', name: 'Sales6', email: '', role: 'Sales', managerId: 'u4' },
]
const share = (over: Partial<Share>): Share =>
  ({ id: 's', module: 'leads', recordId: 'L1', sharedBy: 'u1', sharedWith: 'u1', permission: 'view', createdAt: '', ...over })

// --- roles ---
assert.ok(isAdmin(users[0]))          // Owner is admin
assert.ok(!isAdmin(users[2]))         // Manager is NOT admin — bounded to subtree
assert.ok(isAncestor(users, 'u3', 'u6'))   // u3 is ancestor of u6
assert.ok(!isAncestor(users, 'u3', 'u5'))  // u5 is outside u3's branch

// --- shareableTargets: downward only; Owner = everyone ---
assert.deepEqual(shareableTargets(users, [], 'u1').map(u => u.id).sort(), ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'])
assert.deepEqual(shareableTargets(users, [], 'u3').map(u => u.id).sort(), ['u4', 'u6']) // subtree minus self
assert.deepEqual(shareableTargets(users, [], 'u4').map(u => u.id), ['u6'])
assert.deepEqual(shareableTargets(users, [], 'u6'), [])                                 // leaf shares with nobody

// --- canAccess: a lead owned (assigned) to u6 ---
const owned = { module: 'leads' as const, recordId: 'L1', owner: 'u6', action: 'view' as const, ancestorAccess: true }
assert.ok(canAccess(users, [], { user: 'u6', ...owned }))  // owner
assert.ok(canAccess(users, [], { user: 'u1', ...owned }))  // Owner/admin
assert.ok(canAccess(users, [], { user: 'u3', ...owned }))  // ancestor (manager up the chain)
assert.ok(!canAccess(users, [], { user: 'u5', ...owned })) // sibling branch — NO access
assert.ok(!canAccess(users, [], { user: 'u2', ...owned })) // marketing peer — NO access

// Manager is NOT omnipotent: without ancestry, no access.
assert.ok(!canAccess(users, [], { user: 'u3', ...owned, owner: 'u5', ancestorAccess: true }))

// --- shares grant exactly their level ---
const vShare = [share({ sharedWith: 'u5', permission: 'view' })]
assert.ok(canAccess(users, vShare, { user: 'u5', ...owned }))                       // view share → view ok
assert.ok(!canAccess(users, vShare, { user: 'u5', ...owned, action: 'edit' }))      // view share → no edit

// --- effectivePermission: ancestor of owner holds edit (so can re-share) ---
assert.equal(effectivePermission(users, [], { user: 'u3', module: 'leads', recordId: 'L1', owner: 'u6', ancestorAccess: true }), 'edit')
assert.equal(effectivePermission(users, [], { user: 'u5', module: 'leads', recordId: 'L1', owner: 'u6', ancestorAccess: true }), null)
assert.equal(effectivePermission(users, vShare, { user: 'u5', module: 'leads', recordId: 'L1', owner: 'u6' }), 'view')

// --- campaign share cascades to leads under it ---
const campShare = [share({ module: 'campaigns', recordId: 'C9', sharedWith: 'u5', permission: 'view' })]
const leadUnderCamp = { module: 'leads' as const, recordId: 'L7', owner: 'u6', action: 'view' as const, ancestorAccess: true, parent: { module: 'campaigns' as const, recordId: 'C9' } }
assert.ok(canAccess(users, campShare, { user: 'u5', ...leadUnderCamp }))                       // campaign share → lead visible
assert.ok(!canAccess(users, campShare, { user: 'u5', ...leadUnderCamp, action: 'edit' }))       // view share ≠ edit
assert.ok(!canAccess(users, campShare, { user: 'u2', ...leadUnderCamp }))                        // not shared the campaign → no access
assert.ok(!canAccess(users, campShare, { user: 'u5', ...leadUnderCamp, parent: undefined }))     // no parent link → no cascade

// --- hierarchy integrity: no cycles ---
assert.equal(wouldLoop(users, 'u1', 'u6'), 'u1') // making owner report to a descendant loops
assert.equal(wouldLoop(users, 'u4', 'u5'), null) // valid re-parent

console.log('shares.check.ts OK')
