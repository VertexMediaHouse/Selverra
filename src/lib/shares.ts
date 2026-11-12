// Hierarchy + sharing. One gate: the data layer (mock.ts / api.ts). UI hiding is not enough.
import type { Module, Permission, Share, User } from '../data/types'

// ponytail: subtree cache. Invalidation happens in mock.ts on any user mutation; at n=8 it is
// overkill, but shareableTargets runs on every render of the Share dialog.
const subtreeCache = new Map<string, User[]>()
export function invalidateSubtreeCache() { subtreeCache.clear() }

/** All descendants of `userId`, including `userId` itself. Cached. */
export function getSubtree(users: User[], userId: string): User[] {
  const hit = subtreeCache.get(userId)
  if (hit) return hit
  const byId = new Map(users.map(u => [u.id, u]))
  const out: User[] = []
  const stack = [userId]
  while (stack.length) {
    const id = stack.pop()!
    if (out.some(x => x.id === id)) continue
    const u = byId.get(id)
    if (!u) continue
    out.push(u)
    for (const c of users) if (c.managerId === id) stack.push(c.id)
  }
  subtreeCache.set(userId, out)
  return out
}

/** Walk up from `start`'s manager chain. Returns the id hit, or null. `stop` = target to find. */
export function walkUp(users: User[], start: string, stop: string): string | null {
  if (start === stop) return stop
  const byId = new Map(users.map(u => [u.id, u]))
  let cur = byId.get(start)?.managerId ?? null
  let guard = 0
  while (cur && guard++ < users.length) {
    if (cur === stop) return stop
    cur = byId.get(cur)?.managerId ?? null
  }
  return null
}

/** `a` is an ancestor of `b`, or the same user. */
export const isAncestor = (users: User[], a: string, b: string): boolean => walkUp(users, b, a) === a
/** Would setting `b.managerId = managerId` on user `userId` close a loop? Returns the id or null. */
export const wouldLoop = (users: User[], userId: string, managerId: string): string | null =>
  userId === managerId ? userId : walkUp(users, managerId, userId)

/** Only the Owner is a global admin. A Manager is a bounded subtree node, not omnipotent. */
export const isAdmin = (u: User | undefined): boolean => !!u && u.role === 'Owner'

/** Does `user` hold `action` on this (module, recordId) via a direct share row? */
function sharedAccess(shares: Share[], user: string, module: Module, recordId: string, action: Permission): boolean {
  const mine = shares.filter(s => s.module === module && s.recordId === recordId && s.sharedWith === user)
  if (mine.some(s => s.permission === 'edit')) return true
  return mine.some(s => s.permission === 'view') && action === 'view'
}

/**
 * Central access check. A user can act on a record if they own it, were shared it, are an
 * ancestor of the owner (when `ancestorAccess` is on), or hold a share on the record's `parent`
 * (a campaign share cascades to every lead under it). The Owner (admin) always passes; a Manager
 * only through the subtree/ancestor/parent path, bounded to what their branch holds.
 * A share grants at most its permission level: an 'edit' share grants edit, 'view' only view.
 */
export function canAccess(
  users: User[],
  shares: Share[],
  input: { user: string; module: Module; recordId: string; owner: string; action: Permission; ancestorAccess: boolean; parent?: { module: Module; recordId: string } },
): boolean {
  const { user, module, recordId, owner, action, ancestorAccess, parent } = input
  const u = users.find(x => x.id === user)
  if (!u) return false
  if (user === owner || isAdmin(u)) return true
  if (sharedAccess(shares, user, module, recordId, action)) return true
  if (parent && sharedAccess(shares, user, parent.module, parent.recordId, action)) return true
  if (ancestorAccess && isAncestor(users, user, owner)) return true
  return false
}

/** Users a sharer may target: their own subtree (downward only). Owner: anyone. */
export function shareableTargets(users: User[], _shares: Share[], sharerId: string): User[] {
  const sharer = users.find(u => u.id === sharerId)
  if (!sharer) return []
  if (isAdmin(sharer)) return users
  return getSubtree(users, sharerId).filter(u => u.id !== sharerId)
}

/** Highest permission a user holds on a record (owner / admin / ancestor-of-owner = edit). */
export function effectivePermission(
  users: User[], shares: Share[], input: { user: string; module: Module; recordId: string; owner: string; ancestorAccess?: boolean },
): Permission | null {
  const { user, module, recordId, owner, ancestorAccess } = input
  const u = users.find(x => x.id === user)
  if (!u) return null
  if (user === owner || isAdmin(u)) return 'edit'
  if (ancestorAccess && owner && isAncestor(users, user, owner)) return 'edit'
  const mine = shares.filter(s => s.module === module && s.recordId === recordId && s.sharedWith === user)
  return mine.some(s => s.permission === 'edit') ? 'edit' : mine.some(s => s.permission === 'view') ? 'view' : null
}

/** Shares on this record a user may manage/revoke. Owner: all. Others: those they granted
 * to someone still in their subtree (downward only). */
export function reShareable(users: User[], shares: Share[], input: { user: string; module: Module; recordId: string; owner: string }): Share[] {
  const { user, module, recordId } = input
  const u = users.find(x => x.id === user)
  if (isAdmin(u)) return shares.filter(s => s.module === module && s.recordId === recordId)
  const mine = shares.filter(s => s.module === module && s.recordId === recordId && s.sharedBy === user)
  const targets = new Set(shareableTargets(users, shares, user).map(t => t.id))
  return mine.filter(s => targets.has(s.sharedWith))
}