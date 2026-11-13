import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cx } from './ui'

export interface Column<T> {
  key: string
  label: ReactNode
  /** Sort value; omit to make the column unsortable. */
  value?: (row: T) => string | number | null
  render?: (row: T) => ReactNode
  align?: 'right'
  className?: string
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  empty?: ReactNode
  selection?: { selected: Set<string>; onChange: (next: Set<string>) => void }
  pageSize?: number
  rowClassName?: (row: T) => string | false
}

export function DataTable<T>({ rows, columns, rowKey, onRowClick, initialSort, empty, selection, pageSize, rowClassName }: Props<T>) {
  const [sort, setSort] = useState(initialSort)
  const [limit, setLimit] = useState(pageSize ?? Infinity)
  useEffect(() => setLimit(pageSize ?? Infinity), [rows.length, pageSize])

  const sorted = useMemo(() => {
    const col = columns.find(c => c.key === sort?.key)
    if (!col?.value || !sort) return rows
    const get = col.value
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b)
      if (x == null) return 1 // nulls always last
      if (y == null) return -1
      return (typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number)) * dir
    })
  }, [rows, columns, sort])

  if (rows.length === 0) return <>{empty}</>
  const shown = sorted.slice(0, limit)
  const allIds = rows.map(rowKey)
  const allOn = selection && allIds.every(id => selection.selected.has(id))
  const toggle = (id: string) => {
    if (!selection) return
    const next = new Set(selection.selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selection.onChange(next)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-[var(--color-border-subtle)] bg-black/[0.03]">
            <tr>
              {selection && (
                <th className="w-10 pl-4">
                  <input type="checkbox" aria-label="Select all" className="size-4 accent-[var(--color-accent-mint)]" checked={!!allOn}
                    ref={el => { if (el) el.indeterminate = !allOn && selection.selected.size > 0 }}
                    onChange={() => selection.onChange(allOn ? new Set() : new Set(allIds))} />
                </th>
              )}
              {columns.map(c => {
                const active = sort?.key === c.key
                return (
                  <th key={c.key} className={cx('th', c.align === 'right' && 'text-right', c.className)}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.value ? (
                      <button className={cx('inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-[var(--color-text-primary)]', active && 'text-[var(--color-text-primary)]')}
                        onClick={() => setSort({ key: c.key, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' })}>
                        {c.label}
                        {active && (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                      </button>
                    ) : c.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {shown.map(r => {
              const id = rowKey(r)
              const on = selection?.selected.has(id)
              return (
                <tr key={id} onClick={onRowClick && (() => onRowClick(r))}
                  onKeyDown={onRowClick && (e => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(r))} tabIndex={onRowClick ? 0 : undefined}
                  className={cx('transition-colors', onRowClick && 'cursor-pointer hover:bg-black/[0.035] focus-visible:bg-black/[0.035] focus-visible:outline-none',
                    on && 'bg-[var(--color-accent-mint-bg)]', rowClassName?.(r))}>
                  {selection && (
                    <td className="w-10 pl-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" aria-label="Select row" className="size-4 accent-[var(--color-accent-mint)]" checked={!!on} onChange={() => toggle(id)} />
                    </td>
                  )}
                  {columns.map(c => (
                    <td key={c.key} className={cx('td', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                      {c.render ? c.render(r) : c.value?.(r)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > shown.length && (
        <div className="border-t border-[var(--color-border-subtle)] p-3 text-center">
          <button className="btn btn-sm" onClick={() => setLimit(l => l + (pageSize ?? 50))}>
            Show {Math.min(pageSize ?? 50, sorted.length - shown.length)} more · {shown.length} of {sorted.length}
          </button>
        </div>
      )}
    </>
  )
}
