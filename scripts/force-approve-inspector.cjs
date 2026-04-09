/**
 * One-shot script: force-approve all role lanes for a specific inspector.
 *
 * Usage:
 *   node scripts/force-approve-inspector.cjs
 *
 * What it does:
 *   1. Looks up the inspector's user_id via the `profiles` table (email column).
 *      Falls back to listing all inspector_onboarding_status rows and printing
 *      their UUIDs if the profiles lookup returns nothing (so you can supply
 *      the UUID manually via INSPECTOR_USER_ID env var).
 *   2. Upserts inspector_onboarding_status with:
 *        status              = 'approved'
 *        requested_role_lanes = all 6 lanes
 *        approved_role_lanes  = all 6 lanes
 */

'use strict'

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL     = 'https://llbcoqdtuvbwamptzipo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYmNvcWR0dXZid2FtcHR6aXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mzg0MTEsImV4cCI6MjA4NTExNDQxMX0.hWCybwfggQNi__o0Neh6EnpOu2tDfvrZ2MmFIMRsaBw'

const TARGET_EMAIL = 'edavis+inspector@animalmarketing.com'

const ALL_LANES = [
  'permit_coordinator_non_signing',
  'architect',
  'engineer',
  'certified_professional',
  'electrical_fsr',
  'official_authority',
]

const ALL_DISCIPLINES = [
  'structural',
  'geotech',
  'electrical',
  'mechanical',
  'plumbing',
  'architectural',
]

const ALL_REGIONS = [
  'vancouver',
  'burnaby',
  'richmond',
  'surrey',
  'coquitlam',
]

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  let userId = process.env.INSPECTOR_USER_ID ?? null

  // ── Step 1: resolve user UUID ────────────────────────────────────────────────
  if (!userId) {
    console.log(`Looking up UUID for ${TARGET_EMAIL} via profiles table…`)
    const { data: profileRows, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', TARGET_EMAIL)
      .limit(5)

    if (profileErr) {
      console.warn('profiles lookup error:', profileErr.message)
    } else if (profileRows && profileRows.length > 0) {
      userId = profileRows[0].id
      console.log('Found via profiles:', userId)
    }
  }

  if (!userId) {
    console.log('profiles lookup returned nothing. Listing all inspector_onboarding_status rows…')
    const { data: allRows, error: listErr } = await supabase
      .from('inspector_onboarding_status')
      .select('user_id, status, updated_at')
      .order('updated_at', { ascending: false })

    if (listErr) {
      console.error('Could not list inspector_onboarding_status:', listErr.message)
      process.exit(1)
    }

    if (!allRows || allRows.length === 0) {
      console.log('No rows found in inspector_onboarding_status.')
      console.log('If this is a new account, sign up first, then re-run.')
      process.exit(1)
    }

    console.log('\nRows in inspector_onboarding_status:')
    allRows.forEach(r => console.log(`  user_id=${r.user_id}  status=${r.status}  updated=${r.updated_at}`))
    console.log('\nRe-run with the correct UUID:')
    console.log(`  INSPECTOR_USER_ID=<uuid> node scripts/force-approve-inspector.cjs`)
    process.exit(0)
  }

  // ── Step 2: upsert all lanes approved ────────────────────────────────────────
  console.log(`\nPatching user_id=${userId}…`)

  const payload = {
    user_id:              userId,
    status:               'approved',
    disciplines:          ALL_DISCIPLINES,
    regions:              ALL_REGIONS,
    requested_role_lanes: ALL_LANES,
    approved_role_lanes:  ALL_LANES,
    updated_at:           new Date().toISOString(),
  }

  const { error: upsertErr } = await supabase
    .from('inspector_onboarding_status')
    .upsert(payload, { onConflict: 'user_id' })

  if (upsertErr) {
    console.error('Upsert failed:', upsertErr.message)
    process.exit(1)
  }

  // ── Step 3: verify ───────────────────────────────────────────────────────────
  const { data: verify, error: verifyErr } = await supabase
    .from('inspector_onboarding_status')
    .select('user_id, status, disciplines, regions, approved_role_lanes, updated_at')
    .eq('user_id', userId)
    .single()

  if (verifyErr || !verify) {
    console.warn('Upsert succeeded but verification read failed:', verifyErr?.message)
    process.exit(0)
  }

  console.log('\n✓ Done.')
  console.log('  user_id            :', verify.user_id)
  console.log('  status             :', verify.status)
  console.log('  disciplines        :', JSON.stringify(verify.disciplines))
  console.log('  regions            :', JSON.stringify(verify.regions))
  console.log('  approved_role_lanes:', JSON.stringify(verify.approved_role_lanes))
  console.log('  updated_at         :', verify.updated_at)
}

run().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
