'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Camera,
  FileText,
  Loader2,
  MapPin,
  Mic,
  Paperclip,
  Square,
  Video,
  X,
} from 'lucide-react'

export type FieldMediaExpectedType = 'camera' | 'video' | 'audio' | 'text' | 'document'

export interface FieldMediaCapturePayload {
  file: File
  capturedAt: string
  latitude: number | null
  longitude: number | null
  source: FieldMediaExpectedType
  /** Blob URL for immediate image preview (valid for current session only). */
  previewUrl?: string
  /** Speech-to-text transcript for audio captures (when browser supports it). */
  transcript?: string
}

interface FieldMediaUploaderProps {
  expectedType: FieldMediaExpectedType
  onCapture: (payload: FieldMediaCapturePayload) => void | Promise<void>
  className?: string
  buttonClassName?: string
  disabled?: boolean
  label?: string
  variant?: 'card' | 'icon'
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function isGeolocationError(value: unknown): value is GeolocationPositionError {
  return typeof value === 'object'
    && value !== null
    && 'code' in value
    && typeof (value as { code?: unknown }).code === 'number'
}

function fileExtensionForMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  return 'bin'
}

function buttonCopy(expectedType: FieldMediaExpectedType): {
  title: string
  subtitle: string
  idleLabel: string
  loadingLabel: string
} {
  switch (expectedType) {
    case 'camera':
      return {
        title: 'Camera Capture',
        subtitle: 'Launch the rear camera for a field photo.',
        idleLabel: 'Open Camera',
        loadingLabel: 'Saving Photo…',
      }
    case 'video':
      return {
        title: 'Video Capture',
        subtitle: 'Launch the rear camera in video mode.',
        idleLabel: 'Record Video',
        loadingLabel: 'Saving Video…',
      }
    case 'audio':
      return {
        title: 'Voice Memo',
        subtitle: 'Press and hold to record an audio note from the field.',
        idleLabel: 'Hold to Record',
        loadingLabel: 'Preparing Mic…',
      }
    case 'text':
      return {
        title: 'Text Note',
        subtitle: 'Capture a typed field note with time and location.',
        idleLabel: 'Save Note',
        loadingLabel: 'Saving Note…',
      }
    case 'document':
      return {
        title: 'Document Upload',
        subtitle: 'Attach an existing file from the device.',
        idleLabel: 'Choose File',
        loadingLabel: 'Saving File…',
      }
  }
}

async function getGeolocation(): Promise<{
  latitude: number | null
  longitude: number | null
  error: string | null
}> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      latitude: null,
      longitude: null,
      error: 'Geolocation is not supported on this device.',
    }
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS)
    })

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      error: null,
    }
  } catch (error) {
    const message = isGeolocationError(error)
      ? error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Evidence was captured without GPS coordinates.'
        : error.code === error.POSITION_UNAVAILABLE
          ? 'Location could not be determined. Evidence was captured without GPS coordinates.'
          : 'Location lookup timed out. Evidence was captured without GPS coordinates.'
      : 'Location could not be determined. Evidence was captured without GPS coordinates.'

    return {
      latitude: null,
      longitude: null,
      error: message,
    }
  }
}

export function FieldMediaUploader({
  expectedType,
  onCapture,
  className,
  buttonClassName,
  disabled = false,
  label,
  variant = 'card',
}: FieldMediaUploaderProps) {
  const copy = buttonCopy(expectedType)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [isBusy, setIsBusy] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [textValue, setTextValue] = useState('')
  const [textComposerOpen, setTextComposerOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      mediaStreamRef.current?.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current = null
      mediaStreamRef.current = null
    }
  }, [])

  async function finalizeCapture(file: File, source: FieldMediaExpectedType, transcript?: string) {
    setIsBusy(true)
    setStatus('Pinning location and timestamp…')
    setError(null)

    try {
      const capturedAt = new Date().toISOString()
      const location = await getGeolocation()

      if (location.error) {
        setError(location.error)
      }

      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      console.log('[SiteLine] finalizeCapture —', source, '— mimeType:', file.type, '— previewUrl:', previewUrl ?? '(none)', '— transcript:', transcript ?? '(none)')

      await onCapture({
        file,
        capturedAt,
        latitude: location.latitude,
        longitude: location.longitude,
        source,
        previewUrl,
        transcript,
      })

      setStatus(location.latitude !== null && location.longitude !== null
        ? 'Capture saved with GPS coordinates.'
        : 'Capture saved without GPS coordinates.')
      if (source === 'text') {
        setTextComposerOpen(false)
      }
    } catch {
      setError('Capture could not be handed back to the app.')
      setStatus(null)
    } finally {
      setIsBusy(false)
    }
  }

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    await finalizeCapture(file, expectedType)
  }

  async function startAudioRecording() {
    if (disabled || isBusy || isRecording) return

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Audio recording is not supported on this device.')
      return
    }

    setError(null)
    setStatus('Requesting microphone access…')
    setIsBusy(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // Start SpeechRecognition alongside MediaRecorder when available
      const SpeechRecognitionCtor = getSpeechRecognitionCtor()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let recognition: any = null
      const transcriptParts: string[] = []
      if (SpeechRecognitionCtor) {
        recognition = new SpeechRecognitionCtor()
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = 'en-CA'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcriptParts.push(String(event.results[i][0].transcript).trim())
            }
          }
        }
        try { recognition.start() } catch { /* not fatal if unavailable */ }
      }

      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream)

      audioChunksRef.current = []
      mediaRecorderRef.current = recorder

      recorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      })

      recorder.addEventListener('stop', () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const timestampSlug = new Date().toISOString().replace(/[:.]/g, '-')
        const extension = fileExtensionForMimeType(mimeType)
        const file = new File([blob], `voice-memo-${timestampSlug}.${extension}`, { type: mimeType })

        mediaStreamRef.current?.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
        mediaRecorderRef.current = null
        audioChunksRef.current = []
        setIsRecording(false)

        // Guard so finalizeCapture is called exactly once regardless of which path fires first.
        let finalizeCalled = false
        const doFinalize = () => {
          if (finalizeCalled) return
          finalizeCalled = true
          const transcript = transcriptParts.length > 0 ? transcriptParts.join(' ') : undefined
          console.log('[SiteLine] audio finalize — transcriptParts:', transcriptParts.length, '— joined:', transcript ?? '(none)')
          void finalizeCapture(file, 'audio', transcript)
        }

        if (recognition) {
          // SpeechRecognition fires its final onresult events *after* stop() returns, then
          // fires onend. We must wait for onend so transcriptParts is fully populated.
          recognition.onend = doFinalize
          try {
            recognition.stop()
          } catch {
            // If stop() throws (e.g. recognition never started) finalize immediately.
            doFinalize()
          }
        } else {
          console.log('[SiteLine] audio finalize — SpeechRecognition unavailable in this browser')
          doFinalize()
        }
      })

      recorder.start()
      setIsRecording(true)
      setIsBusy(false)
      setStatus('Recording… release to stop.')
    } catch {
      setError('Microphone permission was denied or unavailable.')
      setStatus(null)
      setIsBusy(false)
      setIsRecording(false)
      mediaStreamRef.current?.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
  }

  function stopAudioRecording() {
    if (!isRecording) return
    setStatus('Finishing voice memo…')
    setIsBusy(true)
    mediaRecorderRef.current?.stop()
  }

  async function handleTextCapture() {
    const trimmed = textValue.trim()
    if (!trimmed || disabled || isBusy) return

    const timestampSlug = new Date().toISOString().replace(/[:.]/g, '-')
    const file = new File([trimmed], `field-note-${timestampSlug}.txt`, {
      type: 'text/plain',
    })

    await finalizeCapture(file, 'text')
    setTextValue('')
  }

  const sharedButtonClass = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    disabled || isBusy
      ? 'border-white/10 bg-white/5 text-zinc-500'
      : 'border-white/10 bg-[#0f1a33] text-zinc-100 hover:bg-[#162240]'
  }`
  const compactButtonClass = `${buttonClassName ?? `inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border px-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    disabled || isBusy
      ? 'border-white/10 bg-[#0f1a33] text-zinc-500'
      : 'border-white/10 bg-[#0f1a33] text-zinc-200 hover:bg-[#162240]'
  }`} active:scale-[0.98] active:brightness-95`

  const icon = expectedType === 'camera' ? <Camera className="h-4 w-4" /> :
    expectedType === 'video' ? <Video className="h-4 w-4" /> :
    expectedType === 'audio' ? <Mic className="h-4 w-4" /> :
    expectedType === 'text' ? <FileText className="h-4 w-4" /> :
    <Paperclip className="h-4 w-4" />

  if (variant === 'icon') {
    return (
      <div className={`relative ${className ?? ''}`.trim()}>
        {expectedType === 'audio' ? (
          <button
            type="button"
            disabled={disabled || isBusy}
            onPointerDown={() => void startAudioRecording()}
            onPointerUp={stopAudioRecording}
            onPointerLeave={stopAudioRecording}
            onPointerCancel={stopAudioRecording}
            onMouseUp={stopAudioRecording}
            onTouchEnd={stopAudioRecording}
            className={`${compactButtonClass} ${isRecording ? 'border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/20' : ''}`.trim()}
          >
            {isBusy && !isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <Square className="h-4 w-4" /> : icon}
            <span className="sr-only">{label ?? copy.idleLabel}</span>
          </button>
        ) : expectedType === 'text' ? (
          <>
            <button
              type="button"
              disabled={disabled || isBusy}
              onClick={() => {
                setError(null)
                setStatus(null)
                setTextComposerOpen(current => !current)
              }}
              className={compactButtonClass}
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
              <span className="sr-only">{label ?? copy.idleLabel}</span>
            </button>

            {textComposerOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-white/10 bg-[#091022] p-3 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Text Note
                  </div>
                  <button
                    type="button"
                    onClick={() => setTextComposerOpen(false)}
                    className="rounded-full border border-white/10 p-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Close text note</span>
                  </button>
                </div>
                <textarea
                  value={textValue}
                  onChange={event => setTextValue(event.target.value)}
                  rows={4}
                  placeholder="Enter a field note..."
                  disabled={disabled || isBusy}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#FF5F15] focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={disabled || isBusy || textValue.trim().length === 0}
                  onClick={() => void handleTextCapture()}
                  className={`${sharedButtonClass} mt-3 w-full`}
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {label ?? (isBusy ? copy.loadingLabel : copy.idleLabel)}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={disabled || isBusy}
              onClick={() => fileInputRef.current?.click()}
              className={compactButtonClass}
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
              <span className="sr-only">{label ?? copy.idleLabel}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={
                expectedType === 'camera' ? 'image/*;capture=camera' :
                expectedType === 'video' ? 'video/*' :
                expectedType === 'document' ? undefined :
                undefined
              }
              capture={
                expectedType === 'camera' || expectedType === 'video'
                  ? 'environment'
                  : undefined
              }
              onChange={event => void handleFileSelection(event)}
            />
          </>
        )}

        {(status || error) && (
          <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-white/10 bg-[#091022] px-3 py-2 shadow-2xl">
            {status && (
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <MapPin className="h-3.5 w-3.5 text-cyan-300" />
                <span>{status}</span>
              </div>
            )}
            {error && (
              <div className={`${status ? 'mt-2 ' : ''}text-xs text-amber-200`}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-[1.5rem] border border-white/10 bg-[#0a1020] p-4 ${className ?? ''}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            {copy.title}
          </div>
          <div className="mt-2 text-sm text-zinc-300">
            {copy.subtitle}
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300">
          {icon}
        </div>
      </div>

      {expectedType === 'text' ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={textValue}
            onChange={event => setTextValue(event.target.value)}
            rows={4}
            placeholder="Enter a field note..."
            disabled={disabled || isBusy}
            className="w-full rounded-2xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#FF5F15] focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled || isBusy || textValue.trim().length === 0}
            onClick={() => void handleTextCapture()}
            className={`${sharedButtonClass} w-full`}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {label ?? (isBusy ? copy.loadingLabel : copy.idleLabel)}
          </button>
        </div>
      ) : expectedType === 'audio' ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            disabled={disabled || isBusy}
            onPointerDown={() => void startAudioRecording()}
            onPointerUp={stopAudioRecording}
            onPointerLeave={stopAudioRecording}
            onPointerCancel={stopAudioRecording}
            onMouseUp={stopAudioRecording}
            onTouchEnd={stopAudioRecording}
            className={`w-full ${
              isRecording
                ? 'border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/20'
                : sharedButtonClass
            } inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isBusy && !isRecording ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {label ?? (isRecording ? 'Release to Stop' : isBusy ? copy.loadingLabel : copy.idleLabel)}
          </button>
          <div className="text-xs text-zinc-500">
            Hold the button while speaking. Release to finalize the voice memo.
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            disabled={disabled || isBusy}
            onClick={() => fileInputRef.current?.click()}
            className={`${sharedButtonClass} w-full`}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            {label ?? (isBusy ? copy.loadingLabel : copy.idleLabel)}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={
              expectedType === 'camera' ? 'image/*;capture=camera' :
              expectedType === 'video' ? 'video/*' :
              undefined
            }
            capture={
              expectedType === 'camera' || expectedType === 'video'
                ? 'environment'
                : undefined
            }
            onChange={event => void handleFileSelection(event)}
          />
        </div>
      )}

      <div className="mt-4 min-h-10 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
        {status ? (
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <MapPin className="h-3.5 w-3.5 text-cyan-300" />
            <span>{status}</span>
          </div>
        ) : (
          <div className="text-xs text-zinc-500">
            Captures are timestamped automatically and geotagged when location permission is available.
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-100/90">
          {error}
        </div>
      )}
    </div>
  )
}

export default FieldMediaUploader
