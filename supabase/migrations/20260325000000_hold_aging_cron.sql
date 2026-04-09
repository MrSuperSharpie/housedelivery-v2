-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: hold aging cron engine
--
-- Creates escalate_aged_holds() and schedules it via pg_cron every 15 minutes.
--
-- Constraint enforcement:
--   [C1] escalate_aged_holds() READS expires_at to find aged-out holds.
--        It never computes, writes, or overwrites expires_at. The value was
--        set exclusively by placeHold() in holds.ts at hold creation time.
--        This function is the consumer of [C1], not a writer.
--   [C2] The function does not touch checklist_item_ids. The NOT NULL DEFAULT '{}'
--        constraint on job_holds guarantees it is always a valid array regardless
--        of this function's execution.
--   [C3] This function handles the aging/expiry path only — it sets status to
--        'expired', never 'stopped'. The 'stopped' terminal state is exclusively
--        written by decline_hold_and_stop_job() (defined in the prior migration).
--        These are two distinct state transitions and must never be conflated.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── pg_cron extension ────────────────────────────────────────────────────────
-- pg_cron is pre-installed on Supabase hosted projects.
-- This is a no-op if already enabled.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── escalate_aged_holds() ────────────────────────────────────────────────────
-- Sweeps all open holds whose expiry window has elapsed and marks them expired.
--
-- For each aged hold the function:
--   1. Sets job_holds.status     → 'expired'
--   2. Sets job_holds.expired_at → now()
--   3. Inserts an immutable audit row into job_status_events with
--      reason = 'hold_aged_out' so Admin can surface and act on escalations.
--
-- The job itself stays at 'on_hold' — it does NOT auto-transition to any other
-- job status. Admin must review and decide the next step (reinspection, close,
-- extend). This is intentional: Blueprint §17 requires Admin escalation review,
-- not automatic job state mutation.
--
-- SECURITY DEFINER: runs as the function owner (bypasses RLS) so it can update
-- holds regardless of which auth.uid() the cron worker presents.
--
-- Idempotent: the WHERE status = 'open' guard means re-running on already-expired
-- holds is a no-op.

CREATE OR REPLACE FUNCTION escalate_aged_holds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hold   RECORD;
  v_now    timestamptz := now();
BEGIN
  -- [C1] expires_at is READ here, never written.
  -- We rely on the value set by placeHold() in holds.ts at hold creation time.
  FOR v_hold IN
    SELECT
      h.id          AS hold_id,
      h.job_id,
      h.expires_at,
      j.status      AS job_status
    FROM  job_holds         h
    JOIN  job_opportunities j ON j.id = h.job_id
    WHERE h.status     = 'open'
      AND h.expires_at < v_now   -- [C1] consuming the pre-computed expiry window
    FOR UPDATE OF h             -- lock hold rows; avoids race with concurrent updates
  LOOP

    -- Step 1: mark the hold expired
    -- [C3] status → 'expired', NOT 'stopped'. The 'stopped' path belongs
    --      exclusively to decline_hold_and_stop_job().
    UPDATE job_holds
       SET status     = 'expired',
           expired_at  = v_now,
           updated_at  = v_now
     WHERE id = v_hold.hold_id;

    -- Step 2: immutable audit event
    -- The job remains at 'on_hold' — from_status and to_status both reflect
    -- the current job state. The reason field is the signal for admin querying.
    -- Blueprint Rule 10: every decision must create an immutable audit event.
    INSERT INTO job_status_events (
      job_id,
      actor_id,
      actor_role,
      from_status,
      to_status,
      reason,
      created_at
    ) VALUES (
      v_hold.job_id,
      'system:hold_aging_cron',  -- system actor; no human auth.uid()
      'system',
      v_hold.job_status,         -- current job status at time of expiry (typically 'on_hold')
      v_hold.job_status,         -- job status unchanged — Admin must decide next step
      'hold_aged_out',           -- sentinel reason Admin panel queries on
      v_now
    );

  END LOOP;
END;
$$;

-- ─── Grant execute to postgres role (used by pg_cron worker) ─────────────────

GRANT EXECUTE ON FUNCTION escalate_aged_holds() TO postgres;

-- ─── pg_cron schedule ─────────────────────────────────────────────────────────
-- Runs every 15 minutes. Handles the INSERT idempotently:
--   - Unschedules any prior job with this name before creating a fresh one.
--     This makes the migration re-runnable (e.g. on staging reset) without
--     accumulating duplicate cron entries.
--
-- pg_cron jobs run in the 'postgres' database by default on Supabase.
-- If your project uses a different DB name, update the dbname argument below.

SELECT cron.unschedule('siteline-hold-aging')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'siteline-hold-aging'
  );

SELECT cron.schedule(
  'siteline-hold-aging',       -- unique job name
  '*/15 * * * *',              -- every 15 minutes
  $$ SELECT escalate_aged_holds(); $$
);

-- ─── Verification query (run manually to confirm schedule registered) ─────────
-- SELECT jobid, jobname, schedule, command, active
--   FROM cron.job
--  WHERE jobname = 'siteline-hold-aging';
