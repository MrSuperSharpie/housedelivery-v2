import React from 'react'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { ScheduleCBPacketDocument } from './ScheduleCBPacketDocument'
import { buildScheduleCBPacketData } from './scheduleCBPacketHelpers'
import type { ScheduleCBPacketSource } from './scheduleCBPacketTypes'
import { renderHtmlToPdf } from './playwrightPdf'
import { generateScheduleCB } from './scheduleCBGenerator'

async function loadBrandLogoDataUri(): Promise<string> {
  const logoPath = path.join(process.cwd(), 'public', 'vero-logo-dark.png')
  const buffer = await readFile(logoPath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

async function renderPacketSectionHtml(source: ScheduleCBPacketSource, section: 'cover' | 'trail'): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const packetData = buildScheduleCBPacketData(source)
  packetData.brandLogoSrc = source.brandLogoSrc ?? await loadBrandLogoDataUri()
  return `<!DOCTYPE html>${renderToStaticMarkup(
    <ScheduleCBPacketDocument data={packetData} section={section} />
  )}`
}

async function mergePdfDocuments(parts: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()

  for (const part of parts) {
    const pdf = await PDFDocument.load(part)
    const copiedPages = await merged.copyPages(pdf, pdf.getPageIndices())
    copiedPages.forEach(page => merged.addPage(page))
  }

  return merged.save()
}

export async function generateScheduleCBPacket(source: ScheduleCBPacketSource): Promise<Uint8Array> {
  const [coverPdf, statutoryPdf, trailPdf] = await Promise.all([
    renderPacketSectionHtml(source, 'cover').then(renderHtmlToPdf),
    generateScheduleCB(source.report, source.officialFormOptions),
    renderPacketSectionHtml(source, 'trail').then(renderHtmlToPdf),
  ])

  return mergePdfDocuments([coverPdf, statutoryPdf, trailPdf])
}
