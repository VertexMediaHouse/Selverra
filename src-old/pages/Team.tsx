import { useMemo } from 'react'
import { Clock, UserPlus, Users } from 'lucide-react'
import { Avatar, Card, cx, DateRangeFilter, EmptyState, KpiCard, LeadStatusBadge, PageHeader, Progress, TableSkeleton } from '../components/ui'
import { DataTable } from '../components/DataTable'
import { useNow, useStore } from '../store'
import { fmt } from '../lib/format'
import { inRange, leadDay } from '../lib/metrics'
import { getSubtree } from '../lib/shares'
import { isClosed, median, repStats, responseMinutes, waitingMinutes } from '../lib/leads'

/**
 * Manager dashboard. A manager does not watch ad spend — they watch their own branch:
 * who is slow, what is unassigned, and what is about to breach the SLA.
 * Scope comes from the data layer (api.getLeads is already limited to their subtree).
 */
export default function Team() {
  const { me, users, scoped, settings, loading, filters, assignLeads, openLead } = useStore()
  const { from, to } = filters
  const now = useNow()

  // Everyone under this manager, excluding the manager themselves.
  const team = useMemo(() => (me ? getSubtree(users, me.id).filter(u => u.id !== me.id) : []), [users, me])
  const cur = useMemo(() => scoped.leads.filter(l => inRange(leadDay(l), from, to)), [scoped.leads, from, to])

  const m = useMemo(() => {
    const times = cur.map(responseMinutes).filter((x): x is number => x != null)
    const bought = cur.filter(l => l.status === 'Purchased')
    const closed = cur.filter(isClosed).length
    return {
      leads: cur.length,
      unassigned: cur.filter(l => !l.assigneeId).length,
      medianResponse: median(times),
      withinSla: times.length ? (times.filter(t => t <= settings.slaMinutes).length / times.length) * 100 : null,
      revenue: bought.reduce((s, l) => s + (l.sale?.amount ?? 0), 0),
      closeRate: closed ? (bought.length / closed) * 100 : null,
      bills: bought.length,
    }
  }, [cur, settings.slaMinutes])

  const people = useMemo(() => repStats(cur, team, settings.slaMinutes).sort((a, b) => b.revenue - a.revenue), [cur, team, settings.slaMinutes])

  // The manager's actual job: enquiries nobody has answered, worst wait first.
  const needsAction = useMemo(() => scoped.leads
    .filter(l => l.status === 'New' || !l.assigneeId)
    .map(l => ({ ...l, waiting: waitingMinutes(l, now) ?? 0 }))
    .sort((a, b) => b.waiting - a.waiting)
    .slice(0, 12), [scoped.leads, now])

  const slaTone = (v: number | null) => (v ?? 0) >= 70 ? 'green' : (v ?? 0) >= 40 ? 'amber' : 'red'

  return (
    <>
      <PageHeader title={`${me?.name ?? 'My'} · team`}
        subtitle={`${team.length} ${team.length === 1 ? 'person' : 'people'} reporting · ${fmt.date(from)} – ${fmt.date(to)}`}
        actions={<DateRangeFilter />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard loading={loading} delta={null} label="Enquiries" value={fmt.number(m.leads)} hint="Assigned anywhere in your team" />
        <KpiCard loading={loading} delta={null} label="Unassigned" value={fmt.number(m.unassigned)} hint="Nobody owns these yet" />
        <KpiCard loading={loading} delta={null} label="Median response" value={fmt.duration(m.medianResponse)} hint={`Target ${settings.slaMinutes} min`} />
        <KpiCard loading={loading} delta={null} label={`Within ${settings.slaMinutes}m`} value={fmt.percent(m.withinSla, 0)} />
        <KpiCard loading={loading} delta={null} label="Bills" value={fmt.number(m.bills)} hint={`Close rate ${fmt.percent(m.closeRate, 0)}`} />
        <KpiCard loading={loading} delta={null} label="Sales value" value={fmt.currency(m.revenue)} />
      </div>

      {/* Needs action: the queue a manager clears every morning */}
      <Card title="Needs action now" className="mt-6" padded={false}
        action={<span className="flex items-center gap-1.5 pr-5 text-xs text-slate-500"><Clock size={12} /> Longest wait first</span>}>
        {loading ? <TableSkeleton rows={5} /> : needsAction.length === 0 ? (
          <EmptyState icon={<Clock size={20} />} title="Queue is clear" hint="Every enquiry is assigned and answered." />
        ) : (
          <DataTable rows={needsAction} rowKey={l => l.id}
            columns={[
              { key: 'name', label: 'Enquiry', value: l => l.name, render: l => (
                <button onClick={() => openLead(l.id)} className="text-left font-medium hover:underline">
                  {l.name}
                  <span className="block text-xs text-slate-500">{l.source}</span>
                </button>
              ) },
              { key: 'status', label: 'Stage', value: l => l.status, render: l => <LeadStatusBadge status={l.status} /> },
              { key: 'waiting', label: 'Waiting', value: l => l.waiting, align: 'right',
                render: l => <span className={cx('font-medium tabular-nums', l.waiting > settings.slaMinutes ? 'text-rose-600' : 'text-amber-600')}>{fmt.duration(l.waiting)}</span> },
              { key: 'assignee', label: 'Owner', value: l => l.assigneeId ?? '', render: l => l.assigneeId
                ? <span className="flex items-center gap-2"><Avatar name={users.find(u => u.id === l.assigneeId)?.name} size="xs" />{users.find(u => u.id === l.assigneeId)?.name}</span>
                : <span className="text-xs text-slate-500">Unassigned</span> },
              { key: 'act', label: '', value: () => '', align: 'right', render: l => (
                <select aria-label={`Assign ${l.name}`} value={l.assigneeId ?? ''}
                  onChange={e => assignLeads([l.id], e.target.value || null)}
                  className="input py-1 text-xs">
                  <option value="">Assign to…</option>
                  {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) },
            ]} />
        )}
      </Card>

      {/* Per-person performance inside this branch */}
      <Card title="My people" className="mt-6" padded={false}
        action={<span className="pr-5 text-xs text-slate-500">Target: first contact within {settings.slaMinutes} min</span>}>
        {loading ? <TableSkeleton rows={4} /> : people.length === 0 ? (
          <EmptyState icon={<UserPlus size={20} />} title="No assigned enquiries yet"
            hint={team.length === 0 ? 'Nobody reports to you. Set reporting lines in Settings.' : 'Assign enquiries from the queue above.'} />
        ) : (
          <DataTable rows={people} rowKey={r => r.user.id} initialSort={{ key: 'revenue', dir: 'desc' }}
            columns={[
              { key: 'rep', label: 'Staff', value: r => r.user.name, render: r => (
                <span className="flex items-center gap-2.5">
                  <Avatar name={r.user.name} size="xs" />
                  <span><span className="block font-medium">{r.user.name}</span><span className="block text-xs text-slate-500">{r.user.role}</span></span>
                </span>
              ) },
              { key: 'assigned', label: 'Enquiries', value: r => r.assigned, align: 'right' },
              { key: 'speed', label: 'Median response', value: r => r.medianResponse, align: 'right',
                render: r => <span className={cx('font-medium', (r.medianResponse ?? 0) > settings.slaMinutes ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400')}>{fmt.duration(r.medianResponse)}</span> },
              { key: 'sla', label: `Within ${settings.slaMinutes}m`, value: r => r.withinSla, align: 'right', className: 'hidden md:table-cell w-44', render: r => (
                <span className="flex items-center justify-end gap-2">
                  <span className="w-20"><Progress value={r.withinSla ?? 0} tone={slaTone(r.withinSla)} /></span>
                  <span className="w-10 tabular-nums">{fmt.percent(r.withinSla, 0)}</span>
                </span>
              ) },
              { key: 'won', label: 'Bills', value: r => r.won, align: 'right' },
              { key: 'revenue', label: 'Sales value', value: r => r.revenue, align: 'right', render: r => <span className="font-medium">{fmt.currency(r.revenue)}</span> },
              { key: 'win', label: 'Close rate', value: r => r.winRate, align: 'right', className: 'hidden lg:table-cell', render: r => fmt.percent(r.winRate, 0) },
            ]} />
        )}
      </Card>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Users size={12} /> Manager view. You see your own branch only; the owner sees every branch.
      </p>
    </>
  )
}
