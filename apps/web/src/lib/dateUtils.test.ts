import { describe, it, expect } from 'vitest'
import {
  getLocalDateStr,
  getTodayStr,
  addDays,
  matchesDateFilter,
} from './dateUtils'
import type { DateFilter } from './dateUtils'

// Deadlines are stored by TaskModal as UTC midnight: new Date("YYYY-MM-DD").toISOString()
// which always produces "YYYY-MM-DDT00:00:00.000Z". This helper models that exactly.
function utcIso(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`
}

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
// Deadlines are passed as UTC midnight ISO strings (how the API stores them).
// ---------------------------------------------------------------------------
describe('matchesDateFilter — today preset', () => {
  it('matches when deadline is today (UTC midnight ISO)', () => {
    const today = getTodayStr()
    expect(matchesDateFilter(utcIso(today), { type: 'today' })).toBe(true)
  })

  it('does not match when deadline is yesterday', () => {
    const yesterday = addDays(getTodayStr(), -1)
    expect(matchesDateFilter(utcIso(yesterday), { type: 'today' })).toBe(false)
  })

  it('does not match when deadline is tomorrow', () => {
    const tomorrow = addDays(getTodayStr(), 1)
    expect(matchesDateFilter(utcIso(tomorrow), { type: 'today' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.6 — this-week preset [today, today+7]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — this-week preset', () => {
  it('matches deadline on today', () => {
    expect(matchesDateFilter(utcIso(getTodayStr()), { type: 'this-week' })).toBe(true)
  })

  it('matches deadline on today+7 (inclusive upper bound)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 7)), { type: 'this-week' })).toBe(true)
  })

  it('does not match deadline on today+8 (outside window)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 8)), { type: 'this-week' })).toBe(false)
  })

  it('does not match deadline on today-1 (before window)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -1)), { type: 'this-week' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.7 — last-15 preset [today-15, today]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — last-15 preset', () => {
  it('matches deadline on today', () => {
    expect(matchesDateFilter(utcIso(getTodayStr()), { type: 'last-15' })).toBe(true)
  })

  it('matches deadline on today-15 (inclusive lower bound)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -15)), { type: 'last-15' })).toBe(true)
  })

  it('does not match deadline on today-16 (outside window)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -16)), { type: 'last-15' })).toBe(false)
  })

  it('does not match deadline on today+1 (future)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 1)), { type: 'last-15' })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.8 — custom forward offset=0, N=7: window [today, today+7]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — custom forward offset=0, N=7', () => {
  const filter: DateFilter = { type: 'custom', n: 7, direction: 'forward', offset: 0 }

  it('matches deadline on today (lo boundary)', () => {
    expect(matchesDateFilter(utcIso(getTodayStr()), filter)).toBe(true)
  })

  it('matches deadline on today+7 (hi boundary)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 7)), filter)).toBe(true)
  })

  it('does not match deadline on today+8 (outside window)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 8)), filter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.9 — custom forward offset=1, N=7: window [today+7, today+14]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — custom forward offset=1, N=7', () => {
  const filter: DateFilter = { type: 'custom', n: 7, direction: 'forward', offset: 1 }

  it('does not match deadline on today+6 (before window)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 6)), filter)).toBe(false)
  })

  it('matches deadline on today+7 (lo boundary)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 7)), filter)).toBe(true)
  })

  it('matches deadline on today+14 (hi boundary)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 14)), filter)).toBe(true)
  })

  it('does not match deadline on today+15 (outside window)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), 15)), filter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.10 — custom backward offset=0, N=10: window [today-10, today]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — custom backward offset=0, N=10', () => {
  const filter: DateFilter = { type: 'custom', n: 10, direction: 'backward', offset: 0 }

  it('matches deadline on today-10 (lo boundary)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -10)), filter)).toBe(true)
  })

  it('matches deadline on today (hi boundary)', () => {
    expect(matchesDateFilter(utcIso(getTodayStr()), filter)).toBe(true)
  })

  it('does not match deadline on today-11 (outside window)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -11)), filter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.11 — custom backward offset=1, N=10: window [today-20, today-10]
// ---------------------------------------------------------------------------
describe('matchesDateFilter — custom backward offset=1, N=10', () => {
  const filter: DateFilter = { type: 'custom', n: 10, direction: 'backward', offset: 1 }

  it('matches deadline on today-10 (hi boundary)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -10)), filter)).toBe(true)
  })

  it('does not match deadline on today-9 (above hi boundary)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -9)), filter)).toBe(false)
  })

  it('matches deadline on today-20 (lo boundary)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -20)), filter)).toBe(true)
  })

  it('does not match deadline on today-21 (outside window)', () => {
    expect(matchesDateFilter(utcIso(addDays(getTodayStr(), -21)), filter)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 1.12 — timezone safety
// ---------------------------------------------------------------------------
describe('timezone boundary — local calendar dates, not UTC', () => {
  it('getLocalDateStr(new Date(2026, 5, 14)) returns 2026-06-14 regardless of timezone', () => {
    const localMidnight = new Date(2026, 5, 14)
    expect(getLocalDateStr(localMidnight)).toBe('2026-06-14')
  })

  it('matches a UTC-midnight deadline for today regardless of local UTC offset', () => {
    // Regression: TaskModal stores deadlines as new Date("YYYY-MM-DD").toISOString()
    // which is UTC midnight. In negative UTC offsets, converting UTC midnight to local
    // time gives the previous day — matchesDateFilter must NOT do that conversion.
    const todayUtcMidnight = utcIso(getTodayStr())
    expect(matchesDateFilter(todayUtcMidnight, { type: 'today' })).toBe(true)
  })
})
