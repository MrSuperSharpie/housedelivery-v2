// Dev-only route: generate a Schedule C-B packet PDF with dummy Vancouver data
// and return it inline so you can verify the PDF pipeline without a full 15-stage run.
//
// Usage: GET /api/dev-pdf-test  (or /api/dev-pdf-test?variant=form-only)
//
// Blocked in production. No auth, no DB.

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { generateScheduleCBPacket } from '@/lib/pdf/scheduleCBPacketGenerator'
import { generateScheduleCB } from '@/lib/pdf/scheduleCBGenerator'
import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'
import type { ScheduleCBPacketItemRecord, ScheduleCBPacketDocumentRecord } from '@/lib/pdf/scheduleCBPacketTypes'
import type { ScheduleCBOptions } from '@/lib/pdf/scheduleCBGenerator'

const TS = '2026-04-20T10:00:00.000Z'

const REPORT: InspectorCompletionReportRow = {
  id:              'dev-pdf-test-report',
  assignmentId:    'dev-pdf-test-assignment',
  jobId:           'dev-pdf-test-job',
  inspectorId:     'dev-pdf-test-inspector',
  projectId:       'dev-pdf-test-project',
  projectName:     'West 4th Mixed-Use Podium',
  address:         '2288 W 4th Ave',
  city:            'Vancouver',
  region:          'Lower Mainland',
  projectType:     'Mixed-Use',
  currentStage:    15,
  stageCount:      15,
  jurisdictionName: 'City of Vancouver',
  ahjOverlayType:  'vancouver',
  ahjOverlayLabel: 'City of Vancouver (CoV)',
  overlaySnapshot: {
    type:             'vancouver',
    label:            'City of Vancouver (CoV)',
    jurisdictionName: 'City of Vancouver',
    signals:          ['cov_detected'],
    summary:          'City of Vancouver AHJ overlay active. Schedule C-B required for all Part 5 field reviews.',
  },
  checklistSnapshot: [],
  status:          'sealed',
  sealApplied:     true,
  sealReference:   'VERO-IC-2026-DEVTEST',
  sealPayload: {
    overallResult: 'pass',
    sealedAt:      TS,
    sealedBy:      'Dev Test Inspector',
    sealedById:    'dev-pdf-test-inspector',
    stageSignOffs: {},
    holdHistory:   [],
    certifiedLocation: { latitude: 49.2648, longitude: -123.1336 },
  },
  lastSavedAt:  TS,
  submittedAt:  TS,
  createdAt:    TS,
  updatedAt:    TS,
}

const ITEMS: ScheduleCBPacketItemRecord[] = [
  { itemCode: 'S01-01', itemLabel: 'Site Preparation & Layout',       stageNumber: 1,  stageName: 'Site Preparation',       inspectionStatus: 'Passed', responseNote: 'Verified on site — compliant.' },
  { itemCode: 'S02-01', itemLabel: 'Foundation Formwork',              stageNumber: 2,  stageName: 'Foundation',              inspectionStatus: 'Passed', responseNote: 'Formwork dimensions confirmed.' },
  { itemCode: 'S03-01', itemLabel: 'Underground Services',             stageNumber: 3,  stageName: 'Underground Services',    inspectionStatus: 'Passed', responseNote: 'Water, sewer, and drain confirmed.' },
  { itemCode: 'S04-01', itemLabel: 'Framing Inspection',               stageNumber: 4,  stageName: 'Framing',                 inspectionStatus: 'Passed', responseNote: 'Framing complete and compliant.' },
  { itemCode: 'S05-01', itemLabel: 'Roofing & Sheathing',              stageNumber: 5,  stageName: 'Roofing',                 inspectionStatus: 'Passed', responseNote: 'Sheathing and underlayment verified.' },
  { itemCode: 'S06-01', itemLabel: 'Exterior Envelope',                stageNumber: 6,  stageName: 'Exterior Envelope',       inspectionStatus: 'Passed', responseNote: 'WRB and cladding attachment confirmed.' },
  { itemCode: 'S07-01', itemLabel: 'Insulation & Vapour Barrier',      stageNumber: 7,  stageName: 'Insulation',              inspectionStatus: 'Passed', responseNote: 'RSI values and VB continuity confirmed.' },
  { itemCode: 'S08-01', itemLabel: 'Drywall & Fire Separations',       stageNumber: 8,  stageName: 'Drywall',                 inspectionStatus: 'Passed', responseNote: 'Fire-rated assemblies confirmed.' },
  { itemCode: 'S09-01', itemLabel: 'Plumbing Rough-In',                stageNumber: 9,  stageName: 'Plumbing Rough-In',       inspectionStatus: 'Passed', responseNote: 'DWV and supply lines confirmed.' },
  { itemCode: 'S10-01', itemLabel: 'Electrical Rough-In',              stageNumber: 10, stageName: 'Electrical Rough-In',     inspectionStatus: 'Passed', responseNote: 'Panel and branch wiring confirmed.' },
  { itemCode: 'S11-01', itemLabel: 'Mechanical Rough-In',              stageNumber: 11, stageName: 'Mechanical Rough-In',     inspectionStatus: 'Passed', responseNote: 'Ductwork and ventilation confirmed.' },
  { itemCode: 'S12-01', itemLabel: 'Fire Separations Review',          stageNumber: 12, stageName: 'Fire Separations',        inspectionStatus: 'Passed', responseNote: 'Compartmentalization confirmed.' },
  { itemCode: 'S13-01', itemLabel: 'Interior Finishes',                stageNumber: 13, stageName: 'Interior Finishes',       inspectionStatus: 'Passed', responseNote: 'Finish materials confirmed.' },
  { itemCode: 'S14-01', itemLabel: 'Pre-Occupancy Walkthrough',        stageNumber: 14, stageName: 'Pre-Occupancy',           inspectionStatus: 'Passed', responseNote: 'Pre-occupancy checklist complete.' },
  { itemCode: 'S15-01', itemLabel: 'Final Occupancy Inspection',       stageNumber: 15, stageName: 'Final Occupancy',         inspectionStatus: 'Passed', responseNote: 'All 15 stages resolved. Final occupancy issued.' },
]

// Dummy evidence documents with public placeholder image URLs.
// The appendix will render these as linked thumbnails.
const DOCUMENTS: ScheduleCBPacketDocumentRecord[] = [
  {
    id:          'dev-doc-s01',
    itemCode:    'S01-01',
    fileName:    'site_preparation_evidence.jpg',
    storagePath: 'dev/site_preparation_evidence.jpg',
    mimeType:    'image/jpeg',
    createdAt:   TS,
    capturedAt:  TS,
    latitude:    49.2648,
    longitude:   -123.1336,
    imageUrl:    'https://picsum.photos/seed/s01/800/600',
    signedUrl:   'https://picsum.photos/seed/s01/800/600',
  },
  {
    id:          'dev-doc-s04',
    itemCode:    'S04-01',
    fileName:    'framing_inspection_evidence.jpg',
    storagePath: 'dev/framing_inspection_evidence.jpg',
    mimeType:    'image/jpeg',
    createdAt:   TS,
    capturedAt:  TS,
    latitude:    49.2648,
    longitude:   -123.1336,
    imageUrl:    'https://picsum.photos/seed/s04/800/600',
    signedUrl:   'https://picsum.photos/seed/s04/800/600',
  },
  {
    id:          'dev-doc-s15',
    itemCode:    'S15-01',
    fileName:    'final_occupancy_evidence.jpg',
    storagePath: 'dev/final_occupancy_evidence.jpg',
    mimeType:    'image/jpeg',
    createdAt:   TS,
    capturedAt:  TS,
    latitude:    49.2648,
    longitude:   -123.1336,
    imageUrl:    'https://picsum.photos/seed/s15/800/600',
    signedUrl:   'https://picsum.photos/seed/s15/800/600',
  },
]

const OPTIONS: ScheduleCBOptions = {
  inspectorName:        'Dr. Sarah Chen',
  inspectorLicense:     'BC-ENG-29847',
  discipline:           'Structural Engineering',
  firmName:             'Chen Structural Consulting Ltd.',
  inspectorContact:     '604-555-0198  ·  sarah.chen@veropermit.com',
  inspectorAddress:     '1050 West Hastings Street, Suite 2200',
  inspectorAddressCont: 'Vancouver, BC  V6E 2E9',
  buildingPermitNumber: 'BP-DEV-TEST-001',
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const variant = req.nextUrl.searchParams.get('variant') === 'form-only' ? 'form-only' : 'packet'

  try {
    let pdfBytes: Uint8Array

    if (variant === 'form-only') {
      pdfBytes = await generateScheduleCB(REPORT, OPTIONS)
    } else {
      const logoPath = path.join(process.cwd(), 'public', 'vero-permit-light.png')
      const logoBuffer = await readFile(logoPath)
      const brandLogoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`

      pdfBytes = await generateScheduleCBPacket({
        report:              REPORT,
        items:               ITEMS,
        documents:           DOCUMENTS,
        officialFormOptions: OPTIONS,
        brandLogoSrc,
        buildingPermitNumber: OPTIONS.buildingPermitNumber,
        generatedAtIso:      new Date().toISOString(),
        verificationId:      'VERO-IC-2026-DEVTEST',
        exportMode:          'platform_preview',
      })
    }

    const body = Buffer.from(pdfBytes)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'inline; filename="dev-pdf-test.pdf"',
        'Content-Length':      body.byteLength.toString(),
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    console.error('[dev-pdf-test] generation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF generation failed' },
      { status: 500 },
    )
  }
}
