'use client'

import React from 'react'
import { MapPin, Navigation, Clock } from 'lucide-react'

interface TrackingMapProps {
  inspectorName: string
  etaMinutes?: number
  projectAddress: string
  isOnSite?: boolean
}

export function TrackingMap({ inspectorName, etaMinutes = 8, projectAddress, isOnSite = false }: TrackingMapProps) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Map placeholder with grid background */}
      <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 h-48 sm:h-56">
        {/* Blueprint grid */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#0A192F" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Simulated road lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ffffff" strokeWidth="3" opacity="0.6" />
          <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
          <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
          <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
          <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#ffffff" strokeWidth="1.5" opacity="0.3" />
        </svg>

        {/* Destination pin */}
        <div className="absolute" style={{ left: '65%', top: '45%', transform: 'translate(-50%, -50%)' }}>
          <div className="relative">
            <div className="w-8 h-8 bg-safety-orange rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white rounded-lg px-2 py-1 text-xs font-semibold text-gray-800 shadow-md">
              Your Site
            </div>
          </div>
        </div>

        {/* Inspector ping */}
        {!isOnSite && (
          <div className="absolute" style={{ left: '38%', top: '55%', transform: 'translate(-50%, -50%)' }}>
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-blue-400 opacity-20 animate-ping" />
              <div className="w-8 h-8 bg-blueprint-blue rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Navigation className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Route line */}
        {!isOnSite && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 38% 55% Q 50% 40% 65% 45%"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              opacity="0.7"
            />
          </svg>
        )}

        {/* Status overlay */}
        <div className="absolute top-3 left-3 right-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
            isOnSite
              ? 'bg-success-green text-white'
              : 'bg-white text-blueprint-blue'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isOnSite ? 'bg-white' : 'bg-blue-500 animate-pulse'}`} />
            {isOnSite ? '✓ Inspector On-Site' : `Inspector En Route — ${etaMinutes} min away`}
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">{inspectorName}</div>
          <div className="text-xs text-gray-500 mt-0.5">{projectAddress}</div>
        </div>
        {!isOnSite && (
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span>ETA {etaMinutes} min</span>
          </div>
        )}
      </div>
    </div>
  )
}
