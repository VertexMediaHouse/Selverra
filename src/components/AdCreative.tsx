import { Globe, Layers, MoreHorizontal, Play, ThumbsUp } from 'lucide-react'
import type { Ad, Category } from '../data/types'
import { cx } from './ui'

/** Generated stand-in for the ad's image/video. Swap for the creative's thumbnail_url from the Meta API. */
export function AdThumb({ ad, category, brand, className, size = 'md' }: { ad: Ad; category?: Category; brand?: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const bg = `linear-gradient(135deg, hsl(${ad.hue} 42% 62%), ${category?.color ?? '#c07a55'})`
  return (
    <div className={cx('relative overflow-hidden text-white', className)} style={{ background: bg }}>
      <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/15" />
      <div className="absolute -bottom-10 -left-6 size-28 rounded-full bg-black/10" />
      <div className={cx('relative flex h-full flex-col justify-end', size === 'sm' ? 'p-2' : 'p-4')}>
        {size !== 'sm' && <p className="mb-1 text-[10px] font-semibold tracking-widest uppercase opacity-80">{brand}</p>}
        <p className={cx('leading-tight font-bold drop-shadow-sm', size === 'sm' ? 'line-clamp-3 text-[9px]' : size === 'lg' ? 'text-2xl' : 'line-clamp-3 text-base')}>{ad.headline}</p>
      </div>
      {(ad.format === 'Video' || ad.format === 'Reel') && (
        <span className={cx('absolute flex items-center justify-center rounded-full bg-black/35 backdrop-blur', size === 'sm' ? 'top-1 left-1 size-4' : 'top-3 left-3 size-8')}>
          <Play size={size === 'sm' ? 8 : 14} fill="white" />
        </span>
      )}
      {ad.format === 'Carousel' && size !== 'sm' && (
        <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10px] backdrop-blur"><Layers size={11} /> 1/4</span>
      )}
    </div>
  )
}

/** Approximation of a Facebook feed placement. */
export function AdPreview({ ad, category, brand }: { ad: Ad; category?: Category; brand?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700">
      <div className="flex items-center gap-2 p-3">
        <span className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: category?.color }}>{brand?.[0]}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold">{brand}</p>
          <p className="flex items-center gap-1 text-xs text-slate-500">Sponsored · <Globe size={11} /></p>
        </div>
        <MoreHorizontal size={18} className="text-slate-500" />
      </div>
      <p className="px-3 pb-3 text-sm">{ad.primaryText}</p>
      <AdThumb ad={ad} category={category} brand={brand} size="lg" className={ad.format === 'Reel' ? 'aspect-[4/5]' : 'aspect-square'} />
      <div className="flex items-center gap-3 bg-slate-100 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-slate-500 uppercase">{(brand ?? '').toLowerCase().replace(/[^a-z]/g, '')}.in</p>
          <p className="truncate text-sm font-semibold">{ad.headline}</p>
        </div>
        <span className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-semibold">{ad.cta}</span>
      </div>
      <div className="grid grid-cols-3 border-t border-slate-200 py-1.5 text-center text-xs font-medium text-slate-500"><span className="flex items-center justify-center gap-1"><ThumbsUp size={12} /> Like</span><span>Comment</span><span>Share</span></div>
    </div>
  )
}
