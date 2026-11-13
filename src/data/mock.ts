import type { AdSet, Campaign, Lead, Stage, Task } from './types'

export const TODAY = 'Friday, 13 November 2026'

const lead = (
  id: string,
  name: string,
  phone: string,
  source: string,
  campaign: string,
  adset: string,
  collection: string,
  stage: Stage,
  status: Lead['status'],
  rep: string,
  received: string,
  when: Lead['when'],
  next: string,
  late = false,
): Lead => ({
  id,
  name,
  phone,
  source,
  campaign,
  adset,
  collection,
  stage,
  status,
  rep,
  received,
  when,
  next,
  late,
})

export const LEADS: Lead[] = [
  lead('l1', 'Riya Patel', '+91 98250 •••14', 'Instant Form · Instagram', 'Sannjh Bridal – Lead Form', 'Brides-to-be 22–32 · Ahmedabad', 'Sannjh', 'Visit scheduled', 'Hot', 'Neha Shah', 'Today, 9:12 AM', 'today', 'Store visit · today 11:30 AM'),
  lead('l2', 'Ishita Vyas', '+91 97129 •••90', 'Instant Form · Facebook', 'Sannjh Bridal – Lead Form', 'Lookalike 1% – past buyers', 'Sannjh', 'New lead', 'Warm', 'Unassigned', 'Today, 9:40 AM', 'today', 'Not contacted · waiting 1 hr', true),
  lead('l3', 'Kinjal Shah', '+91 99099 •••37', 'Facebook Messenger', 'Uphaar Gifting – Messenger', 'Festive gifting · Gujarat', 'Uphaar', 'Visit scheduled', 'Hot', 'Neha Shah', 'Today, 8:40 AM', 'today', 'Store visit · today 4:00 PM'),
  lead('l4', 'Aarav Desai', 'No phone yet · @aarav.d', 'Instagram DM', 'Regalia – Instagram DM', 'Engaged Instagram followers', 'Regalia', 'New lead', 'Warm', 'Unassigned', 'Today, 8:05 AM', 'today', 'Not replied · waiting 2 hrs', true),
  lead('l5', 'Kunal Shah', '+91 90999 •••21', 'Facebook comment', 'Sannjh Bridal – Lead Form', 'Wedding planning · Gujarat', 'Sannjh', 'New lead', 'Warm', 'Ravi Mehta', 'Today, 7:48 AM', 'today', 'First reply overdue', true),
  lead('l6', 'Harsh Mehta', '+91 98795 •••02', 'Walk-in & phone', 'No campaign', '—', 'Imperial', 'Visit scheduled', 'Hot', 'Amit Patel', '12 Nov', 'week', 'Store visit · today 1:00 PM'),
  lead('l7', 'Tanvi Shah', '+91 94260 •••58', 'Instagram DM', 'Regalia – Instagram DM', 'Engaged Instagram followers', 'Maheer', 'Messaged', 'Hot', 'Sneha Rao', '12 Nov', 'week', 'Call 1 · today 12:30 PM'),
  lead('l8', 'Bhavin Soni', '+91 99250 •••76', 'Instant Form · Instagram', 'Sannjh Bridal – Lead Form', 'Brides-to-be 22–32 · Ahmedabad', 'Sannjh', 'Messaged', 'Warm', 'Ravi Mehta', '11 Nov', 'week', 'Call 1 · today 2:00 PM'),
  lead('l9', 'Heena Kapadia', '+91 97250 •••11', 'Website', 'New Traffic Campaign', 'Website visitors', 'Sadaa', 'Call 1', 'Cold', 'Sneha Rao', '12 Nov', 'week', 'Call 2 · 14 Nov, 11:00 AM'),
  lead('l10', 'Manish Rana', '+91 90160 •••45', 'Walk-in & phone', 'No campaign', '—', 'Varchas', 'Call 2', 'Warm', 'Amit Patel', '10 Nov', 'month', 'Call 3 · today 3:00 PM'),
  lead('l11', 'Meet Trivedi', '+91 98983 •••60', 'Facebook Messenger', 'Uphaar Gifting – Messenger', 'Festive gifting · Gujarat', 'Uphaar', 'Call 3', 'Hot', 'Ravi Mehta', '11 Nov', 'week', 'Call 4 · overdue since yesterday', true),
  lead('l12', 'Parth Vora', '+91 97235 •••88', 'Facebook Messenger', 'Uphaar Gifting – Messenger', 'Corporate gifting', 'Uphaar', 'Call 4', 'Warm', 'Ravi Mehta', '8 Nov', 'month', 'Last try · today 5:00 PM'),
  lead('l13', 'Dev Joshi', '+91 99786 •••33', 'Instant Form · Facebook', 'Moksha Temple Decor – Lead Form', 'Temple décor · Gujarat', 'Moksha', 'Visit scheduled', 'Hot', 'Amit Patel', '11 Nov', 'week', 'Store visit · today 5:30 PM'),
  lead('l14', 'Pooja Desai', '+91 94080 •••19', 'Instagram DM', 'Regalia – Instagram DM', 'Engaged Instagram followers', 'Regalia', 'Visit scheduled', 'Hot', 'Sneha Rao', '12 Nov', 'week', 'Store visit · today 6:30 PM'),
  lead('l15', 'Hiral Patel', '+91 98240 •••71', 'Instant Form · Instagram', 'Sannjh Bridal – Lead Form', 'Brides-to-be 22–32 · Ahmedabad', 'Sannjh', 'Purchased', 'Hot', 'Neha Shah', '3 Nov', 'month', 'Bought payal + bichhiya · ₹68,500'),
  lead('l16', 'Ketan Shah', '+91 90333 •••04', 'Walk-in & phone', 'No campaign', '—', 'Imperial', 'Purchased', 'Hot', 'Amit Patel', '1 Nov', 'month', 'Bought silver swing · ₹2,40,000'),
  lead('l17', 'Janvi Modi', '+91 97370 •••52', 'Instant Form · Instagram', 'Moksha Temple Decor – Lead Form', 'Temple décor · Gujarat', 'Moksha', 'No reply', 'Cold', 'Sneha Rao', '9 Nov', 'month', 'Try once more · overdue', true),
  lead('l18', 'Rohan Bhatt', '+91 99099 •••18', 'Facebook Messenger', 'Uphaar Gifting – Messenger', 'Festive gifting · Gujarat', 'Uphaar', 'Not interested', 'Cold', 'Amit Patel', '4 Nov', 'month', 'Reason: price too high'),
  lead('l19', 'Nidhi Parikh', '+91 98791 •••26', 'Instant Form · Instagram', 'Sannjh Bridal – Lead Form', 'Wedding planning · Gujarat', 'Sannjh', 'Future contact', 'Warm', 'Neha Shah', '10 Nov', 'month', 'Contact again · 5 Jan 2027'),
  lead('l20', 'Mitali Shah', '+91 97120 •••63', 'Instant Form · Instagram', 'Sannjh Bridal – Lead Form', 'Brides-to-be 22–32 · Ahmedabad', 'Sannjh', 'Visit scheduled', 'Warm', 'Neha Shah', '12 Nov', 'week', 'Store visit · tomorrow 12:00 PM'),
  lead('l21', 'Bhumi Shah', '+91 94270 •••09', 'Instant Form · Instagram', 'Sannjh Bridal – Lead Form', 'Wedding planning · Gujarat', 'Sannjh', 'Future contact', 'Warm', 'Neha Shah', '7 Nov', 'month', 'Contact again · 20 Nov'),
  lead('l22', 'Hetal Mehta', '+91 99134 •••47', 'Facebook Messenger', 'Uphaar Gifting – Messenger', 'Festive gifting · Gujarat', 'Uphaar', 'Call 1', 'Warm', 'Neha Shah', '12 Nov', 'week', 'Store visit · 17 Nov 4:00 PM'),
]

/** Totals shown in column headers on the kanban — the full book, not just the sample rows. */
export const STAGE_TOTALS: Record<Stage, number> = {
  'New lead': 24,
  Messaged: 46,
  'Call 1': 52,
  'Call 2': 38,
  'Call 3': 21,
  'Call 4': 12,
  'Visit scheduled': 23,
  Purchased: 32,
  'No reply': 34,
  'Not interested': 29,
  'Future contact': 31,
}

export const TASKS: Task[] = [
  { id: 't1', time: '9:30 AM', type: 'Call', title: 'First call — not made yet', lead: 'Kunal Shah', context: 'Sannjh · Facebook comment', rep: 'Ravi Mehta', due: 'overdue', done: false },
  { id: 't2', time: '10:00 AM', type: 'Message', title: 'Reply to Instagram DM', lead: 'Aarav Desai', context: 'Regalia · waiting 2 hrs', rep: 'Unassigned', due: 'overdue', done: false },
  { id: 't3', time: '10:30 AM', type: 'Call', title: 'Call 4 — last try', lead: 'Meet Trivedi', context: 'Uphaar · overdue since yesterday', rep: 'Ravi Mehta', due: 'overdue', done: false },
  { id: 't4', time: '10:45 AM', type: 'Call', title: 'Try once more before closing', lead: 'Janvi Modi', context: 'Moksha · no reply to 3 calls', rep: 'Sneha Rao', due: 'overdue', done: false },
  { id: 't5', time: '11:00 AM', type: 'Other', title: 'Keep antique-finish bridal trays ready', lead: 'Riya Patel', context: 'Sannjh · from Mansi', rep: 'Neha Shah', due: 'today', done: true },
  { id: 't6', time: '11:30 AM', type: 'Site visit', title: 'Store visit', lead: 'Riya Patel', context: 'Sannjh · confirmed', rep: 'Neha Shah', due: 'today', done: true },
  { id: 't7', time: '12:30 PM', type: 'Call', title: 'Call 1', lead: 'Tanvi Shah', context: 'Maheer · Instagram DM', rep: 'Sneha Rao', due: 'today', done: false },
  { id: 't8', time: '12:45 PM', type: 'Message', title: 'First message or call', lead: 'Ishita Vyas', context: 'Sannjh · new lead', rep: 'Neha Shah', due: 'today', done: false },
  { id: 't9', time: '1:00 PM', type: 'Site visit', title: 'Store visit', lead: 'Harsh Mehta', context: 'Imperial · confirmed', rep: 'Amit Patel', due: 'today', done: false },
  { id: 't10', time: '2:00 PM', type: 'Call', title: 'Call 1', lead: 'Bhavin Soni', context: 'Sannjh · Instant Form', rep: 'Ravi Mehta', due: 'today', done: false },
  { id: 't11', time: '2:30 PM', type: 'Call', title: "Confirm today's 4 PM visit", lead: 'Kinjal Shah', context: 'Uphaar · not confirmed yet', rep: 'Neha Shah', due: 'today', done: false },
  { id: 't12', time: '3:00 PM', type: 'Call', title: 'Call 3', lead: 'Manish Rana', context: 'Varchas · walk-in', rep: 'Amit Patel', due: 'today', done: false },
  { id: 't13', time: '4:00 PM', type: 'Site visit', title: 'Store visit', lead: 'Kinjal Shah', context: 'Uphaar · festive gifting', rep: 'Neha Shah', due: 'today', done: false },
  { id: 't14', time: '5:00 PM', type: 'Call', title: "Confirm tomorrow's 12 PM visit", lead: 'Mitali Shah', context: 'Sannjh', rep: 'Neha Shah', due: 'today', done: false },
  { id: 't15', time: '5:00 PM', type: 'Call', title: 'Last try', lead: 'Parth Vora', context: 'Uphaar · Messenger', rep: 'Ravi Mehta', due: 'today', done: false },
  { id: 't16', time: '5:30 PM', type: 'Site visit', title: 'Store visit', lead: 'Dev Joshi', context: 'Moksha temple décor · confirmed', rep: 'Amit Patel', due: 'today', done: false },
  { id: 't17', time: '6:00 PM', type: 'Message', title: 'Send Sannjh new arrivals', lead: 'Bhumi Shah', context: 'Sannjh · future contact on 20 Nov', rep: 'Neha Shah', due: 'today', done: false },
  { id: 't18', time: '6:30 PM', type: 'Site visit', title: 'Store visit', lead: 'Pooja Desai', context: 'Regalia accessories · not confirmed', rep: 'Sneha Rao', due: 'today', done: false },
  { id: 't19', time: 'Sat 14 · 12:00 PM', type: 'Site visit', title: 'Store visit', lead: 'Mitali Shah', context: 'Sannjh', rep: 'Neha Shah', due: 'upcoming', done: false },
  { id: 't20', time: 'Mon 16 · 11:00 AM', type: 'Call', title: 'Wedding-date check-in', lead: 'Ishita Vyas', context: 'Sannjh', rep: 'Neha Shah', due: 'upcoming', done: false },
  { id: 't21', time: 'Tue 17 · 4:00 PM', type: 'Site visit', title: 'Store visit', lead: 'Hetal Mehta', context: 'Uphaar', rep: 'Neha Shah', due: 'upcoming', done: false },
  { id: 't22', time: 'Wed 18 · 12:00 PM', type: 'Future contact', title: 'Contact again', lead: 'Kavya Joshi', context: 'Sannjh', rep: 'Neha Shah', due: 'upcoming', done: false },
  { id: 't23', time: 'Thu 19 · 11:30 AM', type: 'Site visit', title: 'Store visit', lead: 'Disha Amin', context: 'Sannjh', rep: 'Neha Shah', due: 'upcoming', done: false },
  { id: 't24', time: 'Fri 20 · 11:00 AM', type: 'Future contact', title: 'Send new arrivals', lead: 'Bhumi Shah', context: 'Sannjh', rep: 'Neha Shah', due: 'upcoming', done: false },
]

/** Today's confirmed/unconfirmed store visits, as the dashboard lists them. */
export const VISITS = [
  { time: '11:30 AM', name: 'Riya Patel', collection: 'Sannjh bridal', rep: 'Neha', confirmed: true },
  { time: '1:00 PM', name: 'Harsh Mehta', collection: 'Imperial furniture', rep: 'Amit', confirmed: true },
  { time: '4:00 PM', name: 'Kinjal Shah', collection: 'Uphaar gifting', rep: 'Neha', confirmed: false },
  { time: '5:30 PM', name: 'Dev Joshi', collection: 'Moksha temple décor', rep: 'Amit', confirmed: true },
  { time: '6:30 PM', name: 'Pooja Desai', collection: 'Regalia accessories', rep: 'Sneha', confirmed: false },
]

export const SOURCE_COUNTS: Record<'today' | 'week' | 'month', number[]> = {
  today: [7, 3, 5, 2, 1, 0, 0, 0, 0],
  week: [35, 17, 23, 12, 4, 1, 2, 2, 0],
  month: [124, 62, 82, 42, 14, 4, 6, 6, 2],
}

export const PERIOD_SUMMARY = {
  today: { label: 'today', leads: 18, leadsNote: '4 more than yesterday', visits: 5, visitsNote: '2 done · 3 still to come' },
  week: { label: 'this week', leads: 96, leadsNote: '12 more than last week', visits: 23, visitsNote: '9 done · 14 still to come' },
  month: { label: 'this month', leads: 342, leadsNote: 'Up 12% on the same days last month', visits: 61, visitsNote: '38 done · 23 still to come' },
}

const CAMPAIGN_VALUE: Record<string, number> = {
  'Sannjh Bridal – Lead Form': 576000,
  'Uphaar Gifting – Messenger': 45500,
  'Regalia – Instagram DM': 36000,
  'Moksha Temple Decor – Lead Form': 114000,
  'New Traffic Campaign': 5200,
}

const rawCampaigns: Omit<Campaign, 'id' | 'value'>[] = [
  { name: 'Sannjh Bridal – Lead Form', objective: 'Leads', status: 'Active', desc: 'Bridal silver enquiries from brides-to-be in Ahmedabad, through Instagram and Facebook forms.', adsets: 3, adsRunning: 6, adsTotal: 7, spend: 38400, impressions: 214000, clicks: 4100, leads: 138, visits: 26, won: 12 },
  { name: 'Uphaar Gifting – Messenger', objective: 'Messages', status: 'Active', desc: 'Festive and corporate gifting chats that open in Facebook Messenger.', adsets: 2, adsRunning: 5, adsTotal: 5, spend: 26200, impressions: 172000, clicks: 3010, leads: 82, visits: 14, won: 7 },
  { name: 'Regalia – Instagram DM', objective: 'Messages', status: 'Active', desc: 'Accessories ads that open an Instagram DM with the store.', adsets: 2, adsRunning: 3, adsTotal: 4, spend: 14800, impressions: 136000, clicks: 2040, leads: 56, visits: 9, won: 4 },
  { name: 'Moksha Temple Decor – Lead Form', objective: 'Leads', status: 'Active', desc: 'Idols and temple décor enquiries through a short lead form.', adsets: 2, adsRunning: 4, adsTotal: 4, spend: 12600, impressions: 98000, clicks: 1620, leads: 52, visits: 10, won: 6 },
  { name: 'New Traffic Campaign', objective: 'Traffic', status: 'Active', desc: 'Sends people to the Selverra website collection pages.', adsets: 1, adsRunning: 2, adsTotal: 2, spend: 6900, impressions: 81000, clicks: 1450, leads: 6, visits: 1, won: 1 },
  { name: 'Imperial Awareness Campaign', objective: 'Awareness', status: 'Active', desc: 'Introduces the Imperial silver furniture collection to new people.', adsets: 1, adsRunning: 2, adsTotal: 2, spend: 9500, impressions: 340000, clicks: 1360, leads: null, visits: null, won: null },
  { name: 'Brand Awareness Campaign-2', objective: 'Awareness', status: 'Active', desc: 'General Selverra brand introduction to new audiences.', adsets: 1, adsRunning: 1, adsTotal: 1, spend: 7200, impressions: 290000, clicks: 870, leads: null, visits: null, won: null },
  { name: 'Reel View Campaign', objective: 'Engagement', status: 'Active', desc: 'Gets people watching Selverra reels · 41,000 reel plays.', adsets: 1, adsRunning: 3, adsTotal: 3, spend: 8100, impressions: 220000, clicks: 1100, leads: null, visits: null, won: null },
  { name: 'Review Campaign', objective: 'Awareness', status: 'Paused', desc: 'Shows real customer reviews to build trust.', adsets: 1, adsRunning: 0, adsTotal: 1, spend: 2300, impressions: 74000, clicks: 300, leads: null, visits: null, won: null },
]

export const CAMPAIGNS: Campaign[] = rawCampaigns.map((c, i) => ({
  ...c,
  id: 'c' + (i + 1),
  value: CAMPAIGN_VALUE[c.name] ?? null,
}))

const ad = (
  name: string,
  format: Ad['format'],
  headline: string,
  cta: string,
  status: Ad['status'],
  spend: number,
  impressions: number,
  ctr: number,
  leads: number,
): Ad => ({ name, format, headline, cta, status, spend, impressions, ctr, leads })

type Ad = AdSet['ads'][number]

/** Ad sets for the Sannjh Bridal campaign — the one campaign the detail screen drills into. */
export const AD_SETS: AdSet[] = [
  {
    id: 'as1',
    name: 'Brides-to-be 22–32 · Ahmedabad',
    audience: 'Women 22–32, Ahmedabad 25 km, interest: weddings',
    budget: '₹600/day',
    adsLine: '3 of 3 ads running',
    spend: 19800,
    ctr: 2.05,
    leads: 74,
    visits: 15,
    won: 7,
    ads: [
      ad('Bridal payal reel – V1', 'Reel', 'Sannjh bridal silver', 'Sign up', 'Active', 9200, 48000, 2.3, 38),
      ad('Full bridal set – carousel', 'Carousel', 'Complete bridal silver set', 'Sign up', 'Active', 6400, 33000, 1.9, 22),
      ad('Kamarbandh close-up', 'Image', 'Handcrafted kamarbandh', 'Learn more', 'Active', 4200, 24000, 1.65, 14),
    ],
  },
  {
    id: 'as2',
    name: 'Wedding planning · Gujarat',
    audience: 'Women 24–40, Gujarat, interest: wedding planning',
    budget: '₹400/day',
    adsLine: '2 of 2 ads running',
    spend: 12300,
    ctr: 1.87,
    leads: 42,
    visits: 7,
    won: 3,
    ads: [
      ad('Bridal viewing invite – Hindi', 'Video', 'Book a private bridal viewing', 'Sign up', 'Active', 7100, 40000, 1.95, 26),
      ad('Bridal set – English', 'Image', 'Bridal silver, made to order', 'Sign up', 'Active', 5200, 29000, 1.76, 16),
    ],
  },
  {
    id: 'as3',
    name: 'Lookalike 1% – past buyers',
    audience: 'Similar to past Selverra buyers, Gujarat',
    budget: '₹300/day',
    adsLine: '1 of 2 ads running',
    spend: 6300,
    ctr: 1.65,
    leads: 22,
    visits: 4,
    won: 2,
    ads: [
      ad('Payal reel – lookalike', 'Reel', 'Sannjh bridal silver', 'Sign up', 'Active', 4100, 25000, 1.8, 15),
      ad('Bridal set static', 'Image', 'Bridal silver for your big day', 'Learn more', 'Paused', 2200, 15000, 1.4, 7),
    ],
  },
]

export const AD_FORMAT_COLOR: Record<Ad['format'], string> = {
  Reel: '#7A3B4A',
  Carousel: '#355E7A',
  Image: '#5B6B2E',
  Video: '#7A5A1F',
}

/** Per-rep month figures behind the manager dashboard's team table. */
export const TEAM = [
  { rep: 'Neha Shah', leads: 98, replyMins: 8, visits: 21, target: 25, won: 12, value: 612000, late: 0 },
  { rep: 'Amit Patel', leads: 86, replyMins: 14, visits: 18, target: 25, won: 9, value: 468000, late: 1 },
  { rep: 'Sneha Rao', leads: 79, replyMins: 23, visits: 13, target: 20, won: 6, value: 254000, late: 2 },
  { rep: 'Ravi Mehta', leads: 79, replyMins: 41, visits: 9, target: 20, won: 4, value: 171000, late: 4 },
]

/** Neha's own pipeline, used by the salesperson dashboard. */
export const MY_PIPELINE: [Stage, number][] = [
  ['New lead', 1],
  ['Messaged', 12],
  ['Call 1', 15],
  ['Call 2', 11],
  ['Call 3', 7],
  ['Call 4', 3],
  ['Visit scheduled', 8],
  ['Purchased', 10],
  ['No reply', 10],
  ['Not interested', 9],
  ['Future contact', 12],
]

/** The lead the detail screen opens on, with its full history. */
export const LEAD_DETAIL = {
  id: 'l1',
  name: 'Riya Patel',
  phone: '+91 98250 •••14',
  email: 'riya.patel@example.com',
  city: 'Ahmedabad',
  source: 'Instant Form · Instagram',
  campaign: 'Sannjh Bridal – Lead Form',
  adset: 'Brides-to-be 22–32 · Ahmedabad',
  ad: 'Bridal payal reel – V1',
  collection: 'Sannjh',
  stage: 'Visit scheduled' as Stage,
  status: 'Hot' as const,
  rep: 'Neha Shah',
  received: 'Today, 9:12 AM',
  replyMins: 6,
  budget: '₹60,000 – ₹90,000',
  weddingDate: 'March 2027',
  formAnswers: [
    ['What are you looking for?', 'Full bridal set — payal, bichhiya, kamarbandh'],
    ['When is the wedding?', 'March 2027'],
    ['Budget range', '₹60,000 – ₹90,000'],
    ['Preferred city', 'Ahmedabad'],
  ],
  timeline: [
    { at: 'Today, 11:30 AM', who: 'Neha Shah', kind: 'Site visit' as const, text: 'Store visit confirmed for 11:30 AM. Antique-finish trays kept ready as Mansi asked.' },
    { at: 'Today, 10:05 AM', who: 'Neha Shah', kind: 'Call' as const, text: 'Call 1 — spoke 4 min. Wants to see the full bridal set in person. Booked a store visit for today 11:30 AM.' },
    { at: 'Today, 9:18 AM', who: 'Neha Shah', kind: 'Message' as const, text: 'Sent first WhatsApp: introduced Sannjh bridal collection, asked for a good time to call.' },
    { at: 'Today, 9:12 AM', who: 'System', kind: 'Other' as const, text: 'Lead came in from Instant Form · Instagram and was assigned to Neha Shah.' },
  ],
}

/** Meta sync state for the Sync Data screen. */
export const SYNC = {
  lastSync: 'Today, 10:30 AM',
  nextSync: 'Today, 11:30 AM',
  account: 'Selverra Jewellers · act_8842019',
  pages: ['Selverra Jewellers', 'Sannjh by Selverra'],
  forms: [
    { name: 'Sannjh bridal enquiry', page: 'Sannjh by Selverra', leads: 138, mapped: true },
    { name: 'Moksha temple décor enquiry', page: 'Selverra Jewellers', leads: 52, mapped: true },
    { name: 'Regalia accessories enquiry', page: 'Selverra Jewellers', leads: 56, mapped: true },
    { name: 'Uphaar gifting enquiry', page: 'Selverra Jewellers', leads: 82, mapped: false },
  ],
  history: [
    { at: 'Today, 10:30 AM', pulled: 14, status: 'ok' as const, note: '14 new leads · 9 campaigns updated' },
    { at: 'Today, 9:30 AM', pulled: 6, status: 'ok' as const, note: '6 new leads · 9 campaigns updated' },
    { at: 'Today, 8:30 AM', pulled: 0, status: 'ok' as const, note: 'No new leads' },
    { at: 'Today, 7:30 AM', pulled: 3, status: 'warn' as const, note: '3 new leads · 1 form not mapped to a collection' },
    { at: 'Yesterday, 11:30 PM', pulled: 11, status: 'ok' as const, note: '11 new leads · 9 campaigns updated' },
  ],
}

/** Teams, members and role permissions for Settings. */
export const TEAMS = [
  { name: 'Bridal · Sannjh', manager: 'Mansi Shah', members: ['Neha Shah', 'Ravi Mehta'], collections: ['Sannjh', 'Maheer'] },
  { name: 'Gifting · Uphaar', manager: 'Mansi Shah', members: ['Sneha Rao'], collections: ['Uphaar', 'Dawaat'] },
  { name: 'Furniture · Imperial', manager: 'Jay Thakkar', members: ['Amit Patel'], collections: ['Imperial', 'Varchas', 'Aangan'] },
]

export const MEMBERS = [
  { name: 'Hardik Shah', role: 'Owner', team: 'All teams', email: 'hardik@selverra.example', active: true },
  { name: 'Mansi Shah', role: 'Manager', team: 'Bridal · Sannjh, Gifting · Uphaar', email: 'mansi@selverra.example', active: true },
  { name: 'Jay Thakkar', role: 'Manager', team: 'Furniture · Imperial', email: 'jay@selverra.example', active: true },
  { name: 'Neha Shah', role: 'Salesperson', team: 'Bridal · Sannjh', email: 'neha@selverra.example', active: true },
  { name: 'Amit Patel', role: 'Salesperson', team: 'Furniture · Imperial', email: 'amit@selverra.example', active: true },
  { name: 'Sneha Rao', role: 'Salesperson', team: 'Gifting · Uphaar', email: 'sneha@selverra.example', active: true },
  { name: 'Ravi Mehta', role: 'Salesperson', team: 'Bridal · Sannjh', email: 'ravi@selverra.example', active: false },
]

export const PERMISSIONS = [
  { what: 'See every lead in the company', owner: true, manager: false, sales: false },
  { what: "See their team's leads", owner: true, manager: true, sales: false },
  { what: 'See only their own leads', owner: true, manager: true, sales: true },
  { what: 'Assign a lead to a salesperson', owner: true, manager: true, sales: false },
  { what: 'Change a lead stage', owner: true, manager: true, sales: true },
  { what: 'See ad spend and cost per lead', owner: true, manager: true, sales: false },
  { what: 'Add or remove team members', owner: true, manager: false, sales: false },
  { what: 'Connect the Meta ad account', owner: true, manager: false, sales: false },
  { what: 'Export leads to a file', owner: true, manager: true, sales: false },
]
