import type { ScheduleCBPacketAppendixEntry, ScheduleCBPacketItemRecord } from './scheduleCBPacketTypes'

export type PacketDisplayIdPrefix = 'VRF' | 'SRC' | 'ASN' | 'JOB'

export interface PacketEvidencePreviewAssets {
  fieldNoteImageSrc?: string
  videoImageSrc?: string
  fallbackImageSrc?: string
}

export interface PacketSealSelectionInput {
  actualSealSrc?: string
  mockDemoSealSrc?: string
  explicitDemo?: boolean
  credentialIsDemonstration?: boolean
  credentialText?: string
}

export interface PacketSealPresentation {
  kind: 'real' | 'demo' | 'missing'
  imageSrc?: string
  notice?: string
}

const DEMO_NOTICE = 'DEMONSTRATION ONLY — NOT FOR REGULATORY RELIANCE'

function stableEightCharacterToken(value: string): string {
  const compact = value.replace(/[^a-z0-9]/gi, '').toUpperCase()
  if (compact.length >= 8) return compact.slice(0, 8)

  let hash = 0x811c9dc5
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

export function formatPacketDisplayId(
  value: string | undefined | null,
  prefix: PacketDisplayIdPrefix,
): string | undefined {
  const normalized = value?.trim()
  if (!normalized) return undefined
  return `${prefix}-${stableEightCharacterToken(normalized)}`
}

export function splitPacketNoteParagraphs(value?: string): string[] {
  if (!value?.trim()) return []
  return value
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.split('\n').map(line => line.trim()).filter(Boolean).join(' '))
    .filter(Boolean)
}

export function getFriendlyEvidenceLinkLabel(fileKindLabel: string): string {
  if (fileKindLabel === 'Photo Evidence') return 'Open full-size evidence'
  if (fileKindLabel === 'Field Note' || fileKindLabel === 'Field Observation') return 'Open field note'
  if (fileKindLabel === 'Video Evidence') return 'Open video evidence'
  return 'Open evidence attachment'
}

function fallbackPreviewDataUri(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <rect width="1200" height="675" fill="#f5f3ee"/>
      <rect x="36" y="36" width="1128" height="603" rx="24" fill="#ffffff" stroke="#bdb7ab" stroke-width="3"/>
      <text x="600" y="300" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#161616">VERO PERMIT</text>
      <text x="600" y="356" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#505050">Evidence preview unavailable</text>
      <text x="600" y="402" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#6b7280">Metadata and secure source link remain preserved below.</text>
    </svg>
  `.trim()
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function resolveEvidencePreviewImage(
  entry: Pick<ScheduleCBPacketAppendixEntry, 'fileKindLabel' | 'imageUrl'>,
  assets: PacketEvidencePreviewAssets = {},
): string {
  if (entry.fileKindLabel === 'Photo Evidence' && entry.imageUrl) return entry.imageUrl
  if (entry.fileKindLabel === 'Field Note' || entry.fileKindLabel === 'Field Observation') {
    return assets.fieldNoteImageSrc ?? assets.fallbackImageSrc ?? fallbackPreviewDataUri()
  }
  if (entry.fileKindLabel === 'Video Evidence') {
    return assets.videoImageSrc ?? assets.fallbackImageSrc ?? fallbackPreviewDataUri()
  }
  return entry.imageUrl ?? assets.fallbackImageSrc ?? fallbackPreviewDataUri()
}

export function isDemoCredentialText(value?: string): boolean {
  return /\b(?:demo|demonstration|test|specimen|mock)\b/i.test(value ?? '')
}

export function resolvePacketSealPresentation(input: PacketSealSelectionInput): PacketSealPresentation {
  const actualSealSrc = input.actualSealSrc?.trim() || undefined
  const mockDemoSealSrc = input.mockDemoSealSrc?.trim() || undefined
  const isDemo = Boolean(
    input.explicitDemo ||
    input.credentialIsDemonstration ||
    isDemoCredentialText(input.credentialText),
  )

  if (isDemo) {
    return mockDemoSealSrc
      ? { kind: 'demo', imageSrc: mockDemoSealSrc, notice: DEMO_NOTICE }
      : { kind: 'missing', notice: DEMO_NOTICE }
  }

  if (actualSealSrc) return { kind: 'real', imageSrc: actualSealSrc }
  return { kind: 'missing' }
}

export function paginateAppendixEntries<T extends Pick<ScheduleCBPacketAppendixEntry, 'caption' | 'fileName'>>(
  entries: T[],
): T[][] {
  const pages: T[][] = []
  let pending: T[] = []

  const needsFullPage = (entry: T) => entry.caption.length > 360 || entry.fileName.length > 110

  for (const entry of entries) {
    if (needsFullPage(entry)) {
      if (pending.length > 0) pages.push(pending)
      pages.push([entry])
      pending = []
      continue
    }

    pending.push(entry)
    if (pending.length === 2) {
      pages.push(pending)
      pending = []
    }
  }

  if (pending.length > 0) pages.push(pending)
  return pages
}

export function paginateChecklistItems<T extends Pick<ScheduleCBPacketItemRecord, 'itemLabel' | 'responseNote' | 'ahjNotes'>>(
  items: T[],
): T[][] {
  const pages: T[][] = []
  let page: T[] = []
  let pageWeight = 0
  const pageCapacity = 2500

  for (const item of items) {
    const itemWeight = 420 + item.itemLabel.length + (item.responseNote?.length ?? 0) + (item.ahjNotes?.length ?? 0)
    if (page.length > 0 && pageWeight + itemWeight > pageCapacity) {
      pages.push(page)
      page = []
      pageWeight = 0
    }
    page.push(item)
    pageWeight += itemWeight
  }

  if (page.length > 0) pages.push(page)
  return pages
}
