const EURO = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const PERCENT = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const DATE = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
const SHORT_DATE = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })

export const euro = (cents: number): string => EURO.format(cents / 100)
export const percent = (ratio: number): string => PERCENT.format(ratio)
export const size = (grams: number): string =>
  grams >= 1000 ? `${(grams / 1000).toLocaleString('de-DE', { maximumFractionDigits: 3 })} kg` : `${grams} g`

const parseDay = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`)
export const day = (isoDate: string): string => DATE.format(parseDay(isoDate))
export const shortDay = (isoDate: string): string => SHORT_DATE.format(parseDay(isoDate))
export { parseDay }
