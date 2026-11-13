import { useMemo, useState } from 'react'
import { AlarmClock, Check, CheckCircle2, MessageCircle, Phone, UserPlus } from 'lucide-react'
import type { Lead, Task } from '../../data/types'
import { useNow, useStore } from '../../store'
import { fmt } from '../../lib/format'
import { fillTemplate, median, responseMinutes, waitingMinutes } from '../../lib/leads'
import { Badge, Card, CollectionIcon, cx, EmptyState, LeadStatusBadge, Menu, MenuItem, PageHeader, ScorePill, Segmented, SlaTimer, TableSkeleton } from '../../components/ui'
import { DUE_PRESETS, TASK_ICON } from '../../components/LeadPanel'
import { levelOf, seesSpend } from '../../levels'

export default function Today() {
  const { me, scoped, leadById, brand, categoryById, campaignById, templates, loading, settings, openLead, assignLeads, updateTask, logContact } = useStore()
  // A sales person works their own queue; only a manager or the owner switches to the team view.
  const canSeeTeam = seesSpend(levelOf(me?.role))
  const [whoState, setWho] = useState<'mine' | 'all'>('mine')
  const who = canSeeTeam ? whoState : 'mine'
  const now = useNow(30_000)
  const mine = (assigneeId: string | null) => who === 'all' || assigneeId === me?.id || (assigneeId == null && who === 'mine')

  const data = useMemo(() => {
    const endToday = new Date(now).setHours(23, 59, 59, 999)
    const week = now + 7 * 86400_000
    const open = scoped.tasks.filter(t => !t.done && mine(t.assigneeId) && leadById.has(t.leadId)).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    const due = (t: Task) => new Date(t.dueAt).getTime()
    const respond = scoped.leads
      .filter(l => waitingMinutes(l, now) != null && mine(l.assigneeId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const weekAgo = new Date(now - 7 * 86400_000).toISOString()
    const myTimes = scoped.leads.filter(l => l.createdAt > weekAgo && (who === 'all' || l.assigneeId === me?.id)).map(responseMinutes).filter((x): x is number => x != null)
    return {
      respond,
      overdue: open.filter(t => due(t) < now),
      today: open.filter(t => due(t) >= now && due(t) <= endToday),
      upcoming: open.filter(t => due(t) > endToday && due(t) <= week),
      medianResponse: median(myTimes),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, now, who, me, leadById])

  const hour = new Date(now).getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const intro = templates.find(t => t.channel === 'whatsapp' && t.stage === 'New')
  const doNow = data.respond.length + data.overdue.length + data.today.length

  // One priority queue: new leads to answer first, then overdue tasks, then rest of today.
  const queue = [
    ...data.respond.map(l => ({ kind: 'respond' as const, key: `r${l.id}`, lead: l })),
    ...data.overdue.map(t => ({ kind: 'task' as const, key: t.id, task: t })),
    ...data.today.map(t => ({ kind: 'task' as const, key: t.id, task: t })),
  ]

  // Compact glance: just the counts that change what you do next. Median lives in the subtitle.
  const glance = [
    { label: 'to answer', value: data.respond.length, tone: data.respond.length ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400' },
    { label: 'overdue', value: data.overdue.length, tone: data.overdue.length ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
    { label: 'due today', value: data.today.length, tone: 'text-slate-700 dark:text-slate-200' },
  ]
  const medianText = data.medianResponse == null ? null
    : `Your median first reply this week: ${fmt.duration(data.medianResponse)}${data.medianResponse > settings.slaMinutes ? ' — slower than target' : ''}.`

  return (
    <>
      <PageHeader title={`${greeting}, ${me?.name.split(' ')[0] ?? ''}`}
        subtitle={loading ? 'Loading your day…'
          : doNow ? `${doNow} thing${doNow > 1 ? 's' : ''} to do now. The first shop to reply usually gets the visit.`
          : 'You are all caught up.'}
        actions={canSeeTeam && <Segmented label="Whose work" value={who} onChange={setWho} options={[{ value: 'mine', label: 'My work' }, { value: 'all', label: 'Everyone' }]} />} />

      {!loading && (
        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {glance.map(g => (
            <span key={g.label} className="inline-flex items-baseline gap-1.5">
              <span className={cx('text-lg font-semibold tabular-nums', g.tone)}>{g.value}</span>
              <span className="text-slate-500">{g.label}</span>
            </span>
          ))}
          {medianText && <span className="w-full text-xs text-slate-400 sm:ml-auto sm:w-auto"><Phone size={12} className="mr-1 inline" />{medianText}</span>}
        </div>
      )}

      {loading ? <Card><TableSkeleton rows={6} /></Card> : (
        <div className="space-y-6">
          <Card padded={false} title={<span className="flex items-center gap-2">Do now<Badge color="red">{queue.length}</Badge></span>}
            action={<span className="text-xs text-slate-500">New leads within {settings.slaMinutes} min</span>}>
            {queue.length === 0 ? <EmptyState icon={<CheckCircle2 size={20} />} title="Nothing left to do now" hint="No new leads waiting and no tasks due today." /> : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {queue.map(item => item.kind === 'respond' ? renderRespond(item.lead) : renderTask(item.task))}
              </ul>
            )}
          </Card>

          {renderTasks({ title: 'Next 7 days', tone: 'slate', tasks: data.upcoming, empty: 'No follow-ups scheduled this week.' })}
        </div>
      )}
    </>
  )

  // All called as functions (not <Component/>) so the 30s clock tick does not remount open menus.
  function renderRespond(l: Lead) {
    const cat = categoryById.get(l.categoryId)
    return (
      <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
        <div className="sm:w-28"><SlaTimer lead={l} compact /></div>
        <button className="min-w-0 flex-1 text-left" onClick={() => openLead(l.id)}>
          <p className="truncate text-sm font-medium hover:text-indigo-600">{l.name}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-slate-500"><CollectionIcon id={l.categoryId} size={13} />{cat?.name} · {l.campaignId ? campaignById.get(l.campaignId)?.name : l.source}</p>
        </button>
        <ScorePill lead={l} />
        <div className="flex gap-1.5">
          {!l.assigneeId && <button className="btn btn-sm" onClick={() => assignLeads([l.id], me!.id)}><UserPlus size={14} /> Claim</button>}
          <a className="btn btn-sm" href={`tel:${l.phone.replace(/\s/g, '')}`} onClick={() => openLead(l.id)}><Phone size={14} /> Call</a>
          {intro && (
            <button className="btn btn-sm" onClick={() => {
              window.open(`https://wa.me/${l.phone.replace(/\D/g, '')}?text=${encodeURIComponent(fillTemplate(intro.body, { first_name: l.name.split(' ')[0], agent: me?.name.split(' ')[0] ?? '', brand: brand?.name ?? '' }))}`, '_blank', 'noopener')
              logContact(l.id, 'whatsapp', `WhatsApp · ${intro.name}`)
            }}><MessageCircle size={14} /> Intro</button>
          )}
        </div>
      </li>
    )
  }

  function renderTask(t: Task) {
    const l = leadById.get(t.leadId)!
    const cat = categoryById.get(l.categoryId)
    const overdue = new Date(t.dueAt).getTime() < now
    return (
      <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
        <button onClick={() => updateTask(t.id, { done: true })} aria-label={`Complete ${t.title}`}
          className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-transparent transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-600"><Check size={12} strokeWidth={3} /></button>
        <span className="text-slate-400">{TASK_ICON[t.type]}</span>
        <button className="min-w-0 flex-1 text-left" onClick={() => openLead(l.id)}>
          <p className="truncate text-sm"><span className="font-medium">{t.title}</span> <span className="text-slate-500">· {l.name}</span></p>
          <p className="flex items-center gap-1.5 truncate text-xs text-slate-500"><CollectionIcon id={l.categoryId} size={13} />{cat?.name}</p>
        </button>
        <LeadStatusBadge status={l.status} />
        <ScorePill lead={l} showNumber={false} />
        <span className={cx('w-32 text-right text-xs tabular-nums', overdue ? 'font-medium text-rose-600' : 'text-slate-500')}>{fmt.due(t.dueAt)}</span>
        <Menu label="Snooze" align="right" button={<button className="btn btn-ghost btn-sm" aria-label="Snooze"><AlarmClock size={14} /></button>}>
          {close => DUE_PRESETS.map(p => <MenuItem key={p.label} onClick={() => { updateTask(t.id, { dueAt: p.at().toISOString() }); close() }}>{p.label}</MenuItem>)}
        </Menu>
      </li>
    )
  }

  function renderTasks({ title, tasks, tone, empty }: { title: string; tasks: Task[]; tone: 'red' | 'indigo' | 'slate'; empty?: string }) {
    if (!tasks.length && !empty) return null
    return (
      <Card padded={false} title={<span className="flex items-center gap-2">{title}<Badge color={tone}>{tasks.length}</Badge></span>}>
        {tasks.length === 0 ? <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500 dark:border-slate-800">{empty}</p> : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {tasks.map(renderTask)}
          </ul>
        )}
      </Card>
    )
  }
}
