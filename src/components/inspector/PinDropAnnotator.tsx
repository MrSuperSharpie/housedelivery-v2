'use client'

import React, { useState, useRef, useCallback } from 'react'
import { X, MapPin, Plus } from 'lucide-react'
import type { PinAnnotation, InspectionPhoto } from '@/lib/types'

interface PinDropAnnotatorProps {
  photo: InspectionPhoto
  onUpdate: (photo: InspectionPhoto) => void
  readOnly?: boolean
}

export function PinDropAnnotator({ photo, onUpdate, readOnly = false }: PinDropAnnotatorProps) {
  const [activePin, setActivePin] = useState<string | null>(null)
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [noteText, setNoteText] = useState('')
  const imgRef = useRef<HTMLDivElement>(null)

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly || !imgRef.current) return
      const rect = imgRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setPendingPin({ x, y })
      setNoteText('')
    },
    [readOnly]
  )

  const confirmPin = () => {
    if (!pendingPin) return
    const pin: PinAnnotation = {
      id: `pin-${Date.now()}`,
      x: pendingPin.x,
      y: pendingPin.y,
      note: noteText,
      photoId: photo.id,
    }
    onUpdate({ ...photo, pins: [...photo.pins, pin] })
    setPendingPin(null)
    setNoteText('')
  }

  const removePin = (pinId: string) => {
    onUpdate({ ...photo, pins: photo.pins.filter(p => p.id !== pinId) })
  }

  return (
    <div className="space-y-3">
      {/* Image with pins */}
      <div
        ref={imgRef}
        className="relative rounded-xl overflow-hidden cursor-crosshair select-none"
        style={{ paddingBottom: '60%' }}
        onClick={handleImageClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt="Inspection photo"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Dropped pins */}
        {photo.pins.map((pin) => (
          <div
            key={pin.id}
            className="absolute"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}
            onClick={(e) => { e.stopPropagation(); setActivePin(activePin === pin.id ? null : pin.id) }}
          >
            <div className="relative">
              <div className="w-7 h-7 bg-fail-red rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              {/* Note tooltip */}
              {activePin === pin.id && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 min-w-max max-w-48">
                  <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl relative">
                    <p className="pr-4">{pin.note || 'No note'}</p>
                    {!readOnly && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removePin(pin.id) }}
                        className="absolute top-1 right-1 p-0.5 text-gray-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Pending pin */}
        {pendingPin && (
          <div
            className="absolute pointer-events-none"
            style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-7 h-7 bg-safety-orange rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
              <Plus className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Tap to drop hint */}
        {!readOnly && photo.pins.length === 0 && !pendingPin && (
          <div className="absolute bottom-3 left-3 right-3 text-center pointer-events-none">
            <div className="inline-flex items-center gap-1.5 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg">
              <MapPin className="w-3 h-3 text-fail-red" />
              Tap to drop deficiency pin
            </div>
          </div>
        )}
      </div>

      {/* Pending pin note input */}
      {pendingPin && (
        <div className="bg-slate-800 rounded-xl p-3 border border-safety-orange/50">
          <div className="text-xs font-semibold text-slate-300 mb-2">Add note for pin:</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Describe the deficiency…"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && confirmPin()}
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-safety-orange"
            />
            <button
              onClick={confirmPin}
              className="px-4 py-2 bg-safety-orange text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setPendingPin(null)}
              className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Pin list */}
      {photo.pins.length > 0 && (
        <div className="space-y-2">
          {photo.pins.map((pin, i) => (
            <div key={pin.id} className="flex items-start gap-2 bg-slate-800 rounded-xl p-3">
              <div className="w-5 h-5 bg-fail-red rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-slate-200 flex-1">{pin.note || '(No note)'}</p>
              {!readOnly && (
                <button
                  onClick={() => removePin(pin.id)}
                  className="text-slate-500 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
