import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const WORKSPACE = readFileSync(
  new URL('../components/inspector/InspectorCompletionWorkspace.tsx', import.meta.url),
  'utf8',
)

test('tablet inspection workspace does not reserve a sidebar column when guide is closed', () => {
  assert.match(WORKSPACE, /flex flex-col gap-6 xl:flex-row xl:items-start/)
  assert.match(WORKSPACE, /block md:hidden xl:block/)
  assert.doesNotMatch(WORKSPACE, /flex flex-col gap-6 lg:flex-row lg:items-start/)
  assert.doesNotMatch(WORKSPACE, /lg:w-\[300px\] lg:flex-none/)
})

test('tablet inspection guide can open and close as a drawer', () => {
  assert.match(WORKSPACE, /const \[tabletGuideOpen, setTabletGuideOpen\] = useState\(false\)/)
  assert.match(WORKSPACE, /Inspection guide/)
  assert.match(WORKSPACE, /onClick=\{\(\) => setTabletGuideOpen\(true\)\}/)
  assert.match(WORKSPACE, /onClick=\{\(\) => setTabletGuideOpen\(false\)\}/)
  assert.match(WORKSPACE, /aria-label="Close inspection guide"/)
  assert.match(WORKSPACE, /fixed inset-0 z-40 hidden bg-slate-950\/70/)
})

test('main inspection workspace expands on tablet while desktop sidebar remains sticky', () => {
  assert.match(WORKSPACE, /<section className="space-y-5 xl:min-w-0 xl:flex-1">/)
  assert.match(WORKSPACE, /xl:w-\[300px\] xl:flex-none/)
  assert.match(WORKSPACE, /xl:sticky xl:top-4 xl:self-start/)
  assert.doesNotMatch(WORKSPACE, /<section className="space-y-5 lg:min-w-0 lg:flex-1">/)
})

test('tablet guide toggle does not key or conditionally mount the inspection section', () => {
  assert.doesNotMatch(WORKSPACE, /key=\{tabletGuideOpen\}/)
  assert.doesNotMatch(WORKSPACE, /tabletGuideOpen \? <section/)
  assert.match(WORKSPACE, /<section className="space-y-5 xl:min-w-0 xl:flex-1">/)
})

test('phone layout keeps the inline inspection guide and is not intentionally targeted', () => {
  assert.match(WORKSPACE, /block md:hidden xl:block/)
  assert.match(WORKSPACE, /hidden min-h-\[48px\][\s\S]*md:flex xl:hidden/)
  assert.doesNotMatch(WORKSPACE, /sm:hidden xl:block/)
})

test('tablet guide supports Escape without refetching workspace data', () => {
  assert.match(WORKSPACE, /closeTabletGuideOnEscape/)
  assert.match(WORKSPACE, /event\.key === 'Escape'/)
  assert.doesNotMatch(WORKSPACE, /loadWorkspace[\s\S]{0,120}tabletGuideOpen/)
})
