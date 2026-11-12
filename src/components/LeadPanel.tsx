import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRightLeft, Calendar, Check, ChevronDown, CircleDot, IndianRupee, ListTodo, Mail, MessageCircle, Phone, Share2, Store, StickyNote, UserPlus } from 'lucide-react'
import { CALL_OUTCOMES, type Activity, type CallOutcome, type Lead, type TaskType, type Template } from '../data/types'
import { fmt as f } from '../lib/format'
import { useStore } from '../store'
import { fmt } from '../lib/format'
import { fillTemplate, isClosed, responseMinutes } from '../lib/leads'
import { Avatar, Badge, CategoryTag, cx, Grams, LeadStatusBadge, Menu, MenuItem, MenuLabel, ScorePill, Select, SlaTimer } from './ui'
import { ShareDialog } from './ShareDialog'

const ACTIVITY_ICON: Record<Activity['type'], ReactNode> = {
  created: <CircleDot size={13} />, status: <ArrowRightLeft size={13} />, call: <Phone size={13} />, whatsapp: <MessageCircle size={13} />,
  email: <Mail size={13} />, note: <StickyNote size={13} />, assign: <UserPlus size={13} />, task: <ListTodo size={13} />,
  sale: <IndianRupee size={13} />, visit: <Store size={13} />,
}
export const TASK_ICON: Record<TaskType, ReactNode> = { call: <Phone size={14} />, whatsapp: <MessageCircle size={14} />, email: <Mail size={14} />, visit: <Store size={14} /> }
const STAGES = ['New', 'Contacted', 'Visit booked', 'Visited', 'Purchased'] as const

/** Quick due-date presets, computed at click time. */
export const DUE_PRESETS: { label: string; at: () => Date }[] = [
  { label: 'In 1 hour', at: () => new Date(Date.now() + 3600_000) },
  { label: 'Today 5 PM', at: () => { const d = new Date(); d.setHours(17, 0, 0, 0); return d } },
  { label: 'Tomorrow 10 AM', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d } },
  { label: 'In 3 days', at: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d } },
]

export function LeadPanel() {
  const { openLeadId, openLead, leadById } = useStore()
  const lead = openLeadId ? leadById.get(openLeadId) : undefined

  useEffect(() => {
    if (!lead) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('dialog[open]') && openLead(undefined)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lead, openLead])

  if (!lead) return null
  return <PanelBody key={lead.id} lead={lead} onClose={() => openLead(undefined)} />
}

function PanelBody({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { users, me, tasks, templates, brand, categoryById, campaignById, adSetById, adById, userById, setLeadStatus, assignLeads, addNote, logContact, addTask, updateTask, toast } = useStore()
  const [note, setNote] = useState('')
  const [askOutcome, setAskOutcome] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const category = categoryById.get(lead.categoryId)
  const openTasks = tasks.filter(t => t.leadId === lead.id && !t.done).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const digits = lead.phone.replace(/\D/g, '')
  const closed = isClosed(lead)
  const vars = { first_name: lead.name.split(' ')[0], agent: me?.name.split(' ')[0] ?? '', brand: brand?.name ?? '' }

  const send = (t: Template | null, channel: 'whatsapp' | 'email') => {
    const body = t ? fillTemplate(t.body, vars) : ''
    if (channel === 'whatsapp') window.open(`https://wa.me/${digits}${body ? `?text=${encodeURIComponent(body)}` : ''}`, '_blank', 'noopener')
    else window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(t?.subject ? fillTemplate(t.subject, vars) : '')}&body=${encodeURIComponent(body)}`
    logContact(lead.id, channel, `${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · ${t?.name ?? 'Custom message'}`)
  }
  const recordOutcome = (o: CallOutcome) => {
    setAskOutcome(false)
    logContact(lead.id, 'call', `Call · ${o}`)
    if (o === 'Interested' && lead.status === 'New') setLeadStatus([lead.id], 'Contacted')
    if (o === 'Not interested') setLeadStatus([lead.id], 'Lost')
    if (o === 'Callback requested' || o === 'No answer' || o === 'Busy') {
      const at = o === 'Callback requested' ? DUE_PRESETS[2].at() : new Date(Date.now() + 2 * 3600_000)
      addTask({ leadId: lead.id, title: o === 'Callback requested' ? 'Call back (requested)' : 'Retry call', type: 'call', dueAt: at.toISOString(), assigneeId: lead.assigneeId ?? me?.id ?? null })
    } else toast({ text: `Call logged: ${o}`, tone: 'success' })
  }
  const submitNote = () => {
    if (!note.trim()) return
    addNote(lead.id, note.trim())
    setNote('')
  }
  const details: [string, ReactNode][] = [
    ['Phone', <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="tabular-nums hover:text-indigo-600">{lead.phone}</a>],
    ['Email', <span className="break-all">{lead.email}</span>],
    ['Looking for', <CategoryTag id={lead.categoryId} />],
    ['Source', lead.source],
    ...(lead.campaignId ? ([['Campaign', <a href={`#/campaigns/${lead.campaignId}`} className="hover:text-indigo-600">{campaignById.get(lead.campaignId)?.name}</a>], ['Ad set', adSetById.get(lead.adSetId ?? '')?.name], ['Ad', adById.get(lead.adId ?? '')?.name]] as [string, ReactNode][]) : []),
    ['Created', fmt.dateTime(lead.createdAt)],
    ['First response', lead.firstContactAt ? fmt.duration(responseMinutes(lead)) : <SlaTimer lead={lead} />],
    ...(lead.lostReason ? ([['Lost reason', <Badge color="red">{lead.lostReason}</Badge>]] as [string, ReactNode][]) : []),
  ]
  const tplFor = (channel: 'whatsapp' | 'email') => {
    const list = templates.filter(t => t.channel === channel)
    return [...list.filter(t => t.stage === lead.status), ...list.filter(t => t.stage !== lead.status)]
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-[var(--color-border-subtle)] px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <button onClick={onClose} className="btn btn-ghost btn-sm -ml-1 mb-3 text-[var(--color-text-muted)]" autoFocus><ArrowLeft size={15} /> Back to enquiries</button>
          <div className="flex items-start gap-4">
            <Avatar name={lead.name} size="md" color={category?.color} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-[-0.01em]">{lead.name}</h1>
              <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{lead.id} · created {f.relative(lead.createdAt)}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <LeadStatusBadge status={lead.status} /><ScorePill lead={lead} /><SlaTimer lead={lead} />
                {category && <CategoryTag id={lead.categoryId} />}
              </div>
            </div>
            <button onClick={() => setShareOpen(true)} className="btn btn-sm shrink-0" title="Share this lead"><Share2 size={14} /> Share</button>
          </div>

          {/* Stage stepper */}
          <div className="mt-4 flex items-center gap-1.5">
            {STAGES.map((st, i) => {
              const reached = lead.status !== 'Lost' && STAGES.indexOf(lead.status as (typeof STAGES)[number]) >= i
              const current = lead.status === st
              return (
                <button key={st} onClick={() => setLeadStatus([lead.id], st)} title={`Move to ${st}`}
                  className={cx('flex-1 rounded-[var(--radius-button)] px-2 py-1.5 text-xs font-medium transition-colors',
                    current ? 'bg-[var(--color-text-primary)] text-white' : reached ? 'bg-[var(--color-text-primary)]/15 text-[var(--color-text-primary)]' : 'bg-black/[0.04] text-[var(--color-text-muted)] hover:bg-black/[0.07] dark:bg-white/5 dark:hover:bg-white/10')}>
                  {st === 'Visit booked' ? 'Visit' : st}
                </button>
              )
            })}
            <button onClick={() => setLeadStatus([lead.id], 'Lost')}
              className={cx('rounded-[var(--radius-button)] px-3 py-1.5 text-xs font-medium transition-colors', lead.status === 'Lost' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10')}>Lost</button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          {/* Main column */}
          <div className="min-w-0 space-y-5">
            {lead.sale && (
              <div className="card flex items-center gap-3 p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><IndianRupee size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">{f.currency(lead.sale.amount)} · <Grams g={lead.sale.grams} /></p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{lead.sale.items} · {f.relative(lead.sale.at)}</p>
                </div>
              </div>
            )}
            {lead.status === 'Visit booked' && lead.visitAt && (
              <div className="card flex items-center gap-3 p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white"><Store size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-violet-700 dark:text-violet-400">Visit {f.due(lead.visitAt)}</p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{lead.name} · {lead.phone}</p>
                </div>
                <button className="btn btn-sm" onClick={() => setLeadStatus([lead.id], 'Visited')}>Mark visited</button>
              </div>
            )}

            {/* Contact actions */}
            <div className="card p-4">
              <div className="grid grid-cols-3 gap-2">
                <a className="btn justify-center" href={`tel:${lead.phone.replace(/\s/g, '')}`} onClick={() => setAskOutcome(true)}><Phone size={15} /> Call</a>
                <Menu label="WhatsApp templates" button={<button className="btn w-full justify-center"><MessageCircle size={15} /> WhatsApp <ChevronDown size={13} /></button>}>
                  {close => (<>
                    <MenuLabel>Templates</MenuLabel>
                    {tplFor('whatsapp').map(t => <MenuItem key={t.id} onClick={() => { send(t, 'whatsapp'); close() }}><span className="flex-1">{t.name}</span>{t.stage === lead.status && <Badge color="indigo">Suggested</Badge>}</MenuItem>)}
                    <MenuItem onClick={() => { send(null, 'whatsapp'); close() }}><span className="text-[var(--color-text-muted)]">Blank message</span></MenuItem>
                  </>)}
                </Menu>
                <Menu label="Email templates" align="right" button={<button className="btn w-full justify-center"><Mail size={15} /> Email <ChevronDown size={13} /></button>}>
                  {close => (<>
                    <MenuLabel>Templates</MenuLabel>
                    {tplFor('email').map(t => <MenuItem key={t.id} onClick={() => { send(t, 'email'); close() }}><span className="flex-1">{t.name}</span>{t.stage === lead.status && <Badge color="indigo">Suggested</Badge>}</MenuItem>)}
                    <MenuItem onClick={() => { send(null, 'email'); close() }}><span className="text-[var(--color-text-muted)]">Blank email</span></MenuItem>
                  </>)}
                </Menu>
              </div>
              {askOutcome && (
                <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-black/[0.02] p-3 dark:bg-white/[0.03]">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">How did the call go?</p>
                    <button className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" onClick={() => setAskOutcome(false)}>Skip</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CALL_OUTCOMES.map(o => <button key={o} className="btn btn-sm" onClick={() => recordOutcome(o)}>{o}</button>)}
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">No answer, busy or callback automatically schedules a follow-up.</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <Section title="Notes">
              <textarea className="input h-20 w-full resize-none py-2" placeholder="Add a note…  (Ctrl+Enter to save)" value={note}
                onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && submitNote()} />
              {note.trim() && <div className="mt-2 flex justify-end"><button className="btn btn-primary btn-sm" onClick={submitNote}>Save note</button></div>}
              {lead.notes.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {lead.notes.map(n => (
                    <li key={n.id} className="rounded-[var(--radius-card)] bg-amber-50 p-3 text-sm dark:bg-amber-500/10">
                      <p>{n.text}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{userById.get(n.byId)?.name} · {fmt.relative(n.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Activity */}
            <Section title="Activity">
              <ol className="relative space-y-4 border-l border-[var(--color-border-subtle)] pl-5">
                {lead.activities.map(a => (
                  <li key={a.id} className="relative">
                    <span className="absolute top-0 -left-[31px] flex size-5 items-center justify-center rounded-full bg-black/[0.05] text-[var(--color-text-muted)] ring-4 ring-[var(--color-card-bg)] dark:bg-white/10">
                      {ACTIVITY_ICON[a.type]}
                    </span>
                    <p className="text-sm">{a.text}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{a.byId ? `${userById.get(a.byId)?.name} · ` : ''}{fmt.dateTime(a.at)}</p>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          {/* Side column */}
          <div className="min-w-0 space-y-5">
            <Section title="Owner">
              <Select label="Assignee" className="w-full" value={lead.assigneeId ?? ''} onChange={v => assignLeads([lead.id], v || null)}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Section>

            <Section title={<span className="flex items-center gap-2"><Calendar size={15} /> Follow-ups</span>}>
              <ul className="space-y-1.5">
                {openTasks.map(t => {
                  const overdue = new Date(t.dueAt).getTime() < Date.now()
                  return (
                    <li key={t.id} className="flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3 py-2">
                      <button onClick={() => updateTask(t.id, { done: true })} aria-label={`Complete ${t.title}`}
                        className="flex size-4.5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600"><Check size={11} /></button>
                      <span className="shrink-0 text-[var(--color-text-muted)]">{TASK_ICON[t.type]}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                      <span className={cx('shrink-0 text-xs', overdue ? 'font-medium text-rose-600' : 'text-[var(--color-text-muted)]')}>{fmt.due(t.dueAt)}</span>
                    </li>
                  )
                })}
                {openTasks.length === 0 && !closed && <li className="rounded-[var(--radius-card)] border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-300">No next step scheduled. Leads without a follow-up go cold.</li>}
              </ul>
              {!closed && <AddTask leadId={lead.id} assigneeId={lead.assigneeId ?? me?.id ?? null} />}
            </Section>

            {lead.answers.length > 0 && (
              <Section title="Form answers">
                <dl className="divide-y divide-[var(--color-border-subtle)] text-sm">
                  {lead.answers.map(a => (
                    <div key={a.q} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0"><dt className="text-[var(--color-text-muted)]">{a.q}</dt><dd className="text-right font-medium">{a.a}</dd></div>
                  ))}
                </dl>
              </Section>
            )}

            <Section title="Details">
              <dl className="space-y-2.5 text-sm">
                {details.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="shrink-0 text-[var(--color-text-muted)]">{k}</dt><dd className="min-w-0 text-right font-medium">{v ?? '—'}</dd></div>)}
              </dl>
            </Section>
          </div>
        </div>
      </div>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} module="leads" recordId={lead.id} owner={lead.assigneeId ?? me?.id ?? ''} />
    </div>
  )

}

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {children}
    </section>
  )
}

function AddTask({ leadId, assigneeId }: { leadId: string; assigneeId: string | null }) {
  const { addTask } = useStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('Follow-up call')
  const [type, setType] = useState<TaskType>('call')
  const [due, setDue] = useState('')
  const save = (at: Date) => {
    addTask({ leadId, title: title.trim() || 'Follow-up', type, dueAt: at.toISOString(), assigneeId })
    setOpen(false)
    setDue('')
  }
  if (!open) return <button className="btn btn-ghost btn-sm mt-2 text-indigo-600 dark:text-indigo-400" onClick={() => setOpen(true)}>+ Schedule follow-up</button>
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex gap-2">
        <Select label="Type" value={type} onChange={v => setType(v as TaskType)} className="w-32">
          <option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="visit">Store visit</option>
        </Select>
        <input className="input flex-1" value={title} onChange={e => setTitle(e.target.value)} aria-label="Task title" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DUE_PRESETS.map(p => <button key={p.label} className="btn btn-sm" onClick={() => save(p.at())}>{p.label}</button>)}
      </div>
      <div className="flex gap-2">
        <input type="datetime-local" className="input flex-1" value={due} onChange={e => setDue(e.target.value)} aria-label="Custom due date" />
        <button className="btn btn-primary" disabled={!due} onClick={() => save(new Date(due))}>Save</button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}

