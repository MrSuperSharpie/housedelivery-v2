'use strict'

/**
 * Patch inspector 7c1e372a-0dd7-4dd4-9083-37826a6b05f4 with full disciplines,
 * regions, and all 6 role lanes. Also diagnoses why selectInspectorEligibility
 * returns null by running the exact same SELECT the frontend uses.
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL      = 'https://llbcoqdtuvbwamptzipo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYmNvcWR0dXZid2FtcHR6aXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzg0MTEsImV4cCI6MjA4NTExNDQxMX0.hWCybwfggQNi__o0Neh6EnpOu2tDfvrZ2MmFIMRsaBw'

const TARGET_USER_ID = '7c1e372a-0dd7-4dd4-9083-37826a6b05f4'

const ALL_DISCIPLINES = [
  'structural', 'geotech', 'electrical', 'mechanical', 'plumbing', 'architectural',
]
const ALL_REGIONS = [
  'vancouver', 'burnaby', 'richmond', 'surrey', 'coquitlam',
]
const ALL_LANES = [
  'permit_coordinator_non_signing',
  'architect',
  'engineer',
  'certified_professional',
  'electrical_fsr',
  'official_authority',
]

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('Target user_id:', TARGET_USER_ID)
  console.log('═══════════════════════════════════════════════════════\n')

  // ── Step 1: Read current row before touching it ───────────────────────────
  console.log('── Step 1: Read current row (simple select) ────────────')
  const { data: before, error: beforeErr } = await supabase
    .from('inspector_onboarding_status')
    .select('user_id, status, disciplines, regions, requested_role_lanes, approved_role_lanes, updated_at')
    .eq('user_id', TARGET_USER_ID)
    .maybeSingle()

  if (beforeErr) {
    console.error('Simple select FAILED:', beforeErr.message)
    console.error('Details:', JSON.stringify(beforeErr))
  } else if (!before) {
    console.log('No row found for this user_id — will INSERT via upsert')
  } else {
    console.log('Current row:')
    console.log('  status             :', before.status)
    console.log('  disciplines        :', JSON.stringify(before.disciplines))
    console.log('  regions            :', JSON.stringify(before.regions))
    console.log('  approved_role_lanes:', JSON.stringify(before.approved_role_lanes))
    console.log('  updated_at         :', before.updated_at)
  }

  // ── Step 2: Run the EXACT select that selectInspectorEligibility uses ─────
  console.log('\n── Step 2: Exact frontend SELECT (with reviewer_note etc) ─')
  const fullSelectCols = 'user_id, status, disciplines, regions, requested_role_lanes, approved_role_lanes, license_number, credential_expires_at, updated_at, reviewer_note'
  const { data: fullRow, error: fullErr } = await supabase
    .from('inspector_onboarding_status')
    .select(fullSelectCols)
    .eq('user_id', TARGET_USER_ID)
    .maybeSingle()

  if (fullErr) {
    console.error('❌ FULL SELECT failed — this is why selectInspectorEligibility returns null!')
    console.error('   Error:', fullErr.message)
    console.error('   Code :', fullErr.code)

    // Diagnose which column is missing
    console.log('\n── Step 2b: Column probe ────────────────────────────────')
    const candidates = [
      'reviewer_note',
      'license_number',
      'credential_expires_at',
      'requested_role_lanes',
      'approved_role_lanes',
      'disciplines',
      'regions',
    ]
    for (const col of candidates) {
      const { error: colErr } = await supabase
        .from('inspector_onboarding_status')
        .select(`user_id, ${col}`)
        .eq('user_id', TARGET_USER_ID)
        .maybeSingle()
      if (colErr) {
        console.log(`  ✗ Column "${col}" → ERROR: ${colErr.message}`)
      } else {
        console.log(`  ✓ Column "${col}" → OK`)
      }
    }
  } else {
    console.log('✓ Full select succeeded — row data:')
    console.log(JSON.stringify(fullRow, null, 2))
  }

  // ── Step 3: Force upsert with all correct values ──────────────────────────
  console.log('\n── Step 3: Upsert with correct disciplines / regions / lanes ─')
  const payload = {
    user_id:              TARGET_USER_ID,
    status:               'approved',
    disciplines:          ALL_DISCIPLINES,
    regions:              ALL_REGIONS,
    requested_role_lanes: ALL_LANES,
    approved_role_lanes:  ALL_LANES,
    updated_at:           new Date().toISOString(),
  }
  console.log('Payload:', JSON.stringify(payload, null, 2))

  const { error: upsertErr } = await supabase
    .from('inspector_onboarding_status')
    .upsert(payload, { onConflict: 'user_id' })

  if (upsertErr) {
    console.error('\n❌ UPSERT FAILED:', upsertErr.message)
    console.error('   Code:', upsertErr.code)
    process.exit(1)
  }
  console.log('✓ Upsert accepted by Supabase')

  // ── Step 4: Verify with the same simple select ────────────────────────────
  console.log('\n── Step 4: Verify after upsert ─────────────────────────')
  const { data: after, error: afterErr } = await supabase
    .from('inspector_onboarding_status')
    .select('user_id, status, disciplines, regions, requested_role_lanes, approved_role_lanes, updated_at')
    .eq('user_id', TARGET_USER_ID)
    .maybeSingle()

  if (afterErr || !after) {
    console.error('Verification read failed:', afterErr?.message)
    process.exit(1)
  }

  console.log('\n✓ Verified row in DB:')
  console.log('  status             :', after.status)
  console.log('  disciplines        :', JSON.stringify(after.disciplines))
  console.log('  regions            :', JSON.stringify(after.regions))
  console.log('  requested_role_lanes:', JSON.stringify(after.requested_role_lanes))
  console.log('  approved_role_lanes :', JSON.stringify(after.approved_role_lanes))
  console.log('  updated_at         :', after.updated_at)

  const discsOk = ALL_DISCIPLINES.every(d => after.disciplines?.includes(d))
  const regsOk  = ALL_REGIONS.every(r => after.regions?.includes(r))
  const lanesOk = ALL_LANES.every(l => after.approved_role_lanes?.includes(l))
  console.log('\n  disciplines complete :', discsOk ? '✓ YES' : '✗ NO — STILL WRONG')
  console.log('  regions complete     :', regsOk  ? '✓ YES' : '✗ NO — STILL WRONG')
  console.log('  all lanes approved   :', lanesOk ? '✓ YES' : '✗ NO — STILL WRONG')

  if (discsOk && regsOk && lanesOk) {
    console.log('\n✅ DB is fully patched.')
    console.log('   If selectInspectorEligibility still returned null above (Step 2),')
    console.log('   that SELECT query is failing due to a missing column.')
    console.log('   See the column probe output above for which column to add.')
  } else {
    console.log('\n❌ DB values do not match expected — something blocked the write.')
  }
}

run().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
