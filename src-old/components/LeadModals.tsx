import { useEffect, useState } from 'react'
import { CalendarCheck, IndianRupee } from 'lucide-react'
import { LOST_REASONS, type LeadSource } from '../data/types'
import { useStore } from '../store'
import { fmt } from '../lib/format'
import { cx, Modal, Select } from './ui'

/** datetime-local needs local time without the timezone suffix. */
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const atHour = (addDays: number, hour: number) => {
  const d = new Date()
  d.setDate(d.getDate() + addDays)
  d.setHours(hour, 0, 0, 0)
  return d
}
const VISIT_SLOTS = [
  { label: 'Today evening', at: () => atHour(0, 18) },
  { label: 'Tomorrow 11 AM', at: () => atHour(1, 11) },
  { label: 'Tomorrow 5 PM', at: () => atHour(1, 17) },
  { label: 'This weekend', at: () => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(12, 0, 0, 0); return d } },
]

/** One dialog for the three stages that need extra details. */
export function StatusModal() {
  const { statusPrompt, setStatusPrompt, setLeadStatus, leadById, categoryById, settings } = useStore()
  const status = statusPrompt?.status
  const ids = statusPrompt?.ids ?? []
  const lead = ids.length === 1 ? leadById.get(ids[0]) : undefined
  const who = lead ? lead.name : `${ids.length} leads`

  const [reason, setReason] = useState<string>(LOST_REASONS[0])
  const [visitAt, setVisitAt] = useState('')
  const [amount, setAmount] = useState('')
  const [grams, setGrams] = useState('')
  const [items, setItems] = useState('')

  useEffect(() => {
    if (!statusPrompt) return
    setReason(LOST_REASONS[0])
    setVisitAt(toLocalInput(atHour(1, 11)))
    setAmount('')
    setGrams('')
    setItems(lead ? categoryById.get(lead.categoryId)?.name ?? '' : '')
  }, [statusPrompt, lead, categoryById])

  // Silver rate (₹/kg) → rough grams for a bill amount, including making charges.
  const perGram = (settings.silverRate / 1000) * 1.25
  const suggestedGrams = Number(amount) > 0 && perGram > 0 ? Math.round(Number(amount) / perGram) : 0
  const close = () => setStatusPrompt(null)
  const confirm = () => {
    if (!status) return
    if (status === 'Lost') setLeadStatus(ids, status, { lostReason: reason })
    else if (status === 'Visit booked') setLeadStatus(ids, status, { visitAt: new Date(visitAt).toISOString() })
    else setLeadStatus(ids, status, { sale: { amount: Number(amount), grams: Number(grams || suggestedGrams), items: items.trim() } })
    close()
  }
  const valid = status === 'Purchased' ? Number(amount) > 0 : status === 'Visit booked' ? !!visitAt : true

  const title = status === 'Lost' ? `Why was ${who} lost?` : status === 'Visit booked' ? `Book a store visit · ${who}` : `Record sale · ${who}`
  const cta = status === 'Lost' ? 'Mark as lost' : status === 'Visit booked' ? 'Book visit' : 'Save sale'

  return (
    <Modal open={!!statusPrompt} onClose={close} title={title}
      footer={<>
        <button className="btn" onClick={close}>Cancel</button>
        <button className={cx('btn', status === 'Lost' ? 'border-rose-600 bg-rose-600 text-white hover:bg-rose-500 hover:text-white' : 'btn-primary')} disabled={!valid} onClick={confirm}>{cta}</button>
      </>}>
      {status === 'Lost' && (
        <>
          <p className="mb-3 text-sm text-slate-500">Lost reasons show which campaigns bring poor-fit enquiries.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LOST_REASONS.map(r => (
              <label key={r} className={cx('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', reason === r ? 'border-rose-400 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')}>
                <input type="radio" name="lost" className="accent-rose-600" checked={reason === r} onChange={() => setReason(r)} />{r}
              </label>
            ))}
          </div>
        </>
      )}

      {status === 'Visit booked' && (
        <>
          <p className="mb-3 text-sm text-slate-500">A reminder task is created for whoever owns the lead.</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {VISIT_SLOTS.map(s => (
              <button key={s.label} className={cx('btn btn-sm', visitAt === toLocalInput(s.at()) && 'btn-primary')} onClick={() => setVisitAt(toLocalInput(s.at()))}>{s.label}</button>
            ))}
          </div>
          <label className="label" htmlFor="visit-at">Date & time</label>
          <input id="visit-at" type="datetime-local" className="input w-full" value={visitAt} onChange={e => setVisitAt(e.target.value)} />
          {visitAt && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><CalendarCheck size={14} />{fmt.dateTime(new Date(visitAt).toISOString())}</p>}
        </>
      )}

      {status === 'Purchased' && (
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="sale-amt">Bill amount (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input id="sale-amt" autoFocus type="number" min={0} step={50} inputMode="numeric" className="input w-full pl-8 tabular-nums" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sale-g">Weight (grams)</label>
            <input id="sale-g" type="number" min={0} className="input w-full tabular-nums" placeholder={suggestedGrams ? `≈ ${suggestedGrams} g at today's rate` : ''} value={grams} onChange={e => setGrams(e.target.value)} />
            {!!suggestedGrams && !grams && <p className="mt-1 text-xs text-slate-500">Left blank, we will record ≈{suggestedGrams} g (silver at {fmt.currency(settings.silverRate)}/kg plus making charges).</p>}
          </div>
          <div>
            <label className="label" htmlFor="sale-items">Items</label>
            <input id="sale-items" className="input w-full" placeholder="e.g. Ghungroo payal (pair)" value={items} onChange={e => setItems(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  )
}

const EMPTY = { name: '', phone: '', email: '', source: 'Walk-in' as LeadSource, campaignId: '', assigneeId: '' }

export function NewLeadModal() {
  const { newLeadOpen, setNewLeadOpen, categories, campaigns, users, filters, createLead, openLead } = useStore()
  const [form, setForm] = useState({ ...EMPTY, categoryId: '' })
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (newLeadOpen) {
      setForm({ ...EMPTY, categoryId: filters.category || categories[0]?.id || '' })
      setTouched(false)
    }
  }, [newLeadOpen, filters.category, categories])

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }))
  const phoneDigits = form.phone.replace(/\D/g, '')
  const errors = {
    name: !form.name.trim() && 'Name is required',
    phone: (phoneDigits.length < 10 || phoneDigits.length > 13) && 'Enter a valid phone number',
    email: form.email && !/^\S+@\S+\.\S+$/.test(form.email) && 'Enter a valid email',
  }
  const valid = !Object.values(errors).some(Boolean)
  const close = () => setNewLeadOpen(false)
  const submit = async () => {
    setTouched(true)
    if (!valid || saving) return
    setSaving(true)
    const lead = await createLead({
      name: form.name.trim(), email: form.email.trim(), source: form.source, categoryId: form.categoryId,
      phone: phoneDigits.length === 10 ? `+91 ${phoneDigits}` : `+${phoneDigits}`,
      campaignId: form.campaignId || null, assigneeId: form.assigneeId || null,
    })
    setSaving(false)
    close()
    openLead(lead.id)
  }
  const err = (k: keyof typeof errors) => touched && errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>

  return (
    <Modal open={newLeadOpen} onClose={close} title="Add enquiry"
      footer={<><button className="btn" onClick={close}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add enquiry'}</button></>}>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit() }}>
        <div>
          <label className="label" htmlFor="nl-name">Customer name</label>
          <input id="nl-name" className="input w-full" autoFocus value={form.name} onChange={e => set({ name: e.target.value })} />
          {err('name')}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="nl-phone">Phone</label>
            <input id="nl-phone" className="input w-full" inputMode="tel" placeholder="98765 43210" value={form.phone} onChange={e => set({ phone: e.target.value })} />
            {err('phone')}
          </div>
          <div>
            <label className="label" htmlFor="nl-email">Email <span className="text-slate-400">(optional)</span></label>
            <input id="nl-email" className="input w-full" type="email" value={form.email} onChange={e => set({ email: e.target.value })} />
            {err('email')}
          </div>
        </div>
        <div>
          <span className="label">Interested in</span>
          <Select label="Category" className="w-full" value={form.categoryId} onChange={v => set({ categoryId: v })}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="label">Source</span>
            <Select label="Source" className="w-full" value={form.source} onChange={v => set({ source: v as LeadSource })}>
              {(['Walk-in', 'Phone call', 'Referral', 'Meta Lead Ad'] as const).map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div>
            <span className="label">Owner</span>
            <Select label="Owner" className="w-full" value={form.assigneeId} onChange={v => set({ assigneeId: v })}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <span className="label">Campaign <span className="text-slate-400">(optional)</span></span>
          <Select label="Campaign" className="w-full" value={form.campaignId} onChange={v => set({ campaignId: v })}>
            <option value="">None</option>
            {campaigns.filter(c => !form.categoryId || c.categoryId === form.categoryId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
