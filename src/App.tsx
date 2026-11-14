import { useEffect, useState } from 'react'
import { Shell, type Route } from './components/Shell'
import type { Role } from './data/types'
import Calendar from './pages/Calendar'
import CampaignDetail from './pages/CampaignDetail'
import Campaigns from './pages/Campaigns'
import Dashboard from './pages/Dashboard'
import LeadDetail from './pages/LeadDetail'
import { LeadsKanban, LeadsList } from './pages/Leads'
import ManagerDashboard from './pages/ManagerDashboard'
import SalesDashboard from './pages/SalesDashboard'
import Settings from './pages/Settings'
import SyncData from './pages/SyncData'
import Tasks from './pages/Tasks'

const ROUTES: Route[] = [
  'dashboard',
  'leads',
  'kanban',
  'lead',
  'campaigns',
  'campaign',
  'tasks',
  'calendar',
  'sync',
  'settings',
]

const routeFromHash = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(r) ? r : 'dashboard'
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [role, setRole] = useState<Role>('owner')

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route) => {
    window.location.hash = `#/${r}`
    setRoute(r)
    window.scrollTo({ top: 0 })
  }

  // A salesperson has no campaigns or sync screen; a manager has no sync screen.
  const allowed =
    role === 'sales'
      ? route !== 'campaigns' && route !== 'campaign' && route !== 'sync'
      : role === 'manager'
        ? route !== 'sync'
        : true
  const current = allowed ? route : 'dashboard'

  const page = () => {
    switch (current) {
      case 'leads':
        return <LeadsList go={go} />
      case 'kanban':
        return <LeadsKanban go={go} />
      case 'lead':
        return <LeadDetail go={go} />
      case 'campaigns':
        return <Campaigns go={go} />
      case 'campaign':
        return <CampaignDetail go={go} />
      case 'tasks':
        return <Tasks go={go} />
      case 'calendar':
        return <Calendar go={go} />
      case 'sync':
        return <SyncData />
      case 'settings':
        return <Settings go={go} />
      default:
        if (role === 'sales') return <SalesDashboard role={role} setRole={setRole} go={go} />
        if (role === 'manager') return <ManagerDashboard role={role} setRole={setRole} go={go} />
        return <Dashboard role={role} setRole={setRole} go={go} />
    }
  }

  return (
    <Shell role={role} route={current} go={go}>
      {page()}
    </Shell>
  )
}
