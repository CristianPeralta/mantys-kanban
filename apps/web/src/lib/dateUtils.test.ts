import { describe, it, expect } from 'vitest'
import {
  getLocalDateStr,
  addDays,
  matchesDateFilter,
} from './dateUtils'
import type { DateFilter } from './dateUtils'

// ---------------------------------------------------------------------------
// Task 1.1 — getLocalDateStr
// ---------------------------------------------------------------------------
describe('getLocalDateStr', () => {
  it('returns YYYY-MM-DD from a local Date constructed with new Date(y, m, d)', () => {
    const d = new Date(2026, 5, 14) // June 14 2026, local
    expect(getLocalDateStr(d)).toBe('2026-06-14')
  })

  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 5) // January 5 2026, local
    expect(getLocalDateStr(d)).toBe('2026-01-05')
  })
})

// ---------------------------------------------------------------------------
// Task 1.2 — addDays
// ---------------------------------------------------------------------------
describe('addDays', () => {
  it('adds positive days across a month boundary', () => {
    expect(addDays('2026-06-14', 7)).toBe('2026-06-21')
  })

  it('subtracts days across a month boundary', () => {
    expect(addDays('2026-06-14', -15)).toBe('2026-05-30')
  })

  it('returns the same date when n=0', () => {
    expect(addDays('2026-06-14', 0)).toBe('2026-06-14')
  })
})

// ---------------------------------------------------------------------------
// Task 1.3 — matchesDateFilter with null filter
// ---------------------------------------------------------------------------
describe('matchesDateFilter — null filter (no active filter)', () => {
  it('returns true for a task with a valid deadline', () => {
    expect(matchesDateFilter('2026-06-14', null)).toBe(true)
  })

  it('returns true for a task with undefined deadline', () => {
    expect(matchesDateFilter(undefined, null)).toBe(true)
  })

  it('returns true for a task with null deadline', () => {
    expect(matchesDateFilter(null as unknown as undefined, null)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Task 1.4 — matchesDateFilter with active filter and missing/invalid deadline
// ---------------------------------------------------------------------------
describe('matchesDateFilter — missing or invalid deadline with active filter', () => {
  const activeFilter: DateFilter = { type: 'today' }

  it('returns false for undefined deadline', () => {
    expect(matchesDateFilter(undefined, activeFilter)).toBe(false)
  })

  it('returns false for null deadline', () => {
    expect(matchesDateFilter(null as unknown as undefined, activeFilter)).toBe(false)
  })

  it('returns false for a non-date string that produces NaN', () => {
    expect(matchesDateFilter('not-a-date', activeFilter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.5 — today preset
// Inject today via a fixed date string so the test is deterministic.
// We construct a deadline by parsing a known date string.
// ---------------------------------------------------------------------------
describe('matchesDateFilter — today preset', () => {
  // We'll use an ISO date string that matches the local midnight construction
  // new Date(2026, 5, 14) → getLocalDateStr → '2026-06-14'
  // To make deadline match today's local date we build it via new Date(y, m, d) and .toISOString()
  // BUT the predicate uses getLocalDateStr(new Date(deadline)) which is local-safe.
  // We pass the deadline as a full ISO string that resolves to the same local date.

  // Helper: build a deadline ISO string whose LOCAL date equals the given YYYY-MM-DD
  function localIso(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toISOString()
  }

  it('matches when deadline local date equals today', () => {
    // Today's local date is whatever local today is; we use getLocalDateStr to compute it
    // so the test is timezone-agnostic (tests run in the machine's local tz).
    const todayLocal = getLocalDateStr(new Date())
    expect(matchesDateFilter(localIso(todayLocal), { type: 'today' })).toBe(true)
  })

  it('does not match when deadline is yesterday (today-1)', () => {
    const todayLocal = getLocalDateStr(new Date())
    const yesterdayLocal = addDays(todayLocal, -1)
    expect(matchesDateFilter(localIso(yesterdayLocal), { type: 'today' })).toBe(false)
  })

  it('does not match when deadline is tomorrow (today+1)', () => {
    const todayLocal = getLocalDateStr(new Date())
    const tomorrowLocal = addDays(todayLocal, 1)
    expect(matchesDateFilter(localIso(tomorrowLocal), { type: 'today' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.6 — this-week preset [today, today+7]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — this-week preset', () => {
  function localIso(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toISOString()
  }

  const todayLocal = getLocalDateStr(new Date())

  it('matches deadline on today', () => {
    expect(matchesDateFilter(localIso(todayLocal), { type: 'this-week' })).toBe(true)
  })

  it('matches deadline on today+7 (inclusive upper bound)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 7)), { type: 'this-week' })).toBe(true)
  })

  it('does not match deadline on today+8 (outside window)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 8)), { type: 'this-week' })).toBe(false)
  })

  it('does not match deadline on today-1 (before window)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -1)), { type: 'this-week' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.7 — last-15 preset [today-15, today]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — last-15 preset', () => {
  function localIso(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toISOString()
  }

  const todayLocal = getLocalDateStr(new Date())

  it('matches deadline on today', () => {
    expect(matchesDateFilter(localIso(todayLocal), { type: 'last-15' })).toBe(true)
  })

  it('matches deadline on today-15 (inclusive lower bound)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -15)), { type: 'last-15' })).toBe(true)
  })

  it('does not match deadline on today-16 (outside window)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -16)), { type: 'last-15' })).toBe(false)
  })

  it('does not match deadline on today+1 (future)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 1)), { type: 'last-15' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.8 — custom forward offset=0, N=7: window [today, today+7]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — custom forward offset=0, N=7', () => {
  function localIso(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toISOString()
  }

  const todayLocal = getLocalDateStr(new Date())
  const filter: DateFilter = { type: 'custom', n: 7, direction: 'forward', offset: 0 }

  it('matches deadline on today (lo boundary)', () => {
    expect(matchesDateFilter(localIso(todayLocal), filter)).toBe(true)
  })

  it('matches deadline on today+7 (hi boundary)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 7)), filter)).toBe(true)
  })

  it('does not match deadline on today+8 (outside window)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 8)), filter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.9 — custom forward offset=1, N=7: window [today+7, today+14]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — custom forward offset=1, N=7', () => {
  function localIso(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toISOString()
  }

  const todayLocal = getLocalDateStr(new Date())
  const filter: DateFilter = { type: 'custom', n: 7, direction: 'forward', offset: 1 }

  it('does not match deadline on today+6 (before window)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 6)), filter)).toBe(false)
  })

  it('matches deadline on today+7 (lo boundary)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 7)), filter)).toBe(true)
  })

  it('matches deadline on today+14 (hi boundary)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 14)), filter)).toBe(true)
  })

  it('does not match deadline on today+15 (outside window)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, 15)), filter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.10 — custom backward offset=0, N=10: window [today-10, today]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — custom backward offset=0, N=10', () => {
  function localIso(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toISOString()
  }

  const todayLocal = getLocalDateStr(new Date())
  const filter: DateFilter = { type: 'custom', n: 10, direction: 'backward', offset: 0 }

  it('matches deadline on today-10 (lo boundary)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -10)), filter)).toBe(true)
  })

  it('matches deadline on today (hi boundary)', () => {
    expect(matchesDateFilter(localIso(todayLocal), filter)).toBe(true)
  })

  it('does not match deadline on today-11 (outside window)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -11)), filter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.11 — custom backward offset=1, N=10: window [today-20, today-10]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — custom backward offset=1, N=10', () => {
  function localIso(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toISOString()
  }

  const todayLocal = getLocalDateStr(new Date())
  const filter: DateFilter = { type: 'custom', n: 10, direction: 'backward', offset: 1 }

  it('matches deadline on today-10 (hi boundary)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -10)), filter)).toBe(true)
  })

  it('does not match deadline on today-9 (above hi boundary)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -9)), filter)).toBe(false)
  })

  it('matches deadline on today-20 (lo boundary)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -20)), filter)).toBe(true)
  })

  it('does not match deadline on today-21 (outside window)', () => {
    expect(matchesDateFilter(localIso(addDays(todayLocal, -21)), filter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.12 — timezone boundary: getLocalDateStr MUST use local Y/M/D, not toISOString
// ---------------------------------------------------------------------------
describe('timezone boundary — local calendar dates, not UTC', () => {
  it('getLocalDateStr(new Date(2026, 5, 14)) returns 2026-06-14 regardless of timezone', () => {
    // new Date(y, m, d) is LOCAL midnight — getLocalDateStr must use getFullYear/getMonth/getDate
    const localMidnight = new Date(2026, 5, 14)
    expect(getLocalDateStr(localMidnight)).toBe('2026-06-14')
  })

  it('documents that toISOString diverges from local date in negative-offset environments', () => {
    // In UTC-3, new Date(2026, 5, 14) at local midnight is 2026-06-14T03:00:00Z
    // toISOString().slice(0, 10) → '2026-06-14' (UTC) — OK here
    // But new Date('2026-06-14T01:00:00Z') at UTC-3 = 2026-06-13 local time
    // getLocalDateStr should return '2026-06-13', NOT '2026-06-14'
    const utcEarlyMorning = new Date('2026-06-14T01:00:00Z')
    const localStr = getLocalDateStr(utcEarlyMorning)
    const utcStr = utcEarlyMorning.toISOString().slice(0, 10) // always '2026-06-14'
    // In UTC+0 or UTC+1, both would be '2026-06-14'.
    // In UTC-3, localStr would be '2026-06-13' and utcStr '2026-06-14'.
    // The assertion: getLocalDateStr uses getFullYear/getMonth/getDate (local), not toISOString.
    // We verify that the implementation is consistent: getLocalDateStr(new Date(dateStr)) round-trips.
    const reconstructed = new Date(
      utcEarlyMorning.getFullYear(),
      utcEarlyMorning.getMonth(),
      utcEarlyMorning.getDate(),
    )
    expect(getLocalDateStr(utcEarlyMorning)).toBe(getLocalDateStr(reconstructed))
    // And verify it is NOT blindly using toISOString when local tz would differ:
    // (This will pass in UTC but is correct in any timezone — the key invariant is the method used.)
    void localStr
    void utcStr
  })
})
