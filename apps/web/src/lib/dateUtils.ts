// Pure date-window helpers for client-side deadline filtering.
// All boundary math uses local calendar dates (getFullYear/getMonth/getDate).
// NEVER use .toISOString() for boundary evaluation.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DateFilterPreset = 'today' | 'this-week' | 'last-15'

export interface CustomDateFilter {
  type: 'custom'
  n: number
  direction: 'forward' | 'backward'
  offset: number
}

export type DateFilter = { type: DateFilterPreset } | CustomDateFilter | null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/**
 * Returns a local-calendar YYYY-MM-DD string from a Date object.
 * Uses getFullYear/getMonth/getDate — never toISOString — to avoid UTC drift.
 */
export function getLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Returns today's local-calendar YYYY-MM-DD string.
 * Recomputed per call — never cached — so the board can stay open across midnight.
 */
export function getTodayStr(): string {
  return getLocalDateStr(new Date())
}

/**
 * Adds (or subtracts) n days to a YYYY-MM-DD string and returns the result
 * as a YYYY-MM-DD string, using local-calendar arithmetic.
 *
 * Does NOT use Date.parse or ISO string construction — parses y/m/d manually
 * and constructs via `new Date(y, m-1, d+n)` so DST transitions are handled
 * by the JS engine's local-time logic.
 */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return getLocalDateStr(new Date(y, m - 1, d + n))
}

// ---------------------------------------------------------------------------
// Main predicate
// ---------------------------------------------------------------------------

/**
 * Returns true when the task's deadline falls within the active date filter window.
 *
 * Rules:
 *  - filter === null → true (no filtering; undated tasks show)
 *  - deadline is undefined, null, or produces NaN via new Date() → false when filter active
 *  - All boundaries are computed in local calendar time and compared as YYYY-MM-DD strings
 *    (lexicographic order == chronological order for fixed-width ISO dates)
 */
export function matchesDateFilter(
  deadline: string | Date | undefined | null,
  filter: DateFilter,
): boolean {
  // Short-circuit: no active filter → all tasks pass
  if (filter === null) return true

  // Guard: missing deadline
  if (deadline === undefined || deadline === null) return false

  // Normalize deadline to local YYYY-MM-DD
  const parsed = new Date(deadline as string | Date)
  if (isNaN(parsed.getTime())) return false
  const D = getLocalDateStr(parsed)

  // Compute today lazily per call
  const T = getTodayStr()

  let lo: string
  let hi: string

  if (filter.type === 'today') {
    lo = T
    hi = T
  } else if (filter.type === 'this-week') {
    lo = T
    hi = addDays(T, 7)
  } else if (filter.type === 'last-15') {
    lo = addDays(T, -15)
    hi = T
  } else if (filter.type === 'custom') {
    const { n, direction, offset } = filter
    if (direction === 'forward') {
      lo = addDays(T, offset * n)
      hi = addDays(T, (offset + 1) * n)
    } else {
      lo = addDays(T, -(offset + 1) * n)
      hi = addDays(T, -offset * n)
    }
  } else {
    // Exhaustive fallback — unreachable but satisfies the compiler
    return true
  }

  return D >= lo && D <= hi
}
