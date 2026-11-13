import { useState } from 'react'
import { Card, CardHead, PageHead, Pill, Stat, Toast } from '../components/ui'
import { IconSync } from '../components/icons'
import { SYNC } from '../data/mock'
import { num } from '../lib/format'

export default function SyncData() {
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [history, setHistory] = useState(SYNC.history)
  const [lastSync, setLastSync] = useState(SYNC.lastSync)

  const runSync = () => {
    setSyncing(true)
    // Sample data: the pull is simulated so the screen can be driven without a Meta account.
    window.setTimeout(() => {
      setSyncing(false)
      setLastSync('Just now')
      setHistory((h) => [
        { at: 'Just now', pulled: 2, status: 'ok' as const, note: '2 new leads · 9 campaigns updated' },
        ...h,
      ])
      setToast('Sync finished. 2 new leads came in.')
    }, 900)
  }

  const unmapped = SYNC.forms.filter((f) => !f.mapped)

  return (
    <>
      <PageHead title="Sync Data" sub={`Meta ad account ${SYNC.account} · sample data`}>
        <button
          type="button"
          onClick={runSync}
          disabled={syncing}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border-0 bg-rail px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        >
          <IconSync />
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </PageHead>

      {unmapped.length ? (
        <section
          aria-label="Needs attention"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[14px] border border-[#F3D3CD] bg-[#FFF4F2] px-[18px] py-3.5 text-sm"
        >
          <span className="font-semibold text-[#8A1F14]">Needs attention</span>
          <span className="text-[#5C1610]">
            {unmapped.length} lead form is not mapped to a collection yet — its leads arrive without
            one.
          </span>
        </section>
      ) : null}

      <section
        aria-label="Sync status"
        className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"
      >
        <Stat label="Last sync" value={lastSync} note="runs every hour" />
        <Stat label="Next sync" value={SYNC.nextSync} note="automatic" />
        <Stat label="Lead forms connected" value={SYNC.forms.length} note={`${unmapped.length} not mapped`} noteTone={unmapped.length ? 'bad' : 'good'} />
        <Stat
          label="Leads pulled this month"
          value={num(SYNC.forms.reduce((a, f) => a + f.leads, 0))}
          note="across all forms"
        />
      </section>

      <Card className="flex flex-col gap-3">
        <CardHead title="Connected pages" aside={`${SYNC.pages.length} pages`} />
        <div className="flex flex-wrap gap-2">
          {SYNC.pages.map((p) => (
            <span
              key={p}
              className="rounded-[10px] border border-[#EEE9E6] bg-[#FAF8F7] px-3 py-2 text-[13px] font-medium"
            >
              {p}
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-0">
        <div className="px-5 pt-5">
          <CardHead title="Lead forms" aside="each form feeds one collection" />
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                <th scope="col" className="px-5 py-2.5 font-medium">Form</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Page</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Leads this month</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Mapped</th>
              </tr>
            </thead>
            <tbody>
              {SYNC.forms.map((f) => (
                <tr key={f.name} className="border-t border-line-soft">
                  <td className="px-5 py-3 font-semibold">{f.name}</td>
                  <td className="px-3 py-3 text-ink-soft">{f.page}</td>
                  <td className="px-3 py-3 text-right font-semibold">{num(f.leads)}</td>
                  <td className="px-5 py-3 text-right">
                    <Pill
                      tone={f.mapped ? 'bg-[#DCF5E3] text-good' : 'bg-[#FDE8E6] text-[#9A2A1C]'}
                    >
                      {f.mapped ? 'Mapped' : 'Not mapped'}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardHead title="Sync history" aside="most recent first" />
        {history.map((h, i) => (
          <div key={i} className="flex items-center gap-3.5 border-t border-line-soft py-3">
            <span className="w-[150px] shrink-0 text-[13px] font-semibold">{h.at}</span>
            <span className="min-w-0 flex-1 text-[13px] text-ink-soft">{h.note}</span>
            <Pill tone={h.status === 'ok' ? 'bg-[#E7F5EC] text-[#1E6B3A]' : 'bg-[#FEF3C7] text-[#7A4A06]'}>
              {h.status === 'ok' ? 'OK' : 'Check'}
            </Pill>
          </div>
        ))}
      </Card>

      {toast ? <Toast text={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  )
}
