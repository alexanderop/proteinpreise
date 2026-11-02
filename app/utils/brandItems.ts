export const ALL_BRANDS = 'all'

// Options for a brand filter: "Alle Marken" first, then every brand A–Z with its offer count.
export function brandItems(rows: readonly { brand: string }[]) {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.brand, (counts.get(r.brand) ?? 0) + 1)
  return [
    { label: 'Alle Marken', value: ALL_BRANDS, count: rows.length },
    ...[...counts]
      .toSorted(([a], [b]) => a.localeCompare(b, 'de'))
      .map(([brand, count]) => ({ label: brand, value: brand, count })),
  ]
}
