/**
 * Parses a date string in multiple formats:
 *   ISO:        2024-01-15  /  2024-1-5
 *   Norwegian:  15.01.2024  /  15.01.24  /  15.1.24
 *   US:         1/15/2024   /  1/15/24
 * Returns "YYYY-MM-DD" or null if unparseable.
 */
export function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // ISO: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return fmt(parseInt(y), parseInt(m), parseInt(d))
  }

  // Norwegian: DD.MM.YYYY or DD.MM.YY
  const nor = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
  if (nor) {
    const [, d, m, yRaw] = nor
    const y = expandYear(parseInt(yRaw))
    return fmt(y, parseInt(m), parseInt(d))
  }

  // US: M/D/YYYY or M/D/YY
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (us) {
    const [, m, d, yRaw] = us
    const y = expandYear(parseInt(yRaw))
    return fmt(y, parseInt(m), parseInt(d))
  }

  return null
}

function expandYear(y: number): number {
  if (y >= 100) return y
  return y >= 50 ? 1900 + y : 2000 + y
}

function fmt(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/**
 * Parses a value string with flexible formatting:
 *   - Unicode minus (−, –) treated as negative
 *   - Leading minus sign supported
 *   - Currency symbols (kr, NOK, $, €) stripped
 *   - Norwegian comma-as-decimal:  14 974,14  →  14974.14
 *   - Space or period as thousands separator
 * Returns a number or null if unparseable.
 */
export function parseValue(raw: string): number | null {
  let s = raw.trim()
  if (!s) return null

  // Normalise unicode minus signs to ASCII minus
  s = s.replace(/[−–]/g, "-")

  // Capture leading/trailing minus
  const negative = s.startsWith("-")
  s = s.replace(/-/g, "").trim()

  // Strip currency symbols and whitespace
  s = s.replace(/kr|NOK|\$|€/gi, "").trim()

  // Determine decimal separator:
  // If string contains comma AND the comma is the last separator with exactly
  // 1-2 digits after it → Norwegian decimal comma.
  // Otherwise treat comma as thousands separator.
  if (/,\d{1,2}$/.test(s)) {
    // Norwegian: 14 974,14 or 14.974,14
    s = s.replace(/[\s.]/g, "").replace(",", ".")
  } else {
    // Remove commas/spaces/periods used as thousands separators
    s = s.replace(/[,\s]/g, "")
    // If multiple dots remain (e.g. 14.974.000) strip all but last
    const dotCount = (s.match(/\./g) ?? []).length
    if (dotCount > 1) {
      s = s.replace(/\./g, "")
    }
  }

  const n = parseFloat(s)
  if (isNaN(n)) return null
  return negative ? -n : n
}
