'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DateFilter, DateFilterPreset } from '@/lib/dateUtils'

interface DateFilterPillProps {
  value: DateFilter
  onChange: (f: DateFilter) => void
}

const PRESETS: { key: DateFilterPreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'This week' },
  { key: 'last-15', label: 'Last 15 days' },
]

const PILL_BASE = 'text-xs px-2.5 py-1 rounded-full transition-colors'
const PILL_ACTIVE = 'bg-indigo-600 text-white'
const PILL_INACTIVE = 'bg-[#27272b] text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#3f3f46]'

export default function DateFilterPill({ value, onChange }: DateFilterPillProps) {
  // Local state for custom filter parameters (only used when custom mode is active)
  const [customN, setCustomN] = useState(7)
  const [customDirection, setCustomDirection] = useState<'forward' | 'backward'>('forward')
  const [customOffset, setCustomOffset] = useState(0)

  const isCustom = value !== null && (value as { type: string }).type === 'custom'
  const activePreset =
    value !== null && !isCustom ? (value as { type: DateFilterPreset }).type : null

  function handlePresetClick(key: DateFilterPreset) {
    if (activePreset === key) {
      // Toggle off
      onChange(null)
    } else {
      onChange({ type: key })
    }
  }

  function handleCustomActivate(n: number, direction: 'forward' | 'backward', offset: number) {
    if (n < 1) return
    onChange({ type: 'custom', n, direction, offset })
  }

  function handleNChange(raw: string) {
    const parsed = parseInt(raw, 10)
    const clamped = isNaN(parsed) ? 1 : Math.max(1, parsed)
    setCustomN(clamped)
    if (isCustom) {
      handleCustomActivate(clamped, customDirection, customOffset)
    }
  }

  function handleDirectionToggle() {
    const next = customDirection === 'forward' ? 'backward' : 'forward'
    setCustomDirection(next)
    setCustomOffset(0) // reset offset on direction change
    if (isCustom) {
      handleCustomActivate(customN, next, 0)
    }
  }

  function handleNext() {
    const next = customOffset + 1
    setCustomOffset(next)
    handleCustomActivate(customN, customDirection, next)
  }

  function handlePrev() {
    if (customOffset <= 0) return
    const next = customOffset - 1
    setCustomOffset(next)
    handleCustomActivate(customN, customDirection, next)
  }

  function handleCustomOpen() {
    // Activates custom mode with current local state
    setCustomOffset(0)
    handleCustomActivate(customN, customDirection, 0)
  }

  function handleClear() {
    onChange(null)
  }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
      <span className="text-xs text-[#71717a] font-medium">Deadline:</span>

      {/* Preset pills */}
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handlePresetClick(key)}
          className={cn(PILL_BASE, activePreset === key ? PILL_ACTIVE : PILL_INACTIVE)}
        >
          {label}
        </button>
      ))}

      {/* Custom toggle */}
      <button
        onClick={isCustom ? handleClear : handleCustomOpen}
        className={cn(PILL_BASE, isCustom ? PILL_ACTIVE : PILL_INACTIVE)}
      >
        Custom
      </button>

      {/* Custom controls — visible only when custom mode is active */}
      {isCustom && (
        <div className="flex items-center gap-1 ml-1">
          <input
            type="number"
            min={1}
            value={customN}
            onChange={(e) => handleNChange(e.target.value)}
            className="w-12 text-xs bg-[#27272b] text-[#e4e4e7] border border-[#3f3f46] rounded px-1.5 py-0.5 text-center"
          />
          <span className="text-xs text-[#71717a]">days</span>

          {/* Direction toggle */}
          <button
            onClick={handleDirectionToggle}
            className={cn(PILL_BASE, 'bg-[#27272b] text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#3f3f46]')}
          >
            {customDirection === 'forward' ? '→' : '←'}
          </button>

          {/* Prev (go to earlier offset) */}
          <button
            onClick={handlePrev}
            disabled={customOffset <= 0}
            className={cn(
              PILL_BASE,
              customOffset <= 0
                ? 'opacity-30 cursor-not-allowed bg-[#27272b] text-[#71717a]'
                : PILL_INACTIVE,
            )}
          >
            Prev
          </button>

          {/* Next (advance offset) */}
          <button
            onClick={handleNext}
            className={cn(PILL_BASE, PILL_INACTIVE)}
          >
            Next
          </button>

          <span className="text-xs text-[#71717a]">
            {customDirection === 'forward' ? `+${customOffset * customN}–+${(customOffset + 1) * customN}d` : `-${(customOffset + 1) * customN}–-${customOffset * customN}d`}
          </span>
        </div>
      )}

      {/* Clear button — only visible when any filter is active */}
      {value !== null && (
        <button
          onClick={handleClear}
          className={cn(PILL_BASE, 'bg-[#27272b] text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#3f3f46]')}
        >
          Clear
        </button>
      )}
    </div>
  )
}
