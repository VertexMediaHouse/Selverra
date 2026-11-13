export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
export const num = (n: number) => Math.round(n).toLocaleString('en-IN')
export const pct = (part: number, whole: number) => ((part / whole) * 100).toFixed(2) + '%'

/** Bar width as a percentage string, with a visible floor so non-zero values still read. */
export const barWidth = (value: number, max: number) =>
  (value === 0 ? 0 : Math.max(3, Math.round((value / max) * 100))) + '%'
