// Formatting. Projection `date` is a DISPLAY month from the engine ("Feb 2027"): it is shown as text and
// never parsed (new Date("Feb 2027") is Invalid Date in Safari). Only the ISO fields (plan start, step
// date, ladder applyFrom) go through Date, always in UTC so a midnight date cannot slip a day.
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

const isoDate = (iso: string): Date | null => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "Mon 9 Nov" from an ISO date-time. */
export const dayLabel = (iso: string) => {
  const d = isoDate(iso)
  return d ? dayFmt.format(d) : iso
}

/** "Jan 2027" from an ISO date-time. */
export const monthLabel = (iso: string) => {
  const d = isoDate(iso)
  return d ? monthFmt.format(d) : iso
}

/** Week number of `iso` in a plan that starts on `startIso` (week 1 = the first 7 days). */
export const weekOf = (iso: string, startIso: string) => {
  const a = isoDate(iso)
  const b = isoDate(startIso)
  if (!a || !b) return null
  return Math.floor((a.getTime() - b.getTime()) / (7 * 24 * 3600 * 1000)) + 1
}

/** Short month name from a display month ("Feb 2027" -> "Feb"). Text only. */
export const shortMonth = (display: string) => display.split(' ')[0] ?? display

const gbpFmt = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 2 })
export const gbp = (n: number) => gbpFmt.format(n)

export const range = (r: { low: number; high: number }) => (r.low === r.high ? `${r.low}` : `${r.low} to ${r.high}`)
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')
