# Attendance Confirmation Ladder

Vero Permit creates six `job_attendance_confirmations` rows when an inspector claims a scheduled inspection:

1. `initial_claim`
2. `t_24h`
3. `t_4h`
4. `t_90m`
5. `departure`
6. `arrival`

The claim RPC also schedules `notification_events` reminders for the timed checkpoints. The reminder copy is:

> Please reconfirm your Vero inspection appointment. Reliable attendance improves your Vero tier, job access, and payout speed.

## Background Processor

No dedicated scheduler exists in this repo. Wire a cron or queue worker to call:

```sql
select public.process_due_attendance_confirmations(now());
```

Run it every 1-5 minutes. The function marks due missed checkpoints, records reliability events, queues admin alerts, prepares standby search, and requests standby activation only when the active reliability policy has:

```json
{ "standbyActivationEnabled": true }
```

## Confirmation API

Dashboards and authenticated notification links can post to:

```http
POST /api/jobs/attendance-confirmations
```

The route calls `record_job_attendance_confirmation`, which validates inspector identity or the confirmation token, records departure/arrival state, emits reliability events, and flags manual arrival evidence when geolocation is unavailable or outside the project proximity threshold.
