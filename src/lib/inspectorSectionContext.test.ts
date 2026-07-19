import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { getActiveInspectorSectionCode } from './inspectorSectionContext'

const workspaceSource = readFileSync(
  join(process.cwd(), 'src/components/inspector/InspectorCompletionWorkspace.tsx'),
  'utf8',
)

test('active section follows the last section that reaches the sticky anchor', () => {
  assert.equal(getActiveInspectorSectionCode([
    { code: 'S09-01', top: -900 },
    { code: 'S09-02', top: 80 },
    { code: 'S09-03', top: 760 },
  ]), 'S09-02')

  assert.equal(getActiveInspectorSectionCode([
    { code: 'S09-01', top: -1600 },
    { code: 'S09-02', top: -700 },
    { code: 'S09-03', top: 100 },
    { code: 'S09-04', top: 900 },
  ]), 'S09-03')
})

test('sticky current-section context renders existing section data and progress', () => {
  assert.match(workspaceSource, /aria-label="Current checklist section"/)
  assert.match(workspaceSource, /activeSection\.item_code/)
  assert.match(workspaceSource, /activeSection\.item_label/)
  assert.match(workspaceSource, /Item \{activeSectionIndex \+ 1\} of \{stageItems\.length\}/)
  assert.doesNotMatch(workspaceSource, /SECTION_(?:TITLE|LABEL)_MAP/)
})

test('Back to section top uses the existing section element reference', () => {
  assert.match(workspaceSource, /Back to section top/)
  assert.match(workspaceSource, /stageItemRefs\.current\[activeSection\.item_code\]/)
  assert.match(workspaceSource, /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/)
})
