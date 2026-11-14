import { useMemo, useState } from 'react'
import { Card, PageHead, Pill, Select, Toast } from '../components/ui'
import { IconSync } from '../components/icons'
import { LEADS } from '../data/mock'
import { COLLECTIONS, REPS, SOURCES, STAGES } from '../data/types'

const CAMPAIGN_NAMES = [
  'Sannjh Bridal – Lead Form',
  'Uphaar Gifting – Messenger',
  'Regalia – Instagram DM',
  'Moksha Temple Decor – Lead Form',
  'New Traffic Campaign',
  'No campaign',
]

const AD_SETS = [
  'Brides-to-be 22–32 · Ahmedabad',
  'Lookalike 1% – past buyers',
  'Festive gifting · Gujarat',
]

/** What the nightly backup copies into the sheet. Everything but the full
 *  activity log is on by default — that one is large and rarely read back. */
const BACKUP_PARTS = [
  { id: 'leads', label: 'Leads with contact details and stage', on: true },
  { id: 'purchases', label: 'Purchases (items, amount, weight, bill no.)', on: true },
  { id: 'tasks', label: 'Tasks', on: true },
  { id: 'calendar', label: 'Site visits and calendar items', on: true },
  { id: 'meta', label: 'Campaign numbers from Meta', on: true },
  { id: 'activity', label: 'Full activity history (messages sent, calls)', on: false },
]

const SHEET_LAYOUTS = [
  { id: 'all', label: 'One tab with all leads' },
  { id: 'campaign', label: 'One tab per campaign' },
  { id: 'rep', label: 'One tab per salesperson' },
]

/** The columns of the file being imported, and which CRM field each one lands
 *  in. Sample data: a real upload would read these headers off the file. */
const IMPORT_COLUMNS = [
  { column: 'Customer Name', field: 'Full name' },
  { column: 'Mobile', field: 'Phone' },
  { column: 'Insta ID', field: 'Instagram handle' },
  { column: 'Interested Item', field: 'Collection (matched by name)' },
  { column: 'Remarks', field: 'Note' },
]

const CRM_FIELDS = [
  'Full name',
  'Phone',
  'Instagram handle',
  'Collection (matched by name)',
  'Note',
  'Source',
  'Salesperson',
  'Stage',
  'Skip this column',
]

/** Everything that has happened to the data: backups, exports, imports. */
const HISTORY = [
  { when: 'Today, 11:45 AM', what: 'Automatic backup', detail: '342 leads, 118 tasks, 61 visits → Selverra CRM Backup', by: 'System', ok: true },
  { when: 'Today, 10:12 AM', what: 'Export', detail: 'Sannjh Bridal – Lead Form · 138 leads · Excel', by: 'Mansi Joshi', ok: true },
  { when: 'Yesterday, 6:30 PM', what: 'Import', detail: 'exhibition-oct.xlsx · 48 rows: 45 added, 3 duplicates skipped', by: 'Owner', ok: true },
  { when: '11 Nov, 9:20 PM', what: 'Automatic backup', detail: 'Retried after Google sign-in was renewed', by: 'System', ok: true },
  { when: '11 Nov, 9:00 PM', what: 'Automatic backup', detail: 'Google sign-in had expired. Owner was alerted.', by: 'System', ok: false },
]

const IMPORT_FILE = { name: 'exhibition-nov.xlsx', rows: 48, dupes: 3 }

export default function SyncData() {
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [history, setHistory] = useState(HISTORY)
  const [lastBackup, setLastBackup] = useState('Today, 11:45 AM')
  const [auto, setAuto] = useState(true)
  const [often, setOften] = useState('Every change, within a minute')
  const [parts, setParts] = useState(() =>
    Object.fromEntries(BACKUP_PARTS.map((p) => [p.id, p.on])),
  )
  const [layout, setLayout] = useState('campaign')
  const [mapping, setMapping] = useState(() =>
    Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.column, c.field])),
  )
  const [imp, setImp] = useState({ campaign: 'No campaign', source: 'Exhibition', assign: 'Share equally in Sales team', dupes: 'Skip that row' })
  const [f, setF] = useState({
    campaign: 'Sannjh Bridal – Lead Form',
    adset: 'All ad sets',
    date: 'This month',
    source: 'All sources',
    stage: 'All stages',
    status: 'All',
    rep: 'Everyone',
    collection: 'All collections',
  })
  const [format, setFormat] = useState('Excel (.xlsx)')

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const setImport = (k: keyof typeof imp) => (v: string) => setImp((p) => ({ ...p, [k]: v }))

  /** How many leads the chosen export filters match. The sample book is small,
   *  so the campaign count is scaled to the real campaign total the rest of the
   *  app reports. */
  const matched = useMemo(() => {
    const rows = LEADS.filter(
      (l) =>
        (f.campaign === 'All campaigns' || l.campaign === f.campaign) &&
        (f.adset === 'All ad sets' || l.adset === f.adset) &&
        (f.source === 'All sources' || l.source === f.source) &&
        (f.stage === 'All stages' || l.stage === f.stage) &&
        (f.status === 'All' || l.status === f.status) &&
        (f.rep === 'Everyone' || l.rep === f.rep) &&
        (f.collection === 'All collections' || l.collection === f.collection),
    )
    const narrowed = Object.entries(f).some(
      ([k, v]) => k !== 'date' && !v.startsWith('All') && v !== 'Everyone',
    )
    return narrowed && f.campaign === 'Sannjh Bridal – Lead Form' ? 138 : rows.length
  }, [f])

  const run = (note: string, what: string, detail: string) => {
    setBusy(true)
    // Sample data: the backup/export/import is simulated so the screen can be
    // driven without a Google account.
    window.setTimeout(() => {
      setBusy(false)
      if (what === 'Automatic backup') setLastBackup('Just now')
      setHistory((h) => [{ when: 'Just now', what, detail, by: 'Owner', ok: true }, ...h])
      setToast(note)
    }, 900)
  }

  return (
    <>
      <PageHead
        title="Sync Data"
        sub="Automatic Google Sheets backup, plus export and import of leads by campaign or any filter"
      />

      <Card className="flex flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-bold">
              Google Sheets backup
              <Pill tone="bg-[#DCF5E3] text-good">Connected · auto backup on</Pill>
            </h2>
            <p className="mt-1.5 mb-0 text-[13px] text-ink-soft">
              Sheet: <strong className="font-semibold">Selverra CRM Backup</strong> · Google
              account: [connected account]
            </p>
            <p className="mt-1 mb-0 text-xs text-ink-mute">
              Last backup: {lastBackup} · 342 leads, 118 tasks, 61 visits
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://docs.google.com/spreadsheets"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-10 items-center rounded-[10px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-ink no-underline"
            >
              Open Google Sheet
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(
                  'Backup finished. The sheet is up to date.',
                  'Automatic backup',
                  '342 leads, 118 tasks, 61 visits → Selverra CRM Backup',
                )
              }
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border-0 bg-rail px-4 text-[13px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
            >
              <IconSync />
              {busy ? 'Working…' : 'Back up now'}
            </button>
          </div>
        </header>

        <div className="grid gap-x-8 gap-y-5 border-t border-line-soft pt-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-plum"
              />
              <span>
                <span className="block text-[13px] font-semibold text-ink">Automatic backup</span>
                <span className="block text-xs text-ink-mute">
                  Copies CRM data to the sheet without anyone clicking
                </span>
              </span>
            </label>
            <div className={auto ? '' : 'opacity-50'}>
              <Select
                label="How often"
                value={often}
                options={[
                  'Every change, within a minute',
                  'Every hour',
                  'Once a day, at 11:45 PM',
                ]}
                wide
                onChange={setOften}
              />
            </div>
          </div>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 p-0 text-[13px] font-semibold text-ink">What to back up</legend>
            {BACKUP_PARTS.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-start gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={parts[p.id]}
                  onChange={(e) => setParts((s) => ({ ...s, [p.id]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-plum"
                />
                {p.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 p-0 text-[13px] font-semibold text-ink">
              How the sheet is arranged
            </legend>
            {SHEET_LAYOUTS.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="radio"
                  name="sheet-layout"
                  checked={layout === l.id}
                  onChange={() => setLayout(l.id)}
                  className="h-4 w-4 cursor-pointer accent-plum"
                />
                {l.label}
              </label>
            ))}
            <p className="mt-1 mb-0 text-xs text-ink-mute">
              Deleted leads move to a “Deleted” tab instead of disappearing.
            </p>
          </fieldset>
        </div>
      </Card>

      <div className="grid items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Card className="flex flex-col gap-3.5">
          <header>
            <h2 className="m-0 text-[15px] font-bold">Export leads</h2>
            <p className="mt-1 mb-0 text-xs text-ink-mute">
              Pick a campaign or any mix of filters, then download.
            </p>
          </header>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            <Select label="Campaign" value={f.campaign} options={['All campaigns', ...CAMPAIGN_NAMES]} wide onChange={set('campaign')} />
            <Select label="Ad set" value={f.adset} options={['All ad sets', ...AD_SETS]} wide onChange={set('adset')} />
            <Select label="Date" value={f.date} options={['This month', 'Today', 'This week', 'Everything']} wide onChange={set('date')} />
            <Select label="Source" value={f.source} options={['All sources', ...SOURCES]} wide onChange={set('source')} />
            <Select label="Stage" value={f.stage} options={['All stages', ...STAGES]} wide onChange={set('stage')} />
            <Select label="Status" value={f.status} options={['All', 'Hot', 'Warm', 'Cold']} wide onChange={set('status')} />
            <Select label="Salesperson" value={f.rep} options={['Everyone', ...Object.keys(REPS)]} wide onChange={set('rep')} />
            <Select label="Collection" value={f.collection} options={['All collections', ...COLLECTIONS]} wide onChange={set('collection')} />
          </div>

          <div role="group" aria-label="File format" className="flex flex-wrap gap-2">
            {['Excel (.xlsx)', 'CSV', 'New Google Sheet'].map((o) => {
              const on = o === format
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFormat(o)}
                  className={`min-h-9 cursor-pointer rounded-[10px] border px-3 text-[13px] font-semibold ${
                    on ? 'border-plum bg-surface text-plum' : 'border-line bg-well/60 text-ink-soft'
                  }`}
                >
                  {o}
                </button>
              )
            })}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="m-0 text-xs text-ink-mute">
              <strong className="font-semibold text-ink">{matched} leads</strong> match ·{' '}
              {f.campaign === 'All campaigns' ? 'all campaigns' : f.campaign}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(
                  `Export started. ${matched} leads as ${format}.`,
                  'Export',
                  `${f.campaign} · ${matched} leads · ${format}`,
                )
              }
              className="min-h-10 cursor-pointer rounded-[10px] border-0 bg-rail px-4 text-[13px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
            >
              Export {matched} leads
            </button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3.5">
          <header>
            <h2 className="m-0 text-[15px] font-bold">Import leads</h2>
            <p className="mt-1 mb-0 text-xs text-ink-mute">
              Upload an Excel or CSV file, match the columns, choose where the leads go.
            </p>
          </header>

          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#DCD5D1] bg-well/60 px-4 py-4 text-center">
            <p className="m-0 text-[13px]">
              <strong className="font-semibold text-plum">{IMPORT_FILE.name}</strong> ·{' '}
              {IMPORT_FILE.rows} rows
            </p>
            <label className="flex cursor-pointer flex-col items-center gap-1.5 text-xs text-ink-mute">
              Choose another file
              <input
                type="file"
                accept=".csv,.xlsx"
                className="max-w-[220px] cursor-pointer text-xs file:mr-2 file:cursor-pointer file:rounded-md file:border file:border-line file:bg-surface file:px-2 file:py-1 file:text-xs file:font-semibold file:text-ink"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-well text-left text-ink-mute">
                  <th scope="col" className="rounded-l-lg px-3 py-2 font-medium">Column in your file</th>
                  <th scope="col" className="rounded-r-lg px-3 py-2 font-medium">Goes into CRM field</th>
                </tr>
              </thead>
              <tbody>
                {IMPORT_COLUMNS.map((c) => (
                  <tr key={c.column} className="border-t border-line-soft">
                    <td className="px-3 py-2 font-medium text-plum">{c.column}</td>
                    <td className="px-3 py-2">
                      <label>
                        <span className="sr-only">CRM field for {c.column}</span>
                        <select
                          value={mapping[c.column]}
                          onChange={(e) =>
                            setMapping((m) => ({ ...m, [c.column]: e.target.value }))
                          }
                          className="min-h-9 w-full rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink"
                        >
                          {CRM_FIELDS.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            <Select label="Campaign" value={imp.campaign} options={['No campaign', ...CAMPAIGN_NAMES]} wide onChange={setImport('campaign')} />
            <Select label="Source" value={imp.source} options={['Exhibition', ...SOURCES]} wide onChange={setImport('source')} />
            <Select
              label="Assign to"
              value={imp.assign}
              options={['Share equally in Sales team', 'Leave unassigned', ...Object.keys(REPS)]}
              wide onChange={setImport('assign')}
            />
            <Select
              label="Same phone already in CRM"
              value={imp.dupes}
              options={['Skip that row', 'Update the existing lead', 'Add anyway as a new lead']}
              wide onChange={setImport('dupes')}
            />
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="m-0 text-xs text-ink-mute">
              {IMPORT_FILE.rows - IMPORT_FILE.dupes} new · {IMPORT_FILE.dupes} already in the CRM
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(
                  `${IMPORT_FILE.rows - IMPORT_FILE.dupes} leads imported.`,
                  'Import',
                  `${IMPORT_FILE.name} · ${IMPORT_FILE.rows} rows: ${IMPORT_FILE.rows - IMPORT_FILE.dupes} added, ${IMPORT_FILE.dupes} duplicates skipped`,
                )
              }
              className="min-h-10 cursor-pointer rounded-[10px] border-0 bg-rail px-4 text-[13px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
            >
              Import {IMPORT_FILE.rows - IMPORT_FILE.dupes} leads
            </button>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <h2 className="m-0 px-5 pt-5 text-[15px] font-bold">History</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-well text-left text-ink-mute">
                <th scope="col" className="px-5 py-2.5 font-medium">When</th>
                <th scope="col" className="px-3 py-2.5 font-medium">What</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Details</th>
                <th scope="col" className="px-3 py-2.5 font-medium">By</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-t border-line-soft">
                  <td className="px-5 py-3 whitespace-nowrap font-medium text-plum">{h.when}</td>
                  <td className="px-3 py-3 whitespace-nowrap font-semibold">{h.what}</td>
                  <td className="px-3 py-3 text-ink-soft">{h.detail}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{h.by}</td>
                  <td className="px-5 py-3">
                    <Pill tone={h.ok ? 'bg-[#DCF5E3] text-good' : 'bg-[#FDE8E6] text-[#9A2A1C]'}>
                      {h.ok ? 'Done' : 'Failed'}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {toast ? <Toast text={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  )
}
