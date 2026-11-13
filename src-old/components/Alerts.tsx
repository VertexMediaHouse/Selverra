import { AlertOctagon, AlertTriangle, Info, Rocket, X } from 'lucide-react'
import type { Alert, Severity } from '../lib/alerts'
import { go, useStore } from '../store'
import { CategoryTag, cx } from './ui'

const STYLE: Record<Severity, { icon: typeof Info; cls: string }> = {
  critical: { icon: AlertOctagon, cls: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
  success: { icon: Rocket, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
  info: { icon: Info, cls: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400' },
}

export function AlertItem({ alert, onDone }: { alert: Alert; onDone?: () => void }) {
  const { dismissAlert, updateCampaign, campaignById, filters } = useStore()
  const { icon: Icon, cls } = STYLE[alert.severity]
  const c = alert.action ? campaignById.get(alert.action.campaignId) : undefined
  const act = () => {
    if (!c || !alert.action) return
    if (alert.action.kind === 'pause') updateCampaign(c.id, { status: 'PAUSED' }, `Paused ${c.name}`)
    else {
      const next = Math.round((c.dailyBudget * 1.2) / 50) * 50
      updateCampaign(c.id, { dailyBudget: next }, `Budget raised to ₹${next.toLocaleString('en-IN')}/day`)
    }
    dismissAlert(alert.id)
    onDone?.()
  }
  return (
    <li className="group flex gap-3 px-3 py-3">
      <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-lg', cls)}><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium">{alert.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alert.detail}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {c && alert.action && c.status === 'ACTIVE' && (
            <button className="btn btn-sm" onClick={act}>{alert.action.kind === 'pause' ? 'Pause campaign' : 'Raise budget 20%'}</button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={() => { go(alert.href); onDone?.() }}>View</button>
          {!filters.category && alert.categoryId && <span className="ml-auto"><CategoryTag id={alert.categoryId} /></span>}
        </div>
      </div>
      <button onClick={() => dismissAlert(alert.id)} className="h-fit rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 focus:opacity-100 dark:hover:bg-slate-800" aria-label="Dismiss alert"><X size={14} /></button>
    </li>
  )
}
