import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART, tooltipProps } from './ui'
import { fmt } from '../lib/format'

/** Daily spend (left axis) vs leads (right axis). */
export function TrendChart({ series, height = 288 }: { series: { date: string; spend: number; leads: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={series} margin={{ left: 0, right: 0, top: 5 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmt.date} minTickGap={24} />
          <YAxis yAxisId="s" tickFormatter={fmt.currencyCompact} width={60} />
          <YAxis yAxisId="l" orientation="right" allowDecimals={false} width={30} />
          <Tooltip {...tooltipProps} labelFormatter={l => fmt.date(String(l))}
            formatter={(v, name) => (name === 'Spend' ? fmt.currency(Number(v)) : fmt.number(Number(v)))} />
          <Legend iconType="circle" iconSize={8} />
          <Line yAxisId="s" dataKey="spend" name="Spend" stroke={CHART.spend} strokeWidth={2} dot={false} />
          <Line yAxisId="l" dataKey="leads" name="Leads" stroke={CHART.leads} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
