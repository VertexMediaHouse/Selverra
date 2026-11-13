import { useState } from 'react'
import { Avatar, Card, CardHead, PageHead, Pill, Segmented } from '../components/ui'
import { MEMBERS, PERMISSIONS, TEAMS } from '../data/mock'
import { REPS } from '../data/types'

type Tab = 'teams' | 'people' | 'access'

const ROLE_PILL: Record<string, string> = {
  Owner: 'bg-[#F3E8FF] text-[#6B21A8]',
  Manager: 'bg-[#E6F3FA] text-[#0B5A80]',
  Salesperson: 'bg-[#DDF3F1] text-[#0F5F58]',
}

const Tick = ({ on }: { on: boolean }) =>
  on ? (
    <span className="text-good" aria-label="yes">
      ✓
    </span>
  ) : (
    <span className="text-ink-mute" aria-label="no">
      —
    </span>
  )

export default function Settings() {
  const [tab, setTab] = useState<Tab>('teams')

  return (
    <>
      <PageHead title="Settings" sub="Teams, people and what each role can see · sample data">
        <Segmented
          label="Settings section"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'teams', label: 'Teams' },
            { id: 'people', label: `People (${MEMBERS.length})` },
            { id: 'access', label: 'Access' },
          ]}
        />
      </PageHead>

      {tab === 'teams' ? (
        <>
          {TEAMS.map((t) => (
            <Card key={t.name} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="m-0 text-base font-semibold">{t.name}</h2>
                  <span className="text-[13px] text-ink-mute">Manager · {t.manager}</span>
                </div>
                <span className="rounded-[10px] border border-[#EEE9E6] bg-[#FAF8F7] px-3 py-2 text-[13px]">
                  <strong>{t.members.length}</strong>{' '}
                  {t.members.length === 1 ? 'salesperson' : 'salespeople'}
                </span>
              </div>
              <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
                <span className="text-xs font-medium text-ink-mute">Salespeople</span>
                <div className="flex flex-wrap gap-2">
                  {t.members.map((m) => {
                    const [initials, bg] = REPS[m] ?? ['?', '#8A817C']
                    return (
                      <span
                        key={m}
                        className="flex items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-[13px]"
                      >
                        <Avatar initials={initials} bg={bg} />
                        {m}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
                <span className="text-xs font-medium text-ink-mute">Collections this team sells</span>
                <div className="flex flex-wrap gap-2">
                  {t.collections.map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-[#F3F0EE] px-2 py-1 text-xs font-medium text-[#3F3A36]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </>
      ) : null}

      {tab === 'people' ? (
        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHead title="People" aside={`${MEMBERS.filter((m) => m.active).length} active`} />
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                  <th scope="col" className="px-5 py-2.5 font-medium">Name</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Role</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Team</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Email</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map((m) => {
                  const [initials, bg] = REPS[m.name] ?? ['?', '#8A817C']
                  return (
                    <tr key={m.name} className="border-t border-line-soft">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar initials={initials} bg={bg} />
                          <span className="font-semibold">{m.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={ROLE_PILL[m.role]}>{m.role}</Pill>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{m.team}</td>
                      <td className="px-3 py-3 text-ink-soft">{m.email}</td>
                      <td className="px-5 py-3 text-right">
                        <Pill
                          tone={m.active ? 'bg-[#E7F5EC] text-[#1E6B3A]' : 'bg-[#EFEEED] text-[#52504D]'}
                        >
                          {m.active ? 'Active' : 'Switched off'}
                        </Pill>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'access' ? (
        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHead title="What each role can do" aside="owner can always do everything" />
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#FAF8F7] text-left text-ink-mute">
                  <th scope="col" className="px-5 py-2.5 font-medium">Can…</th>
                  <th scope="col" className="px-3 py-2.5 text-center font-medium">Owner</th>
                  <th scope="col" className="px-3 py-2.5 text-center font-medium">Manager</th>
                  <th scope="col" className="px-5 py-2.5 text-center font-medium">Salesperson</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.what} className="border-t border-line-soft">
                    <td className="px-5 py-3">{p.what}</td>
                    <td className="px-3 py-3 text-center">
                      <Tick on={p.owner} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Tick on={p.manager} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Tick on={p.sales} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </>
  )
}
