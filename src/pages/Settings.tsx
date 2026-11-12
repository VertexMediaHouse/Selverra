import { useState } from 'react'
import { CalendarDays, Mail, MessageCircle, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { LEAD_STATUSES, type Template } from '../data/types'
import { Avatar, Badge, Card, CollectionIcon, cx, Modal, PageHeader, Segmented, Select, Skeleton } from '../components/ui'
import { useStore } from '../store'
import { fmt } from '../lib/format'
import { fillTemplate, isClosed } from '../lib/leads'
import { todayIso } from '../lib/metrics'

type Tab = 'connection' | 'team' | 'templates' | 'rules'

export default function Settings() {
  const [tab, setTab] = useState<Tab>('connection')
  return (
    <>
      <PageHeader title="Settings" subtitle="Meta ad account, team, message templates, silver rate and the festive calendar." />
      <div className="mb-6 overflow-x-auto">
        <Segmented label="Settings section" value={tab} onChange={setTab}
          options={[{ value: 'connection', label: 'Meta connection' }, { value: 'team', label: 'Team' }, { value: 'templates', label: 'Templates' }, { value: 'rules', label: 'Rate & rules' }]} />
      </div>
      {tab === 'connection' && <Connection />}
      {tab === 'team' && <Team />}
      {tab === 'templates' && <Templates />}
      {tab === 'rules' && <Rules />}
    </>
  )
}

function Connection() {
  const { brand, campaigns, categories, syncBrand, loading } = useStore()
  const [syncing, setSyncing] = useState(false)
  const sync = async () => { setSyncing(true); await syncBrand(); setSyncing(false) }
  if (loading || !brand) return <Skeleton className="h-40" />
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Meta Business account">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-2xl leading-none font-bold text-white">f</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{brand.name}</p>
              {brand.connected ? <Badge color="green"><span className="size-1.5 rounded-full bg-emerald-500" />Connected</Badge> : <Badge color="amber">Needs reconnect</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Ad account <span className="font-mono text-xs">{brand.adAccountId}</span></p>
            <p className="mt-2 text-xs text-slate-500">{campaigns.length} campaigns across {categories.length} product categories · Last sync {brand.lastSyncAt ? fmt.relative(brand.lastSyncAt) : 'never'}</p>
          </div>
          <button className={cx('btn btn-sm', !brand.connected && 'btn-primary')} onClick={sync} disabled={syncing}>
            <RefreshCw size={14} className={cx(syncing && 'animate-spin')} />{syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          {[['Lead form webhook', brand.connected ? 'Active' : '—'], ['Pixel', '—'], ['WhatsApp Business', '—'], ['Catalogue', '—']].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-0.5">{v}</dd></div>
          ))}
        </dl>
      </Card>
      <Card title="Product categories" action={<button className="btn btn-sm" disabled title="Coming soon"><Plus size={14} /> Add</button>}>
        <p className="mb-3 text-sm text-slate-500">Each campaign promotes one category. Categories drive the breakdowns on Overview and Insights.</p>
        <ul className="grid grid-cols-2 gap-2">
          {categories.map(c => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <CollectionIcon id={c.id} size={15} /><span className="flex-1 truncate">{c.name}</span>
              <span className="text-xs text-slate-400">{campaigns.filter(x => x.categoryId === c.id).length}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Team() {
  const { users, leads, loading } = useStore()
  if (loading) return <Skeleton className="h-64" />
  return (
    <Card title="Team" action={<button className="btn btn-sm" disabled title="Coming soon"><Plus size={14} /> Add member</button>}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {users.map(u => {
          const open = leads.filter(l => l.assigneeId === u.id && !isClosed(l)).length
          return (
            <li key={u.id} className="flex items-center gap-3 py-3">
              <Avatar name={u.name} size="md" />
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">{u.name}</p><p className="truncate text-xs text-slate-500">{u.email}</p></div>
              <span className="hidden text-xs text-slate-500 sm:inline">{open} open enquiries</span>
              <Badge color={u.role === 'Owner' || u.role === 'Manager' ? 'indigo' : 'slate'}>{u.role}</Badge>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

const NEW_TEMPLATE: Template = { id: '', name: '', channel: 'whatsapp', stage: 'Any', body: 'Namaste {{first_name}} ji, ' }

function Templates() {
  const { templates, saveTemplate, deleteTemplate, me, brand } = useStore()
  const [edit, setEdit] = useState<Template | null>(null)
  const valid = edit && edit.name.trim() && edit.body.trim()
  const vars = { first_name: 'Pooja', agent: me?.name.split(' ')[0] ?? '', brand: brand?.name ?? '' }
  return (
    <>
      <Card title="Message templates" action={<button className="btn btn-primary btn-sm" onClick={() => setEdit({ ...NEW_TEMPLATE, id: crypto.randomUUID() })}><Plus size={14} /> New template</button>}>
        <p className="mb-4 text-sm text-slate-500">Used by the WhatsApp and Email buttons on an enquiry. Templates matching the enquiry's stage are suggested first. Variables: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{'{{first_name}}'}</code> <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{'{{agent}}'}</code> <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{'{{brand}}'}</code></p>
        <ul className="grid gap-3 md:grid-cols-2">
          {templates.map(t => (
            <li key={t.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {t.channel === 'whatsapp' ? <MessageCircle size={15} className="text-emerald-600" /> : <Mail size={15} className="text-sky-600" />}
                <p className="flex-1 truncate text-sm font-medium">{t.name}</p>
                <Badge>{t.stage === 'Any' ? 'Any stage' : t.stage}</Badge>
                <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" onClick={() => setEdit(t)} aria-label={`Edit ${t.name}`}><Pencil size={14} /></button>
                <button className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" onClick={() => deleteTemplate(t.id)} aria-label={`Delete ${t.name}`}><Trash2 size={14} /></button>
              </div>
              <p className="mt-2 line-clamp-3 text-sm whitespace-pre-line text-slate-500">{t.body}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={templates.some(t => t.id === edit?.id) ? 'Edit template' : 'New template'} wide
        footer={<><button className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" disabled={!valid} onClick={() => { saveTemplate({ ...edit!, name: edit!.name.trim() }); setEdit(null) }}>Save template</button></>}>
        {edit && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <div><label className="label" htmlFor="tp-name">Name</label><input id="tp-name" className="input w-full" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="label">Channel</span>
                  <Select label="Channel" className="w-full" value={edit.channel} onChange={v => setEdit({ ...edit, channel: v as Template['channel'] })}><option value="whatsapp">WhatsApp</option><option value="email">Email</option></Select></div>
                <div><span className="label">Suggest at stage</span>
                  <Select label="Stage" className="w-full" value={edit.stage} onChange={v => setEdit({ ...edit, stage: v as Template['stage'] })}><option>Any</option>{LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}</Select></div>
              </div>
              {edit.channel === 'email' && <div><label className="label" htmlFor="tp-subj">Subject</label><input id="tp-subj" className="input w-full" value={edit.subject ?? ''} onChange={e => setEdit({ ...edit, subject: e.target.value })} /></div>}
              <div><label className="label" htmlFor="tp-body">Message</label><textarea id="tp-body" className="input h-40 w-full resize-y py-2" value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} /></div>
            </div>
            <div>
              <span className="label">Preview</span>
              <div className="rounded-xl bg-[#e5ddd5] p-4 dark:bg-slate-800">
                <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#dcf8c6] p-3 text-sm whitespace-pre-line text-slate-900 shadow-sm">
                  {edit.subject && <p className="mb-1 font-semibold">{fillTemplate(edit.subject, vars)}</p>}
                  {fillTemplate(edit.body, vars) || <span className="text-slate-400">Start typing…</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function Rules() {
  const { settings, updateSettings, festivals, categoryById } = useStore()
  const [rate, setRate] = useState('')
  const today = todayIso()
  const saveRate = () => {
    const n = Number(rate)
    if (n > 0) updateSettings({ silverRate: Math.round(n), silverRateAt: new Date().toISOString() })
    setRate('')
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Today's silver rate">
        <p className="mb-3 text-sm text-slate-500">Used to estimate grams when staff record a sale. Enter the rate per kg for 999 silver.</p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label" htmlFor="rate">₹ per kg</label>
            <input id="rate" type="number" min={0} step={100} inputMode="numeric" className="input w-full tabular-nums" placeholder={String(settings.silverRate)} value={rate} onChange={e => setRate(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveRate()} />
          </div>
          <button className="btn btn-primary" disabled={!Number(rate)} onClick={saveRate}>Update</button>
        </div>
        <p className="mt-3 text-sm">
          Current: <b className="tabular-nums">{fmt.currency(settings.silverRate)}/kg</b>
          <span className="text-slate-500"> · ≈{fmt.currency(settings.silverRate / 1000)}/g</span>
          <span className="block text-xs text-slate-500">{settings.silverRateAt ? `Updated ${fmt.relative(settings.silverRateAt)}` : 'Not updated today'}</span>
        </p>
      </Card>

      <Card title="Response time target">
        <p className="mb-3 text-sm text-slate-500">New enquiries waiting longer than this turn red and trigger an alert.</p>
        <Segmented label="Response time target" value={settings.slaMinutes} onChange={v => updateSettings({ slaMinutes: v })}
          options={[5, 15, 30, 60].map(m => ({ value: m, label: `${m} min` }))} />
        <p className="mt-5 mb-2 text-sm font-medium">Hot enquiry threshold</p>
        <p className="mb-3 text-sm text-slate-500">Score combines stated intent, stage, how recent it is and call outcomes.</p>
        <div className="flex items-center gap-3">
          <input type="range" min={50} max={90} step={5} value={settings.hotScore} onChange={e => updateSettings({ hotScore: Number(e.target.value) })} className="flex-1 accent-indigo-600" aria-label="Hot score threshold" />
          <span className="w-10 text-right font-semibold tabular-nums">{settings.hotScore}</span>
        </div>
        <div className="mt-2 flex gap-2 text-xs"><Badge color="blue">Cold &lt; 40</Badge><Badge color="amber">Warm 40–{settings.hotScore - 1}</Badge><Badge color="red">Hot ≥ {settings.hotScore}</Badge></div>
      </Card>

      <Card title="Festive calendar" className="lg:col-span-2" action={<span className="text-xs text-slate-500">Lunar dates shift each year — confirm against the panchang</span>}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {festivals.map(f => {
            const days = Math.round((new Date(`${f.date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
            const past = days < 0
            return (
              <li key={f.id} className={cx('flex flex-wrap items-start gap-x-4 gap-y-1 py-3', past && 'opacity-50')}>
                <CalendarDays size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <div className="min-w-44">
                  <p className="text-sm font-medium">{f.name} {f.approx && <span className="text-xs font-normal text-slate-400">(approx)</span>}</p>
                  <p className="text-xs text-slate-500">{fmt.date(f.date)} · {past ? 'past' : days === 0 ? 'today' : `in ${days} days`}</p>
                </div>
                <p className="min-w-48 flex-1 text-sm text-slate-500">{f.tip}</p>
                <div className="flex flex-wrap gap-1">
                  {f.categoryIds.map(id => {
                    const c = categoryById.get(id)
                    return c && <span key={id} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800"><CollectionIcon id={c.id} size={13} />{c.name}</span>
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
