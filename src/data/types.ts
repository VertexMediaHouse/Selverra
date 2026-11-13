export const STAGES = [
  'New lead',
  'Messaged',
  'Call 1',
  'Call 2',
  'Call 3',
  'Call 4',
  'Visit scheduled',
  'Purchased',
  'No reply',
  'Not interested',
  'Future contact',
] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_COLOR: Record<Stage, string> = {
  'New lead': '#4F46E5',
  Messaged: '#0B7FB5',
  'Call 1': '#C08A1E',
  'Call 2': '#B9711B',
  'Call 3': '#A85A17',
  'Call 4': '#8E4513',
  'Visit scheduled': '#7E3AF2',
  Purchased: '#15803D',
  'No reply': '#5B6676',
  'Not interested': '#78716C',
  'Future contact': '#0F8A80',
}

export type Temp = 'Hot' | 'Warm' | 'Cold'
export type Role = 'owner' | 'manager' | 'sales'

export type TaskType = 'Call' | 'Message' | 'Site visit' | 'Future contact' | 'Other'

export interface Lead {
  id: string
  name: string
  phone: string
  source: string
  campaign: string
  adset: string
  collection: string
  stage: Stage
  status: Temp
  rep: string
  received: string
  when: 'today' | 'week' | 'month'
  next: string
  late: boolean
}

export interface Task {
  id: string
  time: string
  type: TaskType
  title: string
  lead: string
  context: string
  rep: string
  due: 'overdue' | 'today' | 'upcoming'
  done: boolean
}

export interface Campaign {
  id: string
  name: string
  objective: 'Leads' | 'Messages' | 'Traffic' | 'Awareness' | 'Engagement'
  status: 'Active' | 'Paused'
  desc: string
  adsets: number
  adsRunning: number
  adsTotal: number
  spend: number
  impressions: number
  clicks: number
  leads: number | null
  visits: number | null
  won: number | null
  value: number | null
}

export interface Ad {
  name: string
  format: 'Reel' | 'Carousel' | 'Image' | 'Video'
  headline: string
  cta: string
  status: 'Active' | 'Paused'
  spend: number
  impressions: number
  ctr: number
  leads: number
}

export interface AdSet {
  id: string
  name: string
  audience: string
  budget: string
  adsLine: string
  spend: number
  ctr: number
  leads: number
  visits: number
  won: number
  ads: Ad[]
}

export const TEMP_PILL: Record<Temp, string> = {
  Hot: 'bg-[#FDE8E6] text-[#9A2A1C]',
  Warm: 'bg-[#FEF3C7] text-[#7A4A06]',
  Cold: 'bg-[#E6EEF9] text-[#1E4E8C]',
}

export const TASK_CHIP: Record<TaskType, string> = {
  Call: 'bg-[#E6F3FA] text-[#0B5A80]',
  Message: 'bg-[#DDF3F1] text-[#0F5F58]',
  'Site visit': 'bg-[#F3E8FF] text-[#6B21A8]',
  'Future contact': 'bg-[#FCE7F3] text-[#9D174D]',
  Other: 'bg-[#EFEEED] text-[#52504D]',
}

export const REPS: Record<string, [string, string]> = {
  'Neha Shah': ['NS', '#7A3B4A'],
  'Amit Patel': ['AP', '#355E7A'],
  'Sneha Rao': ['SR', '#5B6B2E'],
  'Ravi Mehta': ['RM', '#7A5A1F'],
  Unassigned: ['?', '#8A817C'],
}

export const SOURCES = [
  'Instant Form · Instagram',
  'Instant Form · Facebook',
  'Facebook Messenger',
  'Instagram DM',
  'Instagram comment',
  'Facebook comment',
  'Website',
  'Walk-in & phone',
  'Imported / added by hand',
]

export const COLLECTIONS = [
  'Imperial',
  'Regalia',
  'Sannjh',
  'Uphaar',
  'Moksha',
  'Sadaa',
  'Maheer',
  'Nrutya',
  'Varchas',
  'Zoeya',
  'Aangan',
  'Dawaat',
]
