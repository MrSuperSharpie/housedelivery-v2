import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

test('builder Manage Request modal uses theme-aware contrast classes', () => {
  const source = read('app/builder/page.tsx')
  const modalStart = source.indexOf('title="Manage Request"')
  assert.notEqual(modalStart, -1, 'Manage Request modal must exist')

  const modalBlock = source.slice(modalStart, source.indexOf('<DispatchModal', modalStart))
  assert.ok(modalBlock.includes('themed'), 'Manage Request modal must use the theme-aware modal surface')
  assert.ok(modalBlock.includes('text-ink'), 'Manage Request modal must use tokenized readable text')
  assert.ok(modalBlock.includes('text-muted'), 'Manage Request modal must use tokenized muted text')
  assert.ok(!modalBlock.includes('text-white'), 'Manage Request modal must not rely on white text over light theme cards')
  assert.ok(!modalBlock.includes('text-slate-300'), 'Manage Request modal must not rely on slate-dark text in light mode')
})

test('shared Modal exposes a token-based themed surface for app dashboards', () => {
  const source = read('components/ui/Modal.tsx')
  assert.ok(source.includes('themed?: boolean'), 'Modal must support a scoped themed mode')
  assert.ok(source.includes('border border-rim bg-panel text-ink shadow-card'), 'themed Modal must use app theme tokens')
})

test('role dashboard sidebar restores restrained premium selected-nav and icon-badge treatment', () => {
  const source = read('components/shared/DashboardSidebar.tsx')
  assert.ok(
    source.includes('bg-[linear-gradient(135deg,rgba(198,161,91,0.16),rgba(198,161,91,0.06))]'),
    'selected role nav item must have a restrained brass gradient highlight',
  )
  assert.ok(source.includes('flex h-8 w-8'), 'role nav icons must render inside stable badge containers')
  assert.ok(source.includes('border-[#C6A15B]/30 bg-[#C6A15B]/10'), 'active/action icon badges must carry subtle brass styling')
})

test('builder and inspector metric cards carry shared restrained brass polish hooks', () => {
  const builderStrip = read('components/builder/SituationStrip.tsx')
  const inspectorPage = read('app/inspector/page.tsx')

  assert.ok(builderStrip.includes('border-gold-gradient'), 'builder metric cards must expose the restrained brass border treatment')
  assert.ok(builderStrip.includes('hover:shadow-lift'), 'builder metric cards must lift subtly on interaction')
  assert.ok(inspectorPage.includes('border-gold-gradient'), 'inspector metric cards must expose the restrained brass border treatment')
  assert.ok(inspectorPage.includes('hover:shadow-lift'), 'inspector metric cards must lift subtly on interaction')
})
