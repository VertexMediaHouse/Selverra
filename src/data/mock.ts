// All mock data lives here. The UI never imports this file directly: it goes through src/data/api.ts,
// so swapping in a real database means rewriting api.ts only. Rename the brand, outlets and categories freely.
import type { Activity, Ad, AdSet, Brand, Campaign, Category, FestiveDate, Insight, Intent, Lead, LeadStatus, Sale, Settings, Share, Task, Template, User } from './types'
import { LOST_REASONS } from './types'

// Seeded RNG so data is stable between reloads.
let seed = 20261106
const rand = () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (a: number, b: number) => a + rand() * (b - a)
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]
const weighted = <T,>(items: readonly T[], weights: readonly number[]): T => {
  let x = rand() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) if ((x -= weights[i]) <= 0) return items[i]
  return items[items.length - 1]
}
const round2 = (n: number) => Math.round(n * 100) / 100

export const DAYS = 60
const HOUR = 3600_000
const MIN = 60_000
const NOW = Date.now()
const today = new Date()
today.setHours(0, 0, 0, 0)
const isoDay = (d: Date) => d.toLocaleDateString('en-CA') // YYYY-MM-DD, local time
const daysAgo = (n: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d
}

export const brand: Brand = { name: 'Rajat Silver', adAccountId: 'act_4418820193', connected: true, lastSyncAt: new Date(NOW - 18 * MIN).toISOString() }

// The 12 Salvera collections. Each is a product line the campaigns promote.
export const categories: Category[] = [
  { id: 'k1', name: 'Imperial', color: '#4a2e33', icon: 'Sofa', avgTicket: 85000 },            // Furniture
  { id: 'k2', name: 'Regalia', color: '#9c6b74', icon: 'Glasses', avgTicket: 9000 },           // Accessories
  { id: 'k3', name: 'Sannjh', color: '#a4603f', icon: 'Gem', avgTicket: 52000 },               // Bridal
  { id: 'k4', name: 'Uphaar', color: '#c08a3e', icon: 'Gift', avgTicket: 4200 },               // Gifting
  { id: 'k5', name: 'Moksha', color: '#a8576b', icon: 'Landmark', avgTicket: 18000 },          // Idols & temple decor
  { id: 'k6', name: 'Sadaa', color: '#4f93b5', icon: 'Sparkles', avgTicket: 5200 },            // Trending sterling silver jewellery
  { id: 'k7', name: 'Maheer', color: '#7a6ca8', icon: 'Diamond', avgTicket: 3800 },            // 925 delicate
  { id: 'k8', name: 'Nrutya', color: '#5a6a4e', icon: 'Flower2', avgTicket: 2400 },            // Oxidised
  { id: 'k9', name: 'Varchas', color: '#7d8a4e', icon: 'User', avgTicket: 9000 },              // Men's
  { id: 'k10', name: 'Zoeya', color: '#5a9e86', icon: 'Baby', avgTicket: 2800 },               // Kids
  { id: 'k11', name: 'Aangan', color: '#8a7b6a', icon: 'Home', avgTicket: 14000 },             // Home decor
  { id: 'k12', name: 'Dawaat', color: '#8a8378', icon: 'UtensilsCrossed', avgTicket: 26000 },  // Utensils
]
const categoryById = new Map(categories.map(c => [c.id, c]))

export const users: User[] = [
  // Sign-in emails: owner@gmail.com / manager@gmail.com / sales@gmail.com (any password).
  { id: 'u1', name: 'Rakesh Soni', email: 'owner@gmail.com', role: 'Owner', managerId: null },
  { id: 'u2', name: 'Kabir Shah', email: 'kabir@rajatsilver.in', role: 'Marketing', managerId: 'u1' },
  { id: 'u3', name: 'Meena Agarwal', email: 'manager@gmail.com', role: 'Manager', managerId: 'u1' },
  { id: 'u4', name: 'Imran Qureshi', email: 'sales@gmail.com', role: 'Sales', managerId: 'u3' },
  { id: 'u5', name: 'Priya Jain', email: 'priya@rajatsilver.in', role: 'Sales', managerId: 'u3' },
  { id: 'u6', name: 'Vikas Sharma', email: 'vikas@rajatsilver.in', role: 'Sales', managerId: 'u4' },
  { id: 'u7', name: 'Sunita Rathore', email: 'sunita@rajatsilver.in', role: 'Sales', managerId: 'u4' },
  { id: 'u8', name: 'Arjun Mathur', email: 'arjun@rajatsilver.in', role: 'Sales', managerId: 'u5' },
]
// Hierarchy: u1 → u3 → u4 → u6/u7, u5 → u8. u2 is a direct report of the owner.
// Typical minutes to first contact per person: makes the speed leaderboard interesting.
const repSpeed: Record<string, number> = { u1: 40, u3: 12, u4: 30, u5: 6, u6: 18, u7: 45, u8: 110 }
// Sales staff who take enquiries (owner u1 can too; marketing u2 does not).
const salesIds = ['u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u1']

export const settings: Settings = { slaMinutes: 15, hotScore: 70, silverRate: 105000, silverRateAt: null }

type Shock = 'spike' | 'fatigue' | undefined
// [category, name, status, lead quality 0..1, conversion multiplier, days since paused, shock]
const campaignSpecs: [string, string, Campaign['status'], number, number, number?, Shock?][] = [
  ['k1', 'Imperial Furniture – Lead Form', 'ACTIVE', 0.5, 0.7],
  ['k1', 'Imperial – Showroom Walkthrough Reels', 'ACTIVE', 0.4, 0.6, undefined, 'fatigue'],
  ['k2', 'Regalia Accessories – Carousel', 'ACTIVE', 0.55, 1.3],
  ['k3', 'Sannjh Bridal – Wedding Season', 'ACTIVE', 0.5, 0.6],
  ['k3', 'Sannjh – Broad Interests', 'ACTIVE', 0.22, 0.5],
  ['k4', 'Uphaar Gifting – Festive Offer', 'ACTIVE', 0.7, 1.8],
  ['k5', 'Moksha Idols & Temple Decor – Lead Form', 'ACTIVE', 0.6, 0.9],
  ['k6', 'Sadaa Sterling Silver – Retargeting', 'ACTIVE', 0.68, 1.5],
  ['k6', 'Sadaa – Trending Reels, Women 22–40', 'ACTIVE', 0.45, 1.2],
  ['k7', 'Maheer 925 Delicate – Instagram', 'ACTIVE', 0.5, 1.2],
  ['k8', 'Nrutya Oxidised – Carousel', 'ACTIVE', 0.55, 1.3],
  ['k9', "Varchas Men's – Video", 'ACTIVE', 0.4, 0.8, undefined, 'spike'],
  ['k10', 'Zoeya Kids – Nazariya & Kada', 'ACTIVE', 0.5, 1.0],
  ['k11', 'Aangan Home Decor – Lookalike', 'ACTIVE', 0.4, 0.8],
  ['k12', 'Dawaat Utensils – Gifting', 'ACTIVE', 0.45, 0.6, undefined, 'fatigue'],
]
const creatives: Record<string, [headline: string, text: string][]> = {
  k1: [['Imperial silver furniture', 'Handcrafted silver-clad chairs, tables and swings. Book a showroom walkthrough.'], ['Heirloom silver furniture', 'Royal designs for your living room. Custom orders welcome.']],
  k2: [['Regalia silver accessories', 'Clutches, frames and décor accents in pure silver. 200+ designs in store.'], ['Statement silver accessories', 'Gift-ready and hallmarked. Visit our showroom.']],
  k3: [['Sannjh bridal silver', 'Payal, bichhiya, kamarbandh and more. Book a private bridal viewing.'], ['Complete bridal silver set', 'Custom weight and designs. Talk to our bridal expert.']],
  k4: [['Uphaar gifting silver from 10g', "Coins, frames and gift boxes at today's silver rate. Reserve now."], ['Gift silver this festive season', 'Corporate and personal gifting. Gift-boxed and hallmarked.']],
  k5: [['Moksha silver idols & temple decor', 'Lakshmi-Ganesh idols, diyas and pooja articles. Hallmarked.'], ['Complete pooja thali sets', 'Diya, kalash, bell and plate in pure silver. Perfect for Diwali.']],
  k6: [['Sadaa trending sterling silver', "Fair making charges. Exchange your old silver at today's rate."], ['Daily-wear sterling pieces', 'Lightweight, skin-friendly, hallmarked. Book a store visit.']],
  k7: [['Maheer 925 delicate jewellery', 'Minimal everyday pieces in 925 silver. Engraving free this month.'], ['Delicate silver for everyday', 'Chains, studs and rings. 200+ designs in store.']],
  k8: [['Nrutya oxidised silver', 'Bold oxidised designs, stone-set and polished. Try it on in store.'], ['Oxidised statement pieces', 'Traditional and modern designs. Visit our showroom.']],
  k9: [["Varchas men's silver", 'Solid silver kada, 40g to 120g, and bracelets. Try it on in store.'], ['Bold silver for men', 'Oxidised, polished and stone-set designs.']],
  k10: [['Zoeya kids silver', 'Nazariya, baby kada and anklets with a safety finish.']],
  k11: [['Aangan silver home decor', 'Photo frames, bowls and showpieces in pure silver. Ideal for gifting.'], ['Silver décor for your home', 'Handcrafted accents that last generations.']],
  k12: [['Dawaat silver utensils', 'Glass, thali, bowls and spoons. Ideal for weddings and gifting.'], ['Silver glass for good health', 'Pure silver tumblers from 50g. Gift-boxed.']],
}
const audiences = ['Women 22–45, Jaipur 25km', 'Men 25–50, Jaipur', 'Lookalike 1% – Buyers', 'Custom: Website visitors 30d', 'Interest: Wedding planning', 'Advantage+ audience', 'Engaged IG followers']
const ctas: Ad['cta'][] = ['Get offer', 'Learn more', 'Book now', 'Send message', 'Shop now']
const formats: Ad['format'][] = ['Image', 'Video', 'Carousel', 'Reel']

interface AdModel { ad: Ad; baseSpend: number; ctr: number; cvr: number; pausedAgo: number; shock: Shock; fatigue: boolean }
const models: AdModel[] = []
const quality: Record<string, number> = {}

export const campaigns: Campaign[] = campaignSpecs.map(([categoryId, name, status, q, conv, pausedAgo = -1, shock], i) => {
  const id = `c${i + 1}`
  quality[id] = q
  let baseSum = 0
  const adSets: AdSet[] = Array.from({ length: 2 + Math.floor(rand() * 2) }, (_, j) => {
    const adSetId = `${id}-as${j + 1}`
    const audience = pick(audiences)
    const ads: Ad[] = Array.from({ length: 2 + Math.floor(rand() * 2) }, (_, k) => {
      const [headline, primaryText] = pick(creatives[categoryId])
      const ad: Ad = {
        id: `${adSetId}-ad${k + 1}`, adSetId, campaignId: id, categoryId,
        name: `${headline.replace(/[·.,!:₹'"]/g, '').split(/\s+/).slice(0, 3).join(' ')} – ${pick(['V1', 'V2', 'Hindi', 'EN'])}`,
        format: pick(formats), status, headline, primaryText, cta: pick(ctas), hue: Math.floor(between(15, 50)),
      }
      const baseSpend = between(40, 120)
      baseSum += baseSpend
      models.push({ ad, baseSpend, ctr: between(0.8, 2.6), cvr: conv * between(0.05, 0.12), pausedAgo, shock, fatigue: shock === 'fatigue' ? k === 0 : rand() < 0.04 })
      return ad
    })
    return { id: adSetId, campaignId: id, name: `${audience.split(',')[0]} – ${pick(['Mobile', 'All placements', 'Feeds', 'Stories'])}`, audience, status, ads }
  })
  return {
    id, categoryId, name, status, adSets,
    dailyBudget: Math.round((baseSum * between(0.92, 1.4)) / 50) * 50,
    objective: pick(['Lead generation', 'Lead generation', 'Messages'] as const),
    platform: pick(['Facebook + Instagram', 'Instagram', 'Facebook'] as const),
    createdAt: daysAgo(DAYS + Math.floor(rand() * 40)).toISOString(),
  } satisfies Campaign
})
const campaignById = new Map(campaigns.map(c => [c.id, c]))

// Daily insights per ad. Leads are allocated afterwards so CRM leads == insight leads.
const expected: number[] = []
export const insights: Insight[] = []
for (let d = DAYS - 1; d >= 0; d--) {
  const date = daysAgo(d)
  const weekday = [1.1, 0.95, 0.95, 1, 1, 1.05, 1.15][date.getDay()] // weekends are busier for jewellery
  const festive = 0.85 + ((DAYS - d) / DAYS) * 0.45 // ramp into Dhanteras / Diwali
  for (const m of models) {
    if (m.pausedAgo >= 0 && d < m.pausedAgo) continue
    const spike = m.shock === 'spike' && d < 7
    const fatigue = m.fatigue ? 1 - 0.55 * Math.max(0, (35 - d) / 35) : 1
    const spend = m.baseSpend * weekday * festive * between(0.75, 1.25) * (spike ? 1.2 : 1)
    const impressions = Math.round((spend / between(90, 160)) * 1000)
    const clicks = Math.round(impressions * (m.ctr / 100) * fatigue * between(0.85, 1.15))
    expected.push(clicks * m.cvr * (spike ? 0.35 : 1))
    insights.push({ date: isoDay(date), categoryId: m.ad.categoryId, campaignId: m.ad.campaignId, adSetId: m.ad.adSetId, adId: m.ad.id, spend: round2(spend), impressions, clicks, ctr: 0, cpc: 0, leads: 0, cpl: 0 })
  }
}

const firstNames = ['Pooja', 'Anjali', 'Ritu', 'Kavita', 'Sunita', 'Neha', 'Priyanka', 'Komal', 'Swati', 'Rekha', 'Divya', 'Shalini', 'Mamta', 'Rahul', 'Amit', 'Vikram', 'Rohit', 'Manish', 'Sanjay', 'Gaurav', 'Ankit', 'Deepika', 'Monika', 'Bhavna', 'Nikita', 'Sapna', 'Yogesh', 'Lalit', 'Seema', 'Harsh']
const lastNames = ['Sharma', 'Agarwal', 'Jain', 'Gupta', 'Khandelwal', 'Rathore', 'Shekhawat', 'Meena', 'Saini', 'Mathur', 'Goyal', 'Mittal', 'Choudhary', 'Kumawat', 'Soni', 'Bansal', 'Verma']
const noteTexts = ['Wants to see designs on WhatsApp first.', 'Coming with family on Sunday.', 'Asked about making charges per gram.', 'Wants to exchange old silver.', 'Comparing with another shop in Johari Bazaar.', 'Gift for sister, budget around ₹5,000.', 'Needs it before the wedding date.', 'Not reachable, try evening.']
const saleItems: Record<string, string[]> = {
  k1: ['Silver-clad chair', 'Silver swing (jhula)', 'Carved silver table'], k2: ['Silver clutch', 'Silver photo frame', 'Décor accent'],
  k3: ['Bridal payal + bichhiya', 'Kamarbandh', 'Full bridal set'], k4: ['Silver coin 10g', 'Silver coin 20g', 'Gift box with coins'],
  k5: ['Lakshmi-Ganesh idol', 'Pooja thali set', 'Silver diya pair'], k6: ['Rope chain 20"', 'Sterling bracelet', 'Daily-wear anklet'],
  k7: ['Delicate studs', 'Thin chain 18"', 'Minimal ring'], k8: ['Oxidised ring', 'Oxidised kada', 'Stone-set pendant'],
  k9: ["Men's kada", "Men's bracelet", 'Oxidised kada'], k10: ['Baby kada pair', 'Nazariya bracelet'],
  k11: ['Silver photo frame', 'Silver showpiece', 'Silver bowl'], k12: ['Silver glass set', 'Dinner set (6 pcs)', 'Silver bowl'],
}

const statusPath: Record<LeadStatus, LeadStatus[]> = {
  New: [], Contacted: ['Contacted'], 'Visit booked': ['Contacted', 'Visit booked'], Visited: ['Contacted', 'Visit booked', 'Visited'],
  Purchased: ['Contacted', 'Visit booked', 'Visited', 'Purchased'], Lost: ['Contacted', 'Lost'],
}
const INTENTS: Intent[] = ['High', 'Medium', 'Low']
const LEAD_COUNT = 380
const totalExpected = expected.reduce((a, b) => a + b, 0)
let leadNo = 1000

function makeSale(categoryId: string, at: number): Sale {
  const amount = Math.round((categoryById.get(categoryId)!.avgTicket * Math.exp((rand() - 0.5) * 1.1)) / 50) * 50
  const perGram = (settings.silverRate / 1000) * between(1.18, 1.35) // metal + making charges
  return { amount, grams: Math.round(amount / perGram), items: pick(saleItems[categoryId]), at: new Date(at).toISOString() }
}

function makeLead(opts: { categoryId: string; campaignId: string | null; adSetId: string | null; adId: string | null; created: Date; source: Lead['source'] }): Lead {
  const { created, categoryId } = opts
  const q = opts.campaignId ? quality[opts.campaignId] : 0.6
  const id = `L${++leadNo}`
  const age = (NOW - created.getTime()) / (24 * HOUR)

  const r = rand()
  const intentIdx = r < q * 0.6 ? 0 : r < q * 0.6 + 0.35 ? 1 : 2
  const intent = INTENTS[intentIdx]
  const answers = [
    { q: 'What are you looking for?', a: categoryById.get(categoryId)!.name },
    { q: 'When do you plan to buy?', a: ['This week', 'This month', 'Just browsing'][intentIdx] },
    { q: 'Budget', a: pick(['Under ₹3,000', '₹3,000 – ₹10,000', '₹10,000 – ₹50,000', '₹50,000+']) },
    { q: 'Occasion', a: pick(['Gift', 'Wedding', 'Festival', 'Self', 'Pooja']) },
  ]

  let status: LeadStatus
  if (age < 1.5) status = rand() < 0.6 ? 'New' : rand() < 0.7 ? 'Contacted' : 'Visit booked'
  else {
    const engage = q * (intent === 'High' ? 1.35 : intent === 'Low' ? 0.45 : 1)
    status = rand() < 0.22 ? 'Contacted'
      : rand() < engage ? weighted<LeadStatus>(['Visit booked', 'Visited', 'Purchased'], age < 6 ? [0.45, 0.2, 0.35] : [0.08, 0.27, 0.65])
      : 'Lost'
  }
  const assigneeId = status === 'New' && rand() < 0.35 ? null : pick(salesIds)
  const by = assigneeId ?? 'u1'
  const first = pick(firstNames)
  const last = pick(lastNames)

  let t = created.getTime()
  let firstContactAt: string | null = null
  let visitAt: string | null = null
  let sale: Sale | null = null
  const activities: Activity[] = [{ id: `${id}-a0`, type: 'created', text: opts.source === 'Meta Lead Ad' ? 'Enquiry via Instant Form' : `Lead added (${opts.source})`, at: created.toISOString() }]
  const path: LeadStatus[] = status === 'Lost' && rand() < 0.3 ? ['Contacted', 'Visit booked', 'Visited', 'Lost'] : statusPath[status]
  path.forEach((s, k) => {
    if (s === 'Contacted') {
      t = Math.min(t + (repSpeed[by] ?? 30) * Math.exp((rand() - 0.5) * 2.4) * MIN, NOW)
      firstContactAt = new Date(t).toISOString()
      const viaCall = rand() < 0.6
      activities.push({ id: `${id}-c`, type: viaCall ? 'call' : 'whatsapp', text: viaCall ? `Call · ${pick(['Interested', 'Callback requested', 'Interested'])}` : 'WhatsApp · Sent catalogue', at: firstContactAt, byId: by })
    } else if (s === 'Visit booked') {
      t = Math.min(t + between(1, 20) * HOUR, NOW)
      // Booked visits for current leads are mostly upcoming; for older leads they already happened.
      const v = new Date(status === 'Visit booked' ? NOW + between(-20, 72) * HOUR : t + between(20, 72) * HOUR)
      v.setHours(Math.min(20, Math.max(11, v.getHours())), rand() < 0.5 ? 0 : 30, 0, 0)
      visitAt = v.toISOString()
      activities.push({ id: `${id}-v`, type: 'visit', text: `Store visit booked for ${v.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`, at: new Date(t).toISOString(), byId: by })
    } else if (s === 'Visited' && visitAt) t = Math.min(Math.max(t, new Date(visitAt).getTime()), NOW)
    else t = Math.min(t + between(0.5, 30) * HOUR, NOW)
    if (s === 'Purchased') {
      sale = makeSale(categoryId, t)
      activities.push({ id: `${id}-s`, type: 'sale', text: `Purchased ${sale.items} · ₹${sale.amount.toLocaleString('en-IN')} · ${sale.grams}g`, at: sale.at, byId: by })
    }
    activities.push({ id: `${id}-a${k + 1}`, type: 'status', text: `Status changed to ${s}`, at: new Date(t).toISOString(), byId: by })
  })
  const notes = status !== 'New' && rand() < 0.5 ? [{ id: `${id}-n1`, text: pick(noteTexts), at: new Date(Math.min(t + HOUR, NOW)).toISOString(), byId: by }] : []

  return {
    id, categoryId, source: opts.source,
    name: `${first} ${last}`,
    phone: `+91 ${pick(['98', '97', '99', '94', '88', '70'])}${String(Math.floor(rand() * 1e8)).padStart(8, '0')}`,
    email: `${first}.${last}${Math.floor(rand() * 90 + 10)}@${pick(['gmail.com', 'gmail.com', 'yahoo.in', 'outlook.com'])}`.toLowerCase(),
    campaignId: opts.campaignId, adSetId: opts.adSetId, adId: opts.adId,
    status,
    lostReason: status === 'Lost' ? (path.includes('Visited') ? pick(['Price / making charges too high', 'Design not available'] as const) : pick(LOST_REASONS)) : null,
    assigneeId, visitAt, sale, answers, intent, firstContactAt, notes,
    activities: activities.sort((a, b) => b.at.localeCompare(a.at)),
    createdAt: created.toISOString(),
  }
}

const metaLeads = Array.from({ length: LEAD_COUNT }, () => {
  // Weighted pick of an insight row by its expected leads.
  let x = rand() * totalExpected
  let idx = 0
  while (x > expected[idx] && idx < expected.length - 1) x -= expected[idx++]
  const row = insights[idx]
  row.leads++
  const created = new Date(`${row.date}T00:00:00`)
  created.setTime(Math.min(created.getTime() + between(8, 22) * HOUR, NOW - between(2, 30) * MIN))
  return makeLead({ categoryId: campaignById.get(row.campaignId)!.categoryId, campaignId: row.campaignId, adSetId: row.adSetId, adId: row.adId, created, source: 'Meta Lead Ad' })
})
const offlineLeads = Array.from({ length: 18 }, () =>
  makeLead({ categoryId: pick(categories).id, campaignId: null, adSetId: null, adId: null, created: new Date(NOW - between(1, DAYS * 24) * HOUR), source: pick(['Walk-in', 'Phone call', 'Referral'] as const) }),
)
export const leads: Lead[] = [...metaLeads, ...offlineLeads].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

for (const r of insights) {
  r.ctr = r.impressions ? round2((r.clicks / r.impressions) * 100) : 0
  r.cpc = r.clicks ? round2(r.spend / r.clicks) : 0
  r.cpl = r.leads ? round2(r.spend / r.leads) : 0
}

// Next step for every open lead; some overdue, some today, some upcoming (shop hours only).
const nextSteps: Partial<Record<LeadStatus, [Task['type'], string][]>> = {
  New: [['call', 'First call'], ['whatsapp', 'Send catalogue on WhatsApp']],
  Contacted: [['call', 'Follow-up call'], ['whatsapp', 'Share designs & price'], ['call', 'Invite for store visit']],
  Visited: [['call', 'Follow up after visit'], ['whatsapp', 'Send photos of shortlisted designs']],
}
let taskNo = 0
export const tasks: Task[] = leads.flatMap((l): Task[] => {
  if (l.status === 'Purchased' || l.status === 'Lost') return []
  if (l.status === 'Visit booked' && l.visitAt) return [{ id: `t${++taskNo}`, leadId: l.id, title: 'Store visit', type: 'visit', dueAt: l.visitAt, done: false, assigneeId: l.assigneeId }]
  if (l.status !== 'New' && rand() < 0.15) return []
  const [type, title] = pick(nextSteps[l.status]!)
  const due = new Date(NOW + between(-50, 120) * HOUR)
  due.setHours(Math.min(19, Math.max(10, due.getHours())), rand() < 0.5 ? 0 : 30, 0, 0)
  return [{ id: `t${++taskNo}`, leadId: l.id, title, type, dueAt: due.toISOString(), done: false, assigneeId: l.assigneeId }]
})

export const templates: Template[] = [
  { id: 'tp1', name: 'Catalogue – new enquiry', channel: 'whatsapp', stage: 'New', body: 'Namaste {{first_name}} ji, this is {{agent}} from {{brand}}. Thank you for your enquiry! Sharing our latest designs. Would you like to visit the showroom this week?' },
  { id: 'tp2', name: 'Missed your call', channel: 'whatsapp', stage: 'Contacted', body: 'Namaste {{first_name}} ji, I tried calling you from {{brand}}. Please share a good time to talk. – {{agent}}' },
  { id: 'tp3', name: 'Book a store visit', channel: 'whatsapp', stage: 'Contacted', body: 'Hi {{first_name}} ji, come see the full collection at {{brand}}. Reply with a day and time and I will keep the designs ready for you. – {{agent}}' },
  { id: 'tp4', name: 'Visit reminder', channel: 'whatsapp', stage: 'Visit booked', body: 'Hi {{first_name}} ji, a reminder of your visit to {{brand}}. Our team will be waiting for you.' },
  { id: 'tp5', name: 'After-visit follow-up', channel: 'whatsapp', stage: 'Visited', body: 'Thank you for visiting {{brand}}, {{first_name}} ji! Sharing photos of the designs you liked. Let me know if you would like me to keep any aside. – {{agent}}' },
  { id: 'tp6', name: 'Thank you for your purchase', channel: 'whatsapp', stage: 'Purchased', body: 'Thank you for shopping with {{brand}}, {{first_name}} ji! 🙏 Remember: free polishing for life at our store.' },
  { id: 'tp7', name: 'Dhanteras offer', channel: 'whatsapp', stage: 'Any', body: "Shubh Dhanteras {{first_name}} ji! Silver coins and pooja articles at today's rate at {{brand}}. Reserve now and visit us soon." },
  { id: 'tp8', name: 'Catalogue by email', channel: 'email', stage: 'New', subject: 'Your enquiry with {{brand}}', body: 'Namaste {{first_name}} ji,\n\nThank you for your interest in {{brand}}. Please find our latest catalogue attached. We would be happy to welcome you at our showroom.\n\nRegards,\n{{agent}}' },
]

// Festive calendar. Lunar dates shift every year: approx=true means "confirm with the panchang".
export const festiveDates: FestiveDate[] = [
  { id: 'f1', name: 'Dhanteras', date: '2026-11-06', approx: true, tip: 'Peak day for gifting coins and temple decor. Raise budgets 3–5 days before.', categoryIds: ['k4', 'k5', 'k12'] },
  { id: 'f2', name: 'Diwali', date: '2026-11-08', approx: true, tip: 'Gifting: coins, utensils, pooja sets.', categoryIds: ['k4', 'k5', 'k12'] },
  { id: 'f3', name: 'Bhai Dooj', date: '2026-11-11', approx: true, tip: "Gifts for brothers: men's silver and gifting.", categoryIds: ['k9', 'k4'] },
  { id: 'f4', name: 'Wedding season begins', date: '2026-11-20', approx: true, tip: 'Push bridal (Sannjh) and accessories through February.', categoryIds: ['k3', 'k2', 'k6'] },
  { id: 'f5', name: 'Christmas & New Year gifting', date: '2026-12-25', approx: false, tip: 'Corporate gifting: home decor and utensils.', categoryIds: ['k4', 'k11', 'k12'] },
  { id: 'f6', name: 'Makar Sankranti', date: '2027-01-14', approx: false, tip: 'Good time for kids silver and gifts.', categoryIds: ['k10', 'k4'] },
  { id: 'f7', name: "Valentine's Day", date: '2027-02-14', approx: false, tip: 'Delicate 925 and oxidised pieces with initials.', categoryIds: ['k7', 'k8'] },
  { id: 'f8', name: 'Akshaya Tritiya', date: '2027-05-09', approx: true, tip: 'Auspicious buying day: sterling jewellery and furniture.', categoryIds: ['k6', 'k1', 'k4'] },
]

/**
 * Which product categories each non-owner may work in. The owner (u1) needs no row: they
 * see every category. Managers get a slice of the catalogue; their sales staff inherit the
 * same slice, because a share grants access to one user only, not to their reports.
 */
const staffWithProducts = ['u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8']
const meenaProducts = ['k3', 'k6', 'k7', 'k2', 'k1'] // Meena (u3): bridal, sterling, delicate, accessories, furniture
const vikasProducts = ['k4', 'k9', 'k10', 'k11', 'k12', 'k5', 'k8'] // the other branch
const managedCategories: string[][] = [
  meenaProducts,                 // u2 Marketing — same catalogue as the manager they support
  meenaProducts,                 // u3 Manager
  meenaProducts,                 // u4 Sales, under u3
  meenaProducts,                 // u5 Sales, under u3
  meenaProducts,                 // u6 Sales, under u4
  meenaProducts,                 // u7 Sales, under u4
  vikasProducts,                 // u8 Sales, under u5 — deliberately a different slice
]

// Generic shares table. One row per (module, record, user). Seeded so the Share UI has data to show.
export const shares: Share[] = [
  { id: 'sh1', module: 'leads', recordId: leads[0]?.id ?? 'L1001', sharedBy: 'u1', sharedWith: 'u3', permission: 'edit', createdAt: daysAgo(5).toISOString() },
  { id: 'sh2', module: 'leads', recordId: leads[1]?.id ?? 'L1002', sharedBy: 'u3', sharedWith: 'u4', permission: 'view', createdAt: daysAgo(3).toISOString() },
  { id: 'sh3', module: 'tasks', recordId: tasks[0]?.id ?? 't1', sharedBy: 'u1', sharedWith: 'u4', permission: 'edit', createdAt: daysAgo(2).toISOString() },
  // Product access: the owner assigns which categories each person may work in. Without a row
  // here a non-owner sees nothing, so every working user needs their products granted.
  ...managedCategories.flatMap((catIds, i) =>
    catIds.map(id => ({
      id: `shc-${staffWithProducts[i]}-${id}`,
      module: 'categories' as const,
      recordId: id,
      sharedBy: 'u1',
      sharedWith: staffWithProducts[i],
      permission: 'edit' as const,
      createdAt: daysAgo(20).toISOString(),
    }))),
]
