/**
 * scheduleCBGenerator.ts
 *
 * Server-side utility that populates a blank Schedule C-B PDF template with
 * data from a sealed InspectorCompletionReportRow and returns the completed
 * document as a Uint8Array (ready for HTTP download or further processing).
 *
 * Usage:
 *   import { generateScheduleCB } from '@/lib/pdf/scheduleCBGenerator'
 *   const bytes = await generateScheduleCB(report, { ... })
 *   // → pipe into NextResponse with Content-Type: application/pdf
 *
 * ⚠️  SERVER-SIDE ONLY — uses Node `fs`. Do not import from any 'use client' module.
 *
 * Template location:
 *   public/templates/Schedule_C-B.pdf
 *
 * Field inventory (extracted via pdf-lib getFields()):
 *
 *   PDFTextField  | Building Permit Number
 *   PDFTextField  | Date
 *   PDFTextField  | Phone Number and Email Address
 *   PDFTextField  | Print name of firm
 *   PDFTextField  | Name of jurisdiction
 *   PDFTextField  | Discipline (e.g. Architectural, etc.)
 *   PDFTextField  | Name of Project
 *   PDFTextField  | Address of Project
 *   PDFTextField  | Name
 *   PDFTextField  | Address
 *   PDFTextField  | Address (cont.)
 *   PDFButton     | Professional's Seal and Signature   ← image widget, skipped
 *   PDFSignature  | CRP's initials                      ← signature widget, skipped
 *
 * Typography enforcement (applied to every filled field):
 *
 *   Font:  Helvetica (StandardFonts.Helvetica, embedded at generation time)
 *   Size:  11pt
 *   Color: rgb(0, 0, 0) — explicit RGB black, written as '0 0 0 rg' in the
 *          widget's /DA stream.
 *
 *   Why the three-step DA approach is necessary:
 *   The template stores '/Helv 0 Tf 0 g' in every field's /DA (font-size 0 =
 *   "auto-fit").  pdf-lib's defaultTextFieldAppearanceProvider reads the WIDGET's
 *   /DA to determine both font size and text colour — the widget value takes full
 *   precedence over the field /DA.  Simply calling setFontSize() only rewrites the
 *   field /DA, which the layout engine ignores because widgetFontSize (0) is not
 *   undefined and therefore wins via nullish-coalescing.  Writing the widget /DA
 *   directly before calling updateAppearances() is the only reliable way to lock
 *   in the desired size and colour.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'

// ─── Typography constants ─────────────────────────────────────────────────────

/** Explicit RGB black — replaces the template's grayscale '0 g' token. */
const BLACK = rgb(0, 0, 0)

/** Font size in points applied to every filled text field. */
const FONT_SIZE = 11

/**
 * The widget-level /DA string we pre-write before calling updateAppearances().
 *
 * Format:  <r> <g> <b> rg\n/<font-resource> <size> Tf
 *
 * '/Helv' is the template's existing Helvetica resource name — it is valid in
 * the document's font resource dictionary and prevents a MissingTfOperatorError
 * from pdf-lib's setFontSize().  After updateAppearances() runs, the reference
 * is replaced with the embedded font's generated name (e.g. '/Helvetica 11 Tf').
 */
const WIDGET_DA =
  `${BLACK.red} ${BLACK.green} ${BLACK.blue} rg\n/Helv ${FONT_SIZE} Tf`

// ─── Field name map ───────────────────────────────────────────────────────────
//
// Exact strings as returned by pdf-lib getFields() on Schedule_C-B.pdf.
//
const FIELD = {
  // Project / permit section
  projectName:          'Name of Project',
  projectAddress:       'Address of Project',
  jurisdiction:         'Name of jurisdiction',
  buildingPermitNumber: 'Building Permit Number',

  // Inspector / RP section
  name:                 'Name',
  firmName:             'Print name of firm',
  discipline:           'Discipline (e.g. Architectural, etc.)',
  address:              'Address',
  addressCont:          'Address (cont.)',
  contact:              'Phone Number and Email Address',

  // Date
  date:                 'Date',

  // Skipped — cannot be filled with setText():
  //   'Professional's Seal and Signature'  → PDFButton  (image widget)
  //   'CRP's initials'                     → PDFSignature
} as const

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Inspector / RP identity fields that live outside the InspectorCompletionReportRow.
 *
 * These come from Supabase user_metadata (resolved by the Route Handler) or
 * from the job record (e.g. buildingPermitNumber).  The caller is responsible
 * for resolving and passing them in.
 *
 * All fields are optional — any that are absent simply leave the corresponding
 * PDF field blank rather than crashing.
 */
export interface ScheduleCBOptions {
  /**
   * Full legal name of the signing inspector / registered professional.
   * Maps to: "Name"
   */
  inspectorName?: string

  /**
   * Licence or registration number issued by the regulatory body
   * (e.g. "BC-ENG-29847").  Appended to the Name field in parentheses
   * because the template has no dedicated licence-number field.
   * Example output: "Dr. Sarah Chen (BC-ENG-29847)"
   */
  inspectorLicense?: string

  /**
   * Registered professional discipline.
   * Maps to: "Discipline (e.g. Architectural, etc.)"
   * Example: "Structural Engineering", "Electrical"
   */
  discipline?: string

  /**
   * Name of the inspector's firm or practice.
   * Maps to: "Print name of firm"
   */
  firmName?: string

  /**
   * Inspector's office mailing address, first line (street).
   * Maps to: "Address"
   */
  inspectorAddress?: string

  /**
   * Inspector's office mailing address, second line (city, province, postal code).
   * Maps to: "Address (cont.)"
   */
  inspectorAddressCont?: string

  /**
   * Inspector's phone number and/or email, combined into one string.
   * Maps to: "Phone Number and Email Address"
   * Example: "604-555-0198  ·  sarah.chen@getvero.ca"
   */
  inspectorContact?: string

  /**
   * Building permit number for the project (lives on the job record, not the
   * report row).  Maps to: "Building Permit Number"
   * Example: "BP-2026-48219"
   */
  buildingPermitNumber?: string
}

/**
 * Loads the blank Schedule C-B template, fills all 11 text fields at 11pt
 * Helvetica in explicit RGB black, flattens the form (so the output PDF cannot
 * be further edited), and returns the result as a Uint8Array.
 *
 * @param report  - An InspectorCompletionReportRow (draft or sealed).
 * @param options - Inspector / permit identity fields (see ScheduleCBOptions).
 * @returns       Promise resolving to the completed PDF as a Uint8Array.
 * @throws        If the template file cannot be read from disk.
 */
export async function generateScheduleCB(
  report: InspectorCompletionReportRow,
  options: ScheduleCBOptions = {},
): Promise<Uint8Array> {

  // ── 1. Load template from disk ─────────────────────────────────────────────
  const templatePath = join(
    process.cwd(),
    'public',
    'templates',
    'Schedule_C-B.pdf',
  )

  let templateBytes: Buffer
  try {
    templateBytes = readFileSync(templatePath)
  } catch {
    throw new Error(
      `[scheduleCBGenerator] Schedule C-B template not found at:\n  ${templatePath}\n` +
      'Place the blank AcroForm PDF at public/templates/Schedule_C-B.pdf.',
    )
  }

  // ── 2. Parse, get form handle, embed font ──────────────────────────────────
  const pdfDoc       = await PDFDocument.load(templateBytes)
  const form         = pdfDoc.getForm()
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // ── 3. fill() helper ───────────────────────────────────────────────────────
  //
  // Three-step typography enforcement per field:
  //
  //   a) setText()       — write the value
  //   b) setFontSize()   — updates the acroField /DA (required to avoid
  //                        MissingTfOperatorError; also keeps the field /DA
  //                        in sync with the widget /DA for PDF readers that
  //                        prefer the field-level entry)
  //   c) widget /DA      — pre-write the widget's /DA with WIDGET_DA so that
  //                        defaultTextFieldAppearanceProvider reads
  //                        widgetFontSize=11 and widgetColor=rgb(0,0,0).
  //                        Without this, the widget's original '0 Tf' wins via
  //                        nullish-coalescing and triggers auto-sizing.
  //   d) updateAppearances() — rebuilds the appearance stream using the
  //                        embedded font at the size/colour read from the
  //                        widget /DA; final widget /DA becomes
  //                        '0 0 0 rg\n/Helvetica 11 Tf'.
  //
  function fill(fieldName: string, value: string | undefined | null): void {
    if (value == null || value === '') return
    try {
      const field = form.getTextField(fieldName)

      // a) value
      field.setText(value)

      // b) acroField /DA font size (mutates the Tf token in place via regex)
      field.setFontSize(FONT_SIZE)

      // c) widget /DA — explicit RGB black + 11pt, overrides the template's
      //    auto-size '0 Tf' and grayscale '0 g' tokens
      field.acroField.getWidgets().forEach(w =>
        w.setDefaultAppearance(WIDGET_DA)
      )

      // d) rebuild appearance stream with embedded Helvetica
      field.updateAppearances(helveticaFont)
    } catch (err) {
      console.warn(
        `[scheduleCBGenerator] Could not fill "${fieldName}" — skipped.`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  // ── 4. Derive composite / formatted values ─────────────────────────────────

  // Project address — combine available parts
  const projectAddress = [report.address, report.city, report.region]
    .filter(Boolean)
    .join(', ')

  // AHJ label — prefer explicit jurisdictionName, fall back to overlay label
  const jurisdiction = report.jurisdictionName ?? report.ahjOverlayLabel

  // Date — use submittedAt when sealed, fall back to today in Vancouver time
  const sealIso = report.submittedAt ?? new Date().toISOString()
  const dateFmt = new Date(sealIso).toLocaleDateString('en-CA', {
    year:     'numeric',
    month:    'long',
    day:      'numeric',
    timeZone: 'America/Vancouver',
  })

  // "Name" field — append licence number in parentheses if provided.
  // The template has no dedicated licence field; this is standard practice
  // on BC Schedule C forms.
  const nameWithLicense = options.inspectorName
    ? options.inspectorLicense
      ? `${options.inspectorName} (${options.inspectorLicense})`
      : options.inspectorName
    : options.inspectorLicense
      ? `(${options.inspectorLicense})`
      : undefined

  // ── 5. Fill all 11 text fields ─────────────────────────────────────────────
  fill(FIELD.projectName,          report.projectName)
  fill(FIELD.projectAddress,       projectAddress)
  fill(FIELD.jurisdiction,         jurisdiction)
  fill(FIELD.buildingPermitNumber, options.buildingPermitNumber)
  fill(FIELD.date,                 dateFmt)
  fill(FIELD.name,                 nameWithLicense)
  fill(FIELD.firmName,             options.firmName)
  fill(FIELD.discipline,           options.discipline)
  fill(FIELD.address,              options.inspectorAddress)
  fill(FIELD.addressCont,          options.inspectorAddressCont)
  fill(FIELD.contact,              options.inspectorContact)

  // ── 6. Flatten form ────────────────────────────────────────────────────────
  // Bakes all appearance streams into the page content and removes the
  // AcroForm layer — the output PDF is read-only for recipients.
  form.flatten()

  // ── 7. Serialize ───────────────────────────────────────────────────────────
  return pdfDoc.save()
}
