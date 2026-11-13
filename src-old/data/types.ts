export type DeliveryStatus = 'ACTIVE' | 'PAUSED'
/** Retail jewellery pipeline: enquiry → call → visit booked → walked in → bought. */
export type LeadStatus = 'New' | 'Contacted' | 'Visit booked' | 'Visited' | 'Purchased' | 'Lost'
export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Visit booked', 'Visited', 'Purchased', 'Lost']
export const LOST_REASONS = ['Price / making charges too high', 'Just browsing', 'Design not available', 'Bought elsewhere', 'Unreachable'] as const
export type Intent = 'High' | 'Medium' | 'Low'

/** The business's single Meta ad account. */
export interface Brand {
  name: string
  adAccountId: string
  connected: boolean
  lastSyncAt: string | null
}

export interface Category {
  id: string
  name: string
  color: string
  /** lucide-react icon name used as the collection logo. */
  icon: string
  /** Typical bill value, used for mock sales. */
  avgTicket: number
}

export interface Ad {
  id: string
  adSetId: string
  campaignId: string
  categoryId: string
  name: string
  format: 'Image' | 'Video' | 'Carousel' | 'Reel'
  status: DeliveryStatus
  headline: string
  primaryText: string
  cta: 'Get offer' | 'Learn more' | 'Book now' | 'Send message' | 'Shop now'
  hue: number // for generated thumbnail
}

export interface AdSet {
  id: string
  campaignId: string
  name: string
  audience: string
  status: DeliveryStatus
  ads: Ad[]
}

/** Campaigns are brand-wide and each promotes one product category. */
export interface Campaign {
  id: string
  categoryId: string
  name: string
  status: DeliveryStatus
  objective: 'Lead generation' | 'Messages' | 'Traffic'
  platform: 'Facebook' | 'Instagram' | 'Facebook + Instagram'
  dailyBudget: number
  createdAt: string
  adSets: AdSet[]
}

/** One row per ad per day, same shape as Meta Insights API at level=ad, time_increment=1. */
export interface Insight {
  date: string // YYYY-MM-DD
  categoryId: string
  campaignId: string
  adSetId: string
  adId: string
  spend: number
  impressions: number
  clicks: number
  ctr: number // %
  cpc: number
  leads: number
  cpl: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Manager' | 'Sales' | 'Marketing'
  /** Self-referencing manager. `null` for the root of the tree. Forms the hierarchy for sharing. */
  managerId: string | null
}

/** Modules the generic share table covers. Add one string when a new module opts in. */
export type Module = 'leads' | 'tasks' | 'campaigns' | 'adSets' | 'ads' | 'categories' | 'templates'
export type Permission = 'view' | 'edit'
export const PERMISSIONS: Permission[] = ['view', 'edit']

/** One row of the generic shares table. Works for any module; no per-module table. */
export interface Share {
  id: string
  module: Module
  recordId: string
  sharedBy: string
  sharedWith: string
  permission: Permission
  createdAt: string
}

export interface Note {
  id: string
  text: string
  at: string // ISO
  byId: string
}

export interface Activity {
  id: string
  type: 'created' | 'status' | 'call' | 'whatsapp' | 'email' | 'note' | 'assign' | 'task' | 'sale' | 'visit'
  text: string
  at: string // ISO
  byId?: string
}

export type LeadSource = 'Meta Lead Ad' | 'Walk-in' | 'Phone call' | 'Referral'

export interface Sale {
  amount: number // ₹, bill value
  grams: number
  items: string
  at: string // ISO
}

export interface Lead {
  id: string
  name: string
  phone: string
  email: string
  source: LeadSource
  categoryId: string
  /** Ad attribution; null for leads not from Meta. */
  campaignId: string | null
  adSetId: string | null
  adId: string | null
  status: LeadStatus
  lostReason: string | null
  assigneeId: string | null
  visitAt: string | null
  sale: Sale | null
  /** Instant Form answers. */
  answers: { q: string; a: string }[]
  intent: Intent
  firstContactAt: string | null
  notes: Note[]
  activities: Activity[]
  createdAt: string // ISO
}

export type TaskType = 'call' | 'whatsapp' | 'email' | 'visit'

export interface Task {
  id: string
  leadId: string
  title: string
  type: TaskType
  dueAt: string // ISO
  done: boolean
  assigneeId: string | null
}

export interface Template {
  id: string
  name: string
  channel: 'whatsapp' | 'email'
  stage: LeadStatus | 'Any'
  subject?: string
  /** Supports {{first_name}}, {{agent}}, {{brand}}. */
  body: string
}

export type CallOutcome = 'No answer' | 'Busy' | 'Callback requested' | 'Interested' | 'Not interested'
export const CALL_OUTCOMES: CallOutcome[] = ['No answer', 'Busy', 'Callback requested', 'Interested', 'Not interested']

export interface Settings {
  slaMinutes: number
  hotScore: number
  /** Silver rate in ₹ per kg, entered by the owner each morning. */
  silverRate: number
  silverRateAt: string | null
}

export interface FestiveDate {
  id: string
  name: string
  date: string // YYYY-MM-DD
  /** Lunar-calendar dates move every year; flag them so the owner double-checks. */
  approx: boolean
  tip: string
  categoryIds: string[]
}
