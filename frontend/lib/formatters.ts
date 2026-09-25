export function formatNOK(value: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    year: "numeric",
    month: "short",
  })
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatGrowthRate(rate: number): string {
  const sign = rate >= 0 ? "+" : ""
  return `${sign}${(rate * 100).toFixed(1)}% / yr`
}
