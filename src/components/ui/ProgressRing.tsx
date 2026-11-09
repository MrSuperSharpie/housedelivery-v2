'use client'

import React, { useEffect, useState } from 'react'

interface ProgressRingProps {
  current: number   // current stage (1-5)
  total?: number    // max stages (default 5)
  size?: number     // SVG size in px
  strokeWidth?: number
  label?: boolean   // show "n/5" label inside
  animate?: boolean
  className?: string
}

export function ProgressRing({
  current,
  total = 5,
  size = 64,
  strokeWidth = 6,
  label = true,
  animate = true,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(current / total, 1)
  const targetOffset = circumference * (1 - progress)

  const [offset, setOffset] = useState(animate ? circumference : targetOffset)

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setOffset(targetOffset), 100)
    return () => clearTimeout(timer)
  }, [animate, targetOffset])

  // Color based on progress
  const getColor = () => {
    if (current >= total) return '#10B981' // success-green
    if (current >= total * 0.6) return '#F59E0B' // warning-amber
    return '#FF5F15' // safety-orange
  }

  const color = getColor()

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ''}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animate ? 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
          }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold leading-none" style={{ color }}>
            {current}
          </span>
          <span className="text-xs text-gray-400 leading-none">/{total}</span>
        </div>
      )}
    </div>
  )
}

// Dark mode version for inspector portal
export function ProgressRingDark({
  current,
  total = 5,
  size = 64,
  strokeWidth = 6,
  label = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(current / total, 1)
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const timer = setTimeout(() => setOffset(circumference * (1 - progress)), 100)
    return () => clearTimeout(timer)
  }, [circumference, progress])

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E3A5F" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FF5F15"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-safety-orange">{current}</span>
          <span className="text-xs text-slate-400">/{total}</span>
        </div>
      )}
    </div>
  )
}
