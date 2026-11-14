import { useState } from 'react'
import { Avatar, Card, PageHead, Pill, Segmented } from '../components/ui'
import type { Route } from '../components/Shell'
import { MEMBERS } from '../data/mock'
import { REPS } from '../data/types'
import { Collections, Connections, LeadAssignment, PipelineStages, SaveBar } from './SettingsTabs'

type Tab = 'teams' | 'people' | 'stages' | 'assignment' | 'collections' | 'connections'

/** One switchable action inside a page section. */
type Action = { id: string; label: string; hint: string; on: boolean }
/** A page in the sidebar, and what a team may do inside it. */
type Section = {
  id: string
  name: string
  open: boolean
  scope?: { label: string; hint: string; value: string; options: string[] }
  actions: Action[]
}

const SCOPE_OPTIONS = ['Only their own', 'Their team', 'Everyone']

const DEFAULT_SECTIONS: Section[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    open: true,
    scope: {
      label: 'Numbers they see',
      hint: 'Their own work, their team, or the whole business',
      value: 'Only their own',
      options: SCOPE_OPTIONS,
    },
    actions: [
      { id: 'spend', label: 'See ad spend and cost per lead', hint: 'Money numbers from Meta', on: false },
    ],
  },
  {
    id: 'leads',
    name: 'Leads',
    open: true,
    scope: {
      label: 'Which leads they see',
      hint: 'Own = only leads assigned to them',
      value: 'Only their own',
      options: SCOPE_OPTIONS,
    },
    actions: [
      { id: 'add', label: 'Add leads by hand', hint: 'Walk-ins, calls, referrals', on: true },
      { id: 'edit', label: 'Edit lead details', hint: 'Name, phone, email, notes', on: true },
      { id: 'delete', label: 'Delete leads', hint: 'Deleted leads stay in the Google Sheet backup', on: false },
      { id: 'assign', label: 'Assign or reassign leads', hint: 'Move leads between salespeople', on: false },
      { id: 'stage', label: 'Change stage', hint: 'Move leads through the pipeline', on: true },
      { id: 'purchase', label: 'Record purchases', hint: 'Move a lead to Purchased and enter what they bought', on: true },
      { id: 'phone', label: 'See full phone numbers', hint: 'Off shows numbers as +91 98250 •••14', on: true },
      { id: 'import', label: 'Import leads', hint: 'Upload Excel or CSV files', on: false },
      { id: 'export', label: 'Export leads', hint: 'Download leads they can see', on: false },
    ],
  },
  {
    id: 'calendar',
    name: 'Calendar',
    open: true,
    scope: {
      label: 'Whose calendar items they see',
      hint: 'Visits, calls, tasks and future contacts',
      value: 'Only their own',
      options: SCOPE_OPTIONS,
    },
    actions: [
      { id: 'add', label: 'Add items to the calendar', hint: 'Visits and reminders', on: true },
      { id: 'others', label: "Move or edit other people's items", hint: "Reschedule a teammate's visit", on: false },
    ],
  },
  { id: 'campaigns', name: 'Campaigns', open: false, actions: [] },
  {
    id: 'tasks',
    name: 'Tasks',
    open: true,
    scope: {
      label: 'Which tasks they see',
      hint: "Own, team or everyone's",
      value: 'Only their own',
      options: SCOPE_OPTIONS,
    },
    actions: [
      { id: 'own', label: 'Create tasks for themselves', hint: 'Personal reminders', on: true },
      { id: 'assign', label: 'Assign tasks to others', hint: 'Only to people below them', on: false },
      { id: 'edit', label: 'Edit or reschedule tasks', hint: 'Change due time or details', on: true },
      { id: 'delete', label: 'Delete tasks', hint: 'Remove a task completely', on: false },
      { id: 'rules', label: 'Change automatic task rules', hint: 'The rules that create tasks on their own', on: false },
    ],
  },
  { id: 'sync', name: 'Sync Data', open: false, actions: [] },
  { id: 'settings', name: 'Settings', open: false, actions: [] },
]

const ROLE_PILL: Record<string, string> = {
  Owner: 'bg-[#F3E8FF] text-[#6B21A8]',
  Manager: 'bg-[#E6F3FA] text-[#0B5A80]',
  Salesperson: 'bg-[#DDF3F1] text-[#0F5F58]',
}

/** Team cards on the left of the Teams & access tab. */
const TEAM_GROUPS = [
  { id: 'owners', name: 'Owners', blurb: 'Full access to everything', people: MEMBERS.filter((m) => m.role === 'Owner').map((m) => m.name) },
  { id: 'managers', name: 'Managers', blurb: 'Run the sales team, assign leads and tasks', people: MEMBERS.filter((m) => m.role === 'Manager').map((m) => m.name) },
  { id: 'sales', name: 'Sales team', blurb: 'Work their own leads, calls and visits', people: MEMBERS.filter((m) => m.role === 'Salesperson').map((m) => m.name) },
  { id: 'agency', name: 'Marketing agency', blurb: 'Sees campaign results only, no customer data', people: ['Riya Desai'] },
]

function Check({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px]">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-[var(--color-plum,#7A1F3D)]"
      />
      <span className={on ? 'font-medium text-good' : 'text-ink-mute'}>{label}</span>
    </label>
  )
}

function SectionCard({
  section,
  onChange,
}: {
  section: Section
  onChange: (next: Section) => void
}) {
  const allowed = section.actions.filter((a) => a.on).length
  const summary = !section.open
    ? 'No access'
    : `${section.scope ? `${section.scope.value} · ` : ''}${allowed} of ${section.actions.length} actions allowed`

  return (
    <Card className="p-0">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <h3 className="m-0 text-[15px] font-semibold">{section.name}</h3>
          <p className="mt-0.5 mb-0 text-[13px] text-ink-mute">{summary}</p>
        </div>
        <Check
          on={section.open}
          onChange={(v) => onChange({ ...section, open: v })}
          label={`Can open ${section.name}`}
        />
      </div>

      {!section.open ? (
        <p className="m-0 border-t border-line-soft px-5 py-3.5 text-[13px] text-ink-mute">
          Hidden from this team. It will not appear in their side bar.
        </p>
      ) : (
        <>
          {section.scope ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5">
              <div className="min-w-0">
                <div className="text-[13px] font-medium">{section.scope.label}</div>
                <div className="text-xs text-ink-mute">{section.scope.hint}</div>
              </div>
              <select
                aria-label={section.scope.label}
                value={section.scope.value}
                onChange={(e) =>
                  onChange({ ...section, scope: { ...section.scope!, value: e.target.value } })
                }
                className="min-h-10 w-[172px] rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink"
              >
                {section.scope.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ) : null}

          {section.actions.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium">{a.label}</div>
                <div className="text-xs text-ink-mute">{a.hint}</div>
              </div>
              <Check
                on={a.on}
                onChange={(v) =>
                  onChange({
                    ...section,
                    actions: section.actions.map((x) => (x.id === a.id ? { ...x, on: v } : x)),
                  })
                }
                label={a.on ? 'Allowed' : 'Not allowed'}
              />
            </div>
          ))}
        </>
      )}
    </Card>
  )
}

export default function Settings({ go }: { go: (r: Route) => void }) {
  const [tab, setTab] = useState<Tab>('teams')
  const [group, setGroup] = useState(TEAM_GROUPS[2].id)
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [reportsTo, setReportsTo] = useState('Managers')
  const [addRole, setAddRole] = useState('Owner')
  const active = TEAM_GROUPS.find((g) => g.id === group) ?? TEAM_GROUPS[0]

  return (
    <>
      <PageHead
        title="Settings"
        sub="Only owners can open Settings unless they give access to someone else"
      />

      <Segmented
        label="Settings section"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'teams', label: 'Teams & access' },
          { id: 'people', label: 'People' },
          { id: 'stages', label: 'Pipeline stages' },
          { id: 'assignment', label: 'Lead assignment' },
          { id: 'collections', label: 'Collections' },
          { id: 'connections', label: 'Connections' },
        ]}
      />

      {tab === 'teams' ? (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-2.5">
            {TEAM_GROUPS.map((g) => {
              const on = g.id === group
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroup(g.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    on
                      ? 'border-[var(--color-plum,#7A1F3D)] bg-surface shadow-sm'
                      : 'border-line bg-surface hover:border-[#DCD5D1]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-semibold">{g.name}</span>
                    <span className="shrink-0 text-xs text-ink-mute">
                      {g.people.length} {g.people.length === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                  <span className="mt-0.5 block text-xs text-ink-mute">{g.blurb}</span>
                </button>
              )
            })}
            <button
              type="button"
              className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-ink-mute hover:border-[#DCD5D1]"
            >
              + Create a team
            </button>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <Card className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-base font-semibold">{active.name}</h2>
                  <p className="mt-0.5 mb-0 text-[13px] text-ink-mute">{active.blurb}</p>
                </div>
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-mute">
                  Reports to
                  <select
                    value={reportsTo}
                    onChange={(e) => setReportsTo(e.target.value)}
                    className="min-h-10 w-[172px] rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink"
                  >
                    {['Owners', 'Managers', 'Nobody'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {active.people.map((p) => {
                  const [initials, bg] = REPS[p] ?? ['?', '#8A817C']
                  return (
                    <span
                      key={p}
                      className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2 text-[13px]"
                    >
                      <Avatar initials={initials} bg={bg} />
                      {p}
                      <span className="ml-1 cursor-pointer text-ink-mute" aria-hidden>
                        ×
                      </span>
                    </span>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-line-soft pt-4">
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-mute">
                  Add a person to {active.name}
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="min-h-10 w-[220px] rounded-[10px] border border-[#DCD5D1] bg-surface px-2.5 text-[13px] text-ink"
                  >
                    {MEMBERS.map((m) => (
                      <option key={m.name}>{m.name}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="min-h-10 rounded-[10px] bg-[#2B2724] px-4 text-[13px] font-medium text-white"
                >
                  Add to team
                </button>
                <p className="m-0 max-w-[280px] text-xs text-ink-mute">
                  They get exactly this team's access below. One person needs an exception? Change it
                  for them in People.
                </p>
              </div>
            </Card>

            {sections.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                onChange={(next) => setSections((all) => all.map((x) => (x.id === s.id ? next : x)))}
              />
            ))}

            <SaveBar
              text={`Changes apply to everyone in ${active.name} right away after saving`}
              label="Save access"
              done={`Access saved for ${active.name}.`}
            />
          </div>
        </div>
      ) : null}

      {tab === 'people' ? (
        <Card className="p-0">
          <div className="overflow-x-auto">
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

      {tab === 'stages' ? <PipelineStages /> : null}
      {tab === 'assignment' ? <LeadAssignment /> : null}
      {tab === 'collections' ? <Collections /> : null}
      {tab === 'connections' ? <Connections onOpenSync={() => go('sync')} /> : null}
    </>
  )
}
