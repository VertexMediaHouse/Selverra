import { useMemo, useState } from 'react'
import { Lock, Package, Search, Share2, Users } from 'lucide-react'
import { Avatar, Card, CollectionIcon, DeliveryBadge, EmptyState, PageHeader } from '../components/ui'
import { ShareDialog } from '../components/ShareDialog'
import { useStore } from '../store'

/**
 * Admin access control. Owner shares a campaign here; the share cascades to every lead under that
 * campaign (see canAccess `parent`). Owner-only — managers share their own leads from the lead panel.
 */
export default function Access() {
  const { me, scoped, categories, categoryById, shares, userById, leadById } = useStore()
  const [query, setQuery] = useState('')
  const [shareId, setShareId] = useState<string>() // campaign being shared
  const [productId, setProductId] = useState<string>() // product category being granted

  const leadsPerCampaign = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of leadById.values()) if (l.campaignId) m.set(l.campaignId, (m.get(l.campaignId) ?? 0) + 1)
    return m
  }, [leadById])

  if (me?.role !== 'Owner') {
    return <Card><EmptyState title="Owner only" hint="Only the account owner manages campaign access. Share individual leads from the enquiry panel." /></Card>
  }

  const q = query.trim().toLowerCase()
  const campaigns = scoped.campaigns.filter(c => !q || c.name.toLowerCase().includes(q))

  return (
    <>
      <PageHeader title="Access" subtitle="Grant a product category to decide what a manager can work in. Share a campaign and every lead under it cascades automatically." />

      {/* Product access: the top-level gate. No grant here means the user sees nothing at all. */}
      <Card title="Product access" className="mb-6"
        action={<span className="text-xs text-slate-500">Who may work in each collection</span>}>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {categories.map(c => {
            const grants = shares.filter(s => s.module === 'categories' && s.recordId === c.id)
            const granted = grants.map(g => userById.get(g.sharedWith)).filter(Boolean)
            return (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <CollectionIcon id={c.id} size={18} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {granted.length === 0
                      ? 'Owner only — nobody else can see this collection'
                      : `${granted.length} ${granted.length === 1 ? 'person' : 'people'} with access`}
                  </p>
                </div>
                <span className="hidden -space-x-1.5 sm:flex">
                  {granted.slice(0, 5).map(u => <Avatar key={u!.id} name={u!.name} size="xs" />)}
                </span>
                <button className="btn btn-sm shrink-0" onClick={() => setProductId(c.id)}>
                  <Package size={14} /> Grant
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          A grant covers that collection's enquiries, campaigns and ad spend. Staff do not inherit
          their manager's products: grant each person the collections they work.
        </p>
      </Card>

      <Card title="Campaign access">
        <label className="relative mb-4 block">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input className="input w-full pl-9" placeholder="Search campaigns" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search campaigns" />
        </label>

        {campaigns.length === 0 ? <EmptyState title="No campaigns match" /> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {campaigns.map(c => {
              const cat = categoryById.get(c.categoryId)
              const grants = shares.filter(s => s.module === 'campaigns' && s.recordId === c.id)
              return (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <CollectionIcon id={cat?.id} size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{c.name}</p>
                      <DeliveryBadge status={c.status} />
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {cat?.name} · {leadsPerCampaign.get(c.id) ?? 0} leads cascade
                      {grants.length > 0 && <> · shared with {grants.map(s => userById.get(s.sharedWith)?.name ?? s.sharedWith).join(', ')}</>}
                    </p>
                  </div>
                  <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
                    <Users size={13} /> {grants.length}
                  </span>
                  <button className="btn btn-sm shrink-0" onClick={() => setShareId(c.id)}>
                    <Share2 size={14} /> Share
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Lock size={12} /> Access is enforced in the data layer, not just hidden in the UI.
      </p>

      {shareId && <ShareDialog open onClose={() => setShareId(undefined)} module="campaigns" recordId={shareId} owner="" />}
      {productId && <ShareDialog open onClose={() => setProductId(undefined)} module="categories" recordId={productId} owner=""
        title={`Who can work in ${categoryById.get(productId)?.name ?? 'this collection'}`} />}
    </>
  )
}
