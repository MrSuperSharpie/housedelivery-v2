import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const WORKSPACE = readFileSync(
  new URL('../components/inspector/InspectorCompletionWorkspace.tsx', import.meta.url),
  'utf8',
)
const GLOBALS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('tablet inspection workspace does not reserve a sidebar column when guide is closed', () => {
  assert.match(WORKSPACE, /flex flex-col gap-6 xl:flex-row xl:items-start/)
  assert.match(WORKSPACE, /block md:hidden xl:block/)
  assert.match(WORKSPACE, /completion-shell/)
  assert.match(WORKSPACE, /completion-tablet-guide-rail/)
  assert.match(WORKSPACE, /completion-main-workspace/)
  assert.doesNotMatch(WORKSPACE, /flex flex-col gap-6 lg:flex-row lg:items-start/)
  assert.doesNotMatch(WORKSPACE, /lg:w-\[300px\] lg:flex-none/)
  assert.doesNotMatch(WORKSPACE, /completion-tablet-guide-trigger/)
})

test('tablet inspection guide can open and close as a split panel', () => {
  assert.match(WORKSPACE, /const \[tabletGuideOpen, setTabletGuideOpen\] = useState\(false\)/)
  assert.match(WORKSPACE, /Inspection guide/)
  assert.match(WORKSPACE, /onClick=\{\(\) => setTabletGuideOpen\(\(open\) => !open\)\}/)
  assert.match(WORKSPACE, /onClick=\{\(\) => setTabletGuideOpen\(false\)\}/)
  assert.match(WORKSPACE, /aria-label="Close inspection guide"/)
  assert.match(WORKSPACE, /aria-controls="inspection-guide-panel"/)
  assert.match(WORKSPACE, /<aside id="inspection-guide-panel" aria-label="Inspection guide"/)
  assert.match(WORKSPACE, /completion-guide-panel-open/)
  assert.doesNotMatch(WORKSPACE, /fixed inset-0 z-40 hidden bg-slate-950\/70/)
  assert.doesNotMatch(WORKSPACE, /completion-guide-drawer-open/)
})

test('main inspection workspace expands on tablet while desktop sidebar remains sticky', () => {
  assert.match(WORKSPACE, /<section className="completion-main-workspace space-y-5 xl:min-w-0 xl:flex-1">/)
  assert.match(WORKSPACE, /xl:w-\[300px\] xl:flex-none/)
  assert.match(WORKSPACE, /xl:sticky xl:top-4 xl:self-start/)
  assert.doesNotMatch(WORKSPACE, /<section className="space-y-5 lg:min-w-0 lg:flex-1">/)
})

test('wide touch-capable iPad uses split panel layout instead of xl sticky sidebar', () => {
  assert.match(GLOBALS, /@media \(min-width: 768px\) and \(pointer: coarse\), \(min-width: 768px\) and \(hover: none\)/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-shell[\s\S]*flex-direction: row !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-shell[\s\S]*overflow-x: clip !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-tablet-guide-rail[\s\S]*display: flex !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-tablet-guide-rail\[aria-expanded='true'\][\s\S]*display: none !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-sidebar:not\(\.completion-guide-panel-open\)[\s\S]*display: none !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-sidebar\.completion-guide-panel-open[\s\S]*position: sticky !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-sidebar\.completion-guide-panel-open[\s\S]*flex: 0 0 clamp\(280px, 34vw, 360px\) !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-main-workspace[\s\S]*width: auto !important/)
  assert.doesNotMatch(GLOBALS, /\.completion-workspace \.completion-sidebar\.completion-guide-panel-open[\s\S]*position: fixed !important/)
})

test('tablet guide does not render a modal backdrop or blocking layer', () => {
  assert.doesNotMatch(WORKSPACE, /completion-tablet-guide-backdrop/)
  assert.doesNotMatch(WORKSPACE, /bg-slate-950\/70/)
  assert.doesNotMatch(GLOBALS, /completion-tablet-guide-backdrop/)
  assert.doesNotMatch(GLOBALS, /z-index: 50 !important/)
})

test('wide fine-pointer desktop keeps the sticky sidebar contract', () => {
  assert.match(WORKSPACE, /xl:flex-row xl:items-start/)
  assert.match(WORKSPACE, /xl:w-\[300px\] xl:flex-none/)
  assert.match(WORKSPACE, /xl:sticky xl:top-4 xl:self-start/)
  assert.doesNotMatch(GLOBALS, /@media \(min-width: 768px\) and \(\(pointer: fine\), \(hover: hover\)\)[\s\S]*completion-sidebar[\s\S]*display: none/)
})

test('tablet guide toggle does not key or conditionally mount the inspection section', () => {
  assert.doesNotMatch(WORKSPACE, /key=\{tabletGuideOpen\}/)
  assert.doesNotMatch(WORKSPACE, /tabletGuideOpen \? <section/)
  assert.match(WORKSPACE, /<section className="completion-main-workspace space-y-5 xl:min-w-0 xl:flex-1">/)
  assert.match(WORKSPACE, /<aside id="inspection-guide-panel" aria-label="Inspection guide" className=\{`completion-sidebar/)
})

test('phone layout keeps the inline inspection guide and is not intentionally targeted', () => {
  assert.match(WORKSPACE, /block md:hidden xl:block/)
  assert.match(WORKSPACE, /hidden min-h-\[64px\][\s\S]*md:flex xl:hidden/)
  assert.doesNotMatch(WORKSPACE, /sm:hidden xl:block/)
})

test('tablet portrait and landscape avoid horizontal page overflow', () => {
  assert.match(GLOBALS, /\.completion-workspace \.completion-shell[\s\S]*overflow-x: clip !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-main-workspace[\s\S]*min-width: 0 !important/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-main-workspace[\s\S]*max-width: 100% !important/)
  assert.match(GLOBALS, /@media \(min-width: 768px\) and \(max-width: 900px\) and \(pointer: coarse\)/)
  assert.match(GLOBALS, /\.completion-workspace \.completion-sidebar\.completion-guide-panel-open[\s\S]*width: min\(42vw, 320px\) !important/)
})

test('tablet guide supports Escape without refetching workspace data', () => {
  assert.match(WORKSPACE, /closeTabletGuideOnEscape/)
  assert.match(WORKSPACE, /event\.key === 'Escape'/)
  assert.doesNotMatch(WORKSPACE, /loadWorkspace[\s\S]{0,120}tabletGuideOpen/)
})
