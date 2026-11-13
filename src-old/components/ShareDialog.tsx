import { useEffect, useState } from 'react'
import { Share2, User, Users, X } from 'lucide-react'
import { cx, Modal, Select } from './ui'
import { useStore } from '../store'
import type { Module, Permission } from '../data/types'

export function ShareDialog({ open, onClose, module, recordId, owner, title }: { open: boolean; onClose: () => void; module: Module; recordId: string; owner: string; title?: string }) {
  const { shares, users, shareable, me, createShare, revokeShare, userById } = useStore()
  const [target, setTarget] = useState('')
  const [perm, setPerm] = useState<Permission>('view')
  const mine = shares.filter(s => s.module === module && s.recordId === recordId)
  const ownerName = users.find(u => u.id === owner)?.name ?? owner

  useEffect(() => { setTarget(''); setPerm('view') }, [open])

  const submit = () => {
    if (!target) return
    createShare(module, recordId, target, perm)
    setTarget('')
  }

  return (
    <Modal open={open} onClose={onClose} title={title ?? `Share ${module} · ${recordId.slice(0, 8)}`}
      footer={<><button className="btn" onClick={onClose}>Done</button></>}>
      <div className="space-y-5">
        {owner && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
            <User size={15} className="text-slate-400" />
            <span className="text-slate-500">Owner:</span>
            <span className="font-medium">{ownerName}</span>
          </div>
        )}

        <div>
          <span className="label">Give access to</span>
          <Select label="User" className="w-full" value={target} onChange={setTarget}>
            <option value="">Select a person…</option>
            {shareable.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
          </Select>
          {shareable.length === 0 && <p className="mt-1 text-xs text-slate-500">No one in your subtree to share with.</p>}
        </div>

        <div>
          <span className="label">Permission</span>
          <div className="flex gap-2">
            {(['view', 'edit'] as Permission[]).map(p => (
              <button key={p} onClick={() => setPerm(p)}
                className={cx('flex-1 rounded-lg border px-3 py-2 text-sm font-medium', perm === p ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')}>
                {p === 'edit' ? 'Edit' : 'View'}
                <span className="block text-[11px] font-normal text-slate-500">{p === 'edit' ? 'Can change the record' : 'Read only'}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary w-full justify-center" disabled={!target} onClick={submit}>
          <Share2 size={15} /> Share
        </button>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            <Users size={13} /> Shared with {mine.length}
          </p>
          {mine.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700">Nobody else has access yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {mine.map(s => {
                const u = userById.get(s.sharedWith)
                const canRevoke = s.sharedBy === me?.id || me?.role === 'Owner'
                return (
                  <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {u?.name.split(' ').map(p => p[0]).slice(0, 2).join('') ?? '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u?.name ?? s.sharedWith}</p>
                      <p className="truncate text-[11px] text-slate-500">{s.permission} · by {users.find(x => x.id === s.sharedBy)?.name ?? s.sharedBy}</p>
                    </div>
                    {canRevoke && (
                      <button className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" onClick={() => revokeShare(s.id)} aria-label="Revoke">
                        <X size={14} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}