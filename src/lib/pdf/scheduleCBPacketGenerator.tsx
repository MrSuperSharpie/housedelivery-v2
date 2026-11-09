import React from 'react'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { ScheduleCBPacketDocument } from './ScheduleCBPacketDocument'
import { buildScheduleCBPacketData } from './scheduleCBPacketHelpers'
import type { ScheduleCBPacketData, ScheduleCBPacketSource } from './scheduleCBPacketTypes'
import { paginateAppendixEntries } from './scheduleCBPacketPresentation'
import { renderHtmlToPdf } from './playwrightPdf'
import { generateScheduleCB } from './scheduleCBGenerator'

async function loadBrandLogoDataUri(): Promise<string> {
  const logoPath = path.join(process.cwd(), 'public', 'vero-permit-light.png')
  const buffer = await readFile(logoPath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

async function loadPngDataUri(relativePath: string): Promise<string> {
  const buffer = await readFile(path.join(process.cwd(), 'public', relativePath))
  return `data:image/png;base64,${buffer.toString('base64')}`
}

async function renderPacketSectionHtml(
  data: ScheduleCBPacketData,
  section: 'cover' | 'trail' | 'appendix',
  appendixPageIndex?: number,
): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  return `<!DOCTYPE html>${renderToStaticMarkup(
    <ScheduleCBPacketDocument data={data} section={section} appendixPageIndex={appendixPageIndex} />
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
  const [brandLogoSrc, fieldNoteImageSrc, videoImageSrc, mockDemoSealSrc] = await Promise.all([
    source.brandLogoSrc ? Promise.resolve(source.brandLogoSrc) : loadBrandLogoDataUri(),
    source.presentationAssets?.fieldNoteImageSrc
      ? Promise.resolve(source.presentationAssets.fieldNoteImageSrc)
      : loadPngDataUri('pdf-assets/field-note-evidence.png'),
    source.presentationAssets?.videoImageSrc
      ? Promise.resolve(source.presentationAssets.videoImageSrc)
      : loadPngDataUri('pdf-assets/video-evidence.png'),
    source.presentationAssets?.mockDemoSealSrc
      ? Promise.resolve(source.presentationAssets.mockDemoSealSrc)
      : loadPngDataUri('pdf-assets/mock-demo-seal.png'),
  ])
  const packetSource: ScheduleCBPacketSource = {
    ...source,
    brandLogoSrc,
    presentationAssets: {
      ...source.presentationAssets,
      fieldNoteImageSrc,
      videoImageSrc,
      mockDemoSealSrc,
    },
  }
  const packetData = buildScheduleCBPacketData(packetSource)
  const statutoryOptions = {
    ...source.officialFormOptions,
    sealImageSrc: packetData.seal.imageSrc,
  }

  const appendixPageCount = Math.max(1, paginateAppendixEntries(packetData.appendixEntries).length)
  const [coverPdf, statutoryPdf, trailPdf, appendixPdfs] = await Promise.all([
    renderPacketSectionHtml(packetData, 'cover').then(renderHtmlToPdf),
    generateScheduleCB(source.report, statutoryOptions),
    renderPacketSectionHtml(packetData, 'trail').then(renderHtmlToPdf),
    Promise.all(
      Array.from({ length: appendixPageCount }, (_, pageIndex) =>
        renderPacketSectionHtml(packetData, 'appendix', pageIndex).then(renderHtmlToPdf),
      ),
    ),
  ])

  return mergePdfDocuments([coverPdf, statutoryPdf, trailPdf, ...appendixPdfs])
}
