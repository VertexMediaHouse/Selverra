// The 3-level access model: Owner, Manager, Sales. One table drives the landing page, the
// sidebar groups and the icon rail. This is UI shaping only — the real gate is the data layer
// (see data/api.ts `access`), because hiding a link hides nothing.
import type { User } from './data/types'

export type Level = 'Owner' | 'Manager' | 'Sales'

/** The signed-in user's role decides the level; Marketing rides along with Sales. */
export const levelOf = (role: User['role'] | undefined): Level =>
  role === 'Owner' ? 'Owner' : role === 'Manager' ? 'Manager' : 'Sales'

export const LEVELS: Record<Level, { home: string; groups: { title: string; paths: string[] }[] }> = {
  // The owner has no allow-list in practice: every page, every module, A to Z. Grouped only
  // so the sidebar reads sensibly; `pagesFor('Owner')` is the full set either way.
  Owner: {
    home: 'owner',
    groups: [
      { title: 'Business', paths: ['owner', 'overview', 'insights'] },
      { title: 'Enquiries', paths: ['leads', 'today', 'calendar', 'mywork'] },
      { title: 'Ads', paths: ['campaigns', 'creatives', 'budgets'] },
      { title: 'Team', paths: ['team'] },
      { title: 'Admin', paths: ['access'] },
    ],
  },
  Manager: {
    home: 'team',
    groups: [
      { title: 'My team', paths: ['team', 'overview'] },
      { title: 'Enquiries', paths: ['leads', 'today', 'calendar', 'mywork'] },
      { title: 'Ads', paths: ['insights'] },
    ],
  },
  // 'mywork' (MyDashboard), not 'overview': the business overview is ad spend, ROAS and
  // budget pacing. A sales person gets the same shape of dashboard built from their own
  // leads only — volume, speed and bills, no cost figures.
  Sales: {
    home: 'today',
    groups: [
      { title: 'My work', paths: ['today', 'leads', 'calendar'] },
      { title: 'Me', paths: ['mywork'] },
    ],
  },
}

/** Levels that may see money: ad spend, ROAS, budgets, other people's sales totals. */
export const seesSpend = (level: Level) => level !== 'Sales'

/** Every path the app can route to. The owner's allow-list is this, always. */
export const ALL_PAGES = [
  'owner', 'team', 'mywork', 'overview', 'today', 'leads', 'calendar',
  'campaigns', 'creatives', 'budgets', 'insights', 'access', 'settings',
] as const

/**
 * Every page a level may open: its own groups, plus settings. Also the route allow-list.
 * The owner is not gated by their groups — they get every page, so adding a new page can
 * never silently withhold it from them.
 */
export const pagesFor = (level: Level): Set<string> =>
  level === 'Owner'
    ? new Set<string>(ALL_PAGES)
    : new Set([...LEVELS[level].groups.flatMap(g => g.paths), 'settings'])
