import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { normalizeInspectorFirmName } from './inspectorFirm'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

test('normalizes a loaded inspector firm and omits missing values', () => {
  assert.equal(normalizeInspectorFirmName('  Brown Plumbing Ltd.  '), 'Brown Plumbing Ltd.')
  assert.equal(normalizeInspectorFirmName('   '), undefined)
  assert.equal(normalizeInspectorFirmName(null), undefined)
  assert.equal(normalizeInspectorFirmName(undefined), undefined)
})

test('inspector UI shows the loaded company directly beneath the inspector name', () => {
  const workspace = read('src/components/inspector/InspectorCompletionWorkspace.tsx')
  assert.match(workspace, /normalizeInspectorFirmName\(activeUser\?\.company\)/)
  assert.match(
    workspace,
    /activeUser\?\.name[\s\S]*inspectorFirmName \? \([\s\S]*data-inspector-firm[\s\S]*\{inspectorFirmName\}/,
  )
})

test('PDF uses profiles.firm_name and omits an empty firm row', () => {
  const route = read('src/app/api/schedule-cb/route.ts')
  const document = read('src/lib/pdf/ScheduleCBPacketDocument.tsx')
  const helpers = read('src/lib/pdf/scheduleCBPacketHelpers.ts')

  assert.match(route, /select\('first_name, last_name, inspector_license_no, firm_name'\)/)
  assert.match(route, /normalizeInspectorFirmName\(profileRow\?\.firm_name\)/)
  assert.match(helpers, /firmName: normalizeInspectorFirmName\(source\.officialFormOptions\.firmName\)/)
  assert.match(document, /data\.auditTrail\.firmName \? \([\s\S]*<td>Firm<\/td>[\s\S]*\{data\.auditTrail\.firmName\}/)
  assert.doesNotMatch(document, /data\.auditTrail\.firmName \?\? 'Not provided'/)
})
