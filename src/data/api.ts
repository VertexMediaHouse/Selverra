// The only module the UI talks to for data. Replace each body with a fetch() to your backend;
// keep the signatures and the UI keeps working.
import * as db from './mock'
import type { Activity, Brand, Campaign, Category, FestiveDate, Insight, Lead, LeadSource, LeadStatus, Module, Permission, Sale, Settings, Share, Task, Template, User } from './types'
import { canAccess, effectivePermission, getSubtree, invalidateSubtreeCache, isAdmin, isAncestor, shareableTargets, wouldLoop } from '../lib/shares'

const respond = <T,>(value: T, ms = 400) =>
  new Promise<T>(resolve => setTimeout(() => resolve(structuredClone(value)), ms))

const now = () => new Date().toISOString()
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const findLead = (id: string) => {
  const lead = db.leads.find(l => l.id === id)
  if (!lead) throw new Error(`Lead ${id} not found`)
  return lead
}
const log = (lead: Lead, type: Activity['type'], text: string, byId: string) =>
  lead.activities.unshift({ id: crypto.randomUUID(), type, text, at: now(), byId })
const markContacted = (lead: Lead) => { lead.firstContactAt ??= now() }
const closeTasks = (leadId: string, onlyVisits = false) =>
  db.tasks.forEach(t => { if (t.leadId === leadId && !t.done && (!onlyVisits || t.type === 'visit')) t.done = true })

/** Modules where an ancestor of the record owner inherits access. Keep in sync with `access` below. */
const ANCESTOR_MODULES: Module[] = ['leads', 'tasks']
/** Per-record owner, by module. Modules with no per-record owner (campaigns, ads…) return ''. */
function recordOwner(module: Module, recordId: string): string {
  if (module === 'leads') return db.leads.find(l => l.id === recordId)?.assigneeId ?? ''
  if (module === 'tasks') return db.tasks.find(t => t.id === recordId)?.assigneeId ?? ''
  return ''
}

/** Extra details some stages need. */
export interface StatusDetails {
  lostReason?: string
  visitAt?: string
  sale?: Omit<Sale, 'at'>
}

function applyStatus(lead: Lead, status: LeadStatus, byId: string, d: StatusDetails = {}) {
  if (lead.status === status && status !== 'Visit booked') return
  lead.status = status
  lead.lostReason = status === 'Lost' ? (d.lostReason ?? lead.lostReason) : null
  if (status !== 'New') markContacted(lead)
  if (status === 'Visit booked' && d.visitAt) {
    lead.visitAt = d.visitAt
    closeTasks(lead.id, true)
    db.tasks.push({ id: crypto.randomUUID(), leadId: lead.id, title: 'Store visit', type: 'visit', dueAt: d.visitAt, done: false, assigneeId: lead.assigneeId })
    log(lead, 'visit', `Store visit booked for ${new Date(d.visitAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`, byId)
  }
  if (status === 'Visited') closeTasks(lead.id, true)
  if (status === 'Purchased' && d.sale) {
    lead.sale = { ...d.sale, at: now() }
    log(lead, 'sale', `Purchased ${d.sale.items || 'items'} · ${inr(d.sale.amount)} · ${d.sale.grams}g`, byId)
  }
  log(lead, 'status', `Status changed to ${status}${status === 'Lost' && d.lostReason ? ` · ${d.lostReason}` : ''}`, byId)
  if (status === 'Purchased' || status === 'Lost') closeTasks(lead.id)
}

export interface NewLeadInput {
  name: string
  phone: string
  email: string
  source: LeadSource
  categoryId: string
  campaignId: string | null
  assigneeId: string | null
}

export const api = {
  /** Demo sign-in: email must exist, password is ignored. Replace with a real POST /session. */
  signIn: (email: string, _password: string): Promise<User> => {
    const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) throw new Error('No account with that email')
    return respond(user, 300)
  },
  getBrand: (): Promise<Brand> => respond(db.brand, 150),
  getCategories: (me: string): Promise<Category[]> => respond(access.categories(me), 200),
  getFestiveDates: (): Promise<FestiveDate[]> => respond(db.festiveDates, 200),
  getCampaigns: (me: string): Promise<Campaign[]> => respond(access.campaigns(me)),
  /** Owner sees everyone; anyone else sees only their own branch of the tree. */
  getUsers: (me: string): Promise<User[]> =>
    respond(isAdmin(db.users.find(u => u.id === me)) ? db.users : getSubtree(db.users, me), 200),
  getLeads: (me: string): Promise<Lead[]> => respond(access.leads(me)),
  getTasks: (me: string): Promise<Task[]> => respond(access.tasks(me)),
  getTemplates: (): Promise<Template[]> => respond(db.templates, 200),
  getSettings: (): Promise<Settings> => respond(db.settings, 150),
  /**
   * Ad-level daily rows for an inclusive YYYY-MM-DD range, optionally one product category.
   * Rows for categories the user cannot access are withheld, so spend never leaks across products.
   */
  getInsights: (me: string, from: string, to: string, categoryId?: string): Promise<Insight[]> => {
    const cats = access.categoryIds(me)
    return respond(db.insights.filter(r => r.date >= from && r.date <= to && cats.has(r.categoryId) && (!categoryId || r.categoryId === categoryId)))
  },

  async syncBrand(): Promise<Brand> {
    db.brand.connected = true
    db.brand.lastSyncAt = now()
    return respond(db.brand, 1200)
  },

  async updateCampaign(id: string, patch: Partial<Pick<Campaign, 'status' | 'dailyBudget'>>): Promise<Campaign> {
    const c = db.campaigns.find(x => x.id === id)
    if (!c) throw new Error(`Campaign ${id} not found`)
    Object.assign(c, patch)
    if (patch.status) c.adSets.forEach(s => { s.status = patch.status!; s.ads.forEach(a => { a.status = patch.status! }) })
    return respond(c, 250)
  },

  /** Bulk status / owner change. */
  async updateLeads(ids: string[], patch: { status?: LeadStatus; details?: StatusDetails; assigneeId?: string | null }, byId: string): Promise<Lead[]> {
    const out = ids.map(id => {
      const lead = findLead(id)
      if (patch.status) applyStatus(lead, patch.status, byId, patch.details)
      if (patch.assigneeId !== undefined && patch.assigneeId !== lead.assigneeId) {
        lead.assigneeId = patch.assigneeId
        db.tasks.forEach(t => { if (t.leadId === id && !t.done) t.assigneeId = patch.assigneeId! })
        log(lead, 'assign', `Assigned to ${db.users.find(u => u.id === patch.assigneeId)?.name ?? 'nobody'}`, byId)
      }
      return lead
    })
    return respond(out, 200)
  },

  async addNote(id: string, text: string, byId: string): Promise<Lead> {
    const lead = findLead(id)
    lead.notes.unshift({ id: crypto.randomUUID(), text, at: now(), byId })
    log(lead, 'note', 'Added a note', byId)
    return respond(lead, 150)
  },

  /** Call outcome, WhatsApp or email sent. Counts as first contact. */
  async logContact(id: string, channel: 'call' | 'whatsapp' | 'email', text: string, byId: string): Promise<Lead> {
    const lead = findLead(id)
    markContacted(lead)
    log(lead, channel, text, byId)
    return respond(lead, 150)
  },

  async createLead(input: NewLeadInput, byId: string): Promise<Lead> {
    const lead: Lead = {
      ...input, id: `L${1000 + db.leads.length + 1}`, adSetId: null, adId: null, status: 'New', lostReason: null, visitAt: null, sale: null,
      answers: [], intent: 'Medium', firstContactAt: null, notes: [], createdAt: now(),
      activities: [{ id: crypto.randomUUID(), type: 'created', text: `Lead added (${input.source})`, at: now(), byId }],
    }
    db.leads.unshift(lead)
    return respond(lead, 250)
  },

  async addTask(input: Omit<Task, 'id' | 'done'>, byId: string): Promise<Task> {
    const task: Task = { ...input, id: crypto.randomUUID(), done: false }
    db.tasks.push(task)
    log(findLead(input.leadId), 'task', `Scheduled: ${input.title}`, byId)
    return respond(task, 150)
  },

  async updateTask(id: string, patch: Partial<Pick<Task, 'done' | 'dueAt' | 'title'>>, byId: string): Promise<Task> {
    const task = db.tasks.find(t => t.id === id)
    if (!task) throw new Error(`Task ${id} not found`)
    if (patch.done && !task.done) log(findLead(task.leadId), 'task', `Completed: ${task.title}`, byId)
    Object.assign(task, patch)
    return respond(task, 150)
  },

  async saveTemplate(t: Template): Promise<Template> {
    const i = db.templates.findIndex(x => x.id === t.id)
    if (i >= 0) db.templates[i] = t
    else db.templates.push(t)
    return respond(t, 200)
  },
  async deleteTemplate(id: string): Promise<void> {
    const i = db.templates.findIndex(x => x.id === id)
    if (i >= 0) db.templates.splice(i, 1)
    return respond(undefined, 150)
  },

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    Object.assign(db.settings, patch)
    return respond(db.settings, 150)
  },

  // ---- hierarchy ----
  /** Set a user's manager. Rejects cycles and self-assignment. */
  async setManager(userId: string, managerId: string | null): Promise<User> {
    const u = db.users.find(x => x.id === userId)
    if (!u) throw new Error(`User ${userId} not found`)
    if (managerId && !db.users.some(x => x.id === managerId)) throw new Error(`Manager ${managerId} not found`)
    if (managerId && wouldLoop(db.users, userId, managerId)) throw new Error('That would create a circular hierarchy')
    u.managerId = managerId
    invalidateSubtreeCache()
    return respond(u, 150)
  },
  /** Soft-delete: drop from the tree so no dangling managerId, keep the row for audit. */
  async deactivateUser(userId: string): Promise<User> {
    const u = db.users.find(x => x.id === userId)
    if (!u) throw new Error(`User ${userId} not found`)
    u.managerId = null
    db.users.forEach(x => { if (x.managerId === userId) x.managerId = null })
    invalidateSubtreeCache()
    return respond(u, 150)
  },

  // ---- shares ----
  async createShare(input: { module: Module; recordId: string; sharedWith: string; permission: Permission }, byId: string): Promise<Share> {
    const sharer = db.users.find(u => u.id === byId)
    if (!sharer) throw new Error('Not signed in')
    if (!isAdmin(sharer)) {
      if (!shareableTargets(db.users, db.shares, byId).some(t => t.id === input.sharedWith))
        throw new Error('Not in your subtree')
      // Can't share what you don't hold, or grant above your own permission.
      const owner = recordOwner(input.module, input.recordId)
      const held = effectivePermission(db.users, db.shares, { user: byId, module: input.module, recordId: input.recordId, owner, ancestorAccess: ANCESTOR_MODULES.includes(input.module) })
      if (!held) throw new Error("You don't have access to this record")
      if (input.permission === 'edit' && held !== 'edit') throw new Error('You can only re-share view access')
    }
    const existing = db.shares.find(s => s.module === input.module && s.recordId === input.recordId && s.sharedWith === input.sharedWith)
    if (existing) { existing.permission = input.permission; existing.sharedBy = byId; existing.createdAt = now(); return respond(existing, 150) }
    const share: Share = { id: `sh${db.shares.length + 1}`, ...input, sharedBy: byId, createdAt: now() }
    db.shares.push(share)
    return respond(share, 150)
  },
  async revokeShare(id: string, byId: string): Promise<void> {
    const i = db.shares.findIndex(s => s.id === id)
    if (i < 0) throw new Error(`Share ${id} not found`)
    const s = db.shares[i]
    // Sharer, any ancestor of the sharer, or the Owner may revoke.
    if (s.sharedBy !== byId && !isAncestor(db.users, byId, s.sharedBy) && !isAdmin(db.users.find(u => u.id === byId)))
      throw new Error('Not allowed to revoke this share')
    db.shares.splice(i, 1)
    return respond(undefined, 150)
  },
  async listShares(module?: Module, recordId?: string): Promise<Share[]> {
    return respond(db.shares.filter(s => (!module || s.module === module) && (!recordId || s.recordId === recordId)))
  },
}

/**
 * Access-gated reads. Every UI query routes through these; UI hiding alone is not enough.
 * `me` is the signed-in user id. `ancestorAccess` is a per-module opt-in (leads: on, default off).
 */
export const access = {
  /**
   * Product categories the user may work in. The owner sees every category; anyone else sees
   * only the ones shared with them, so a manager is confined to their assigned products.
   * Categories have no per-record owner, so a share row is the only way in.
   */
  categories(me: string): Category[] {
    return db.categories.filter(c => canAccess(db.users, db.shares, {
      user: me, module: 'categories', recordId: c.id, owner: '', action: 'view', ancestorAccess: false,
    }))
  },
  /** Category ids the user may work in, for filtering other modules. */
  categoryIds(me: string): Set<string> {
    return new Set(access.categories(me).map(c => c.id))
  },
  leads(me: string, ancestorAccess = true): Lead[] {
    // A lead belongs to a product category: no access to the category, no access to its leads.
    const cats = access.categoryIds(me)
    return db.leads.filter(l => cats.has(l.categoryId) && canAccess(db.users, db.shares, {
      user: me, module: 'leads', recordId: l.id, owner: l.assigneeId ?? '', action: 'view', ancestorAccess,
      parent: l.campaignId ? { module: 'campaigns', recordId: l.campaignId } : undefined, // campaign share cascades to its leads
    }))
  },
  /** Campaigns promote one category each, so they follow the same gate. */
  campaigns(me: string): Campaign[] {
    const cats = access.categoryIds(me)
    return db.campaigns.filter(c => cats.has(c.categoryId))
  },
  tasks(me: string, ancestorAccess = true): Task[] {
    const leadIds = new Set(access.leads(me, ancestorAccess).map(l => l.id))
    return db.tasks.filter(t => leadIds.has(t.leadId) && canAccess(db.users, db.shares, { user: me, module: 'tasks', recordId: t.id, owner: t.assigneeId ?? '', action: 'view', ancestorAccess }))
  },
  myShares(me: string): Share[] {
    return db.shares.filter(s => s.sharedWith === me || s.sharedBy === me)
  },
  permission(me: string, module: Module, recordId: string, owner: string): Permission | null {
    return effectivePermission(db.users, db.shares, { user: me, module, recordId, owner })
  },
}

/** Days of insight history available. */
export const HISTORY_DAYS = db.DAYS
