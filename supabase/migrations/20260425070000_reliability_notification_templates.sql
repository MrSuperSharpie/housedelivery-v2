-- Reliability notification templates and delivery audit support.
--
-- The existing notification_events table remains the queue. Templates are
-- stored in payload JSON for renderer/worker consumption so email and in-app
-- delivery can use the same calm, role-safe copy.

alter table public.notification_events
  add column if not exists delivery_attempted_at timestamptz,
  add column if not exists template_key text;

create index if not exists idx_notification_events_template_key
  on public.notification_events(template_key, status, created_at desc);

create or replace function public.resolve_reliability_notification_template(
  p_template_key text
)
returns jsonb
language plpgsql
stable
as $$
begin
  return case p_template_key
    when 'inspector.claim_confirmed' then jsonb_build_object(
      'recipientRole', 'inspector',
      'subject', 'Inspection claimed — professional commitment confirmed',
      'body', 'You have claimed this inspection. Please attend at the scheduled time, complete required evidence, and reconfirm when prompted. Reliable attendance improves your Vero tier, job access, and payout speed.',
      'deepLinkPath', '/inspector'
    )
    when 'inspector.reconfirmation_24h' then jsonb_build_object(
      'recipientRole', 'inspector',
      'subject', 'Reconfirm your Vero inspection',
      'body', 'Please reconfirm your appointment. Reliable attendance protects the builder’s schedule and strengthens your Vero tier.',
      'deepLinkPath', '/inspector'
    )
    when 'inspector.reconfirmation_4h' then jsonb_build_object(
      'recipientRole', 'inspector',
      'subject', 'Action required — inspection reconfirmation',
      'body', 'Please reconfirm your inspection. Missing this checkpoint may trigger Admin review or standby support.',
      'deepLinkPath', '/inspector'
    )
    when 'inspector.reconfirmation_90m' then jsonb_build_object(
      'recipientRole', 'inspector',
      'subject', 'Final confirmation required',
      'body', 'Please confirm you are still attending. If you are unable to attend, submit a structured cancellation immediately.',
      'deepLinkPath', '/inspector'
    )
    when 'inspector.invalid_cancellation_notice' then jsonb_build_object(
      'recipientRole', 'inspector',
      'subject', 'Cancellation under review',
      'body', 'This cancellation occurred inside the protected appointment window and may affect your reliability record. You may submit additional context for Admin review.',
      'deepLinkPath', '/inspector'
    )
    when 'inspector.protected_cancellation_notice' then jsonb_build_object(
      'recipientRole', 'inspector',
      'subject', 'Cancellation recorded as protected',
      'body', 'This cancellation has been recorded as protected. Your reliability tier will not be materially affected.',
      'deepLinkPath', '/inspector'
    )
    when 'inspector.tier_improvement' then jsonb_build_object(
      'recipientRole', 'inspector',
      'subject', 'Your Vero tier improved',
      'body', 'Your reliability record has moved you into a higher tier, giving you stronger access to priority work and payout benefits.',
      'deepLinkPath', '/inspector'
    )
    when 'builder.inspector_assigned' then jsonb_build_object(
      'recipientRole', 'builder',
      'subject', 'Your Vero inspection is assigned',
      'body', 'A qualified inspector has claimed your inspection. Vero will monitor confirmation checkpoints ahead of the appointment.',
      'deepLinkPath', '/builder'
    )
    when 'builder.appointment_confirmed' then jsonb_build_object(
      'recipientRole', 'builder',
      'subject', 'Your inspection is confirmed',
      'body', 'Your inspector has reconfirmed attendance. Your escrow remains protected through the Vero workflow.',
      'deepLinkPath', '/builder'
    )
    when 'builder.appointment_at_risk' then jsonb_build_object(
      'recipientRole', 'builder',
      'subject', 'Vero is monitoring your inspection',
      'body', 'We are monitoring your inspection appointment. If the assigned inspector becomes unavailable, Vero will begin reassignment support.',
      'deepLinkPath', '/builder'
    )
    when 'builder.reassignment_started' then jsonb_build_object(
      'recipientRole', 'builder',
      'subject', 'Vero has begun reassignment support',
      'body', 'The assigned inspector is no longer available. Vero is prioritizing qualified backup inspectors to protect your schedule.',
      'deepLinkPath', '/builder'
    )
    when 'builder.no_show_recovery' then jsonb_build_object(
      'recipientRole', 'builder',
      'subject', 'Vero is resolving your inspection appointment',
      'body', 'Your escrow remains protected while Vero reviews the missed appointment and begins recovery steps.',
      'deepLinkPath', '/builder'
    )
    when 'admin.missed_4h_confirmation' then jsonb_build_object(
      'recipientRole', 'admin',
      'subject', 'Missed 4-hour confirmation',
      'body', 'An inspector missed the 4-hour confirmation checkpoint. Review appointment risk and standby readiness.',
      'deepLinkPath', '/admin/reliability',
      'internalOnly', true
    )
    when 'admin.missed_90m_confirmation' then jsonb_build_object(
      'recipientRole', 'admin',
      'subject', 'Missed 90-minute confirmation',
      'body', 'An inspector missed the final confirmation checkpoint. Review standby activation and builder recovery status.',
      'deepLinkPath', '/admin/reliability',
      'internalOnly', true
    )
    when 'admin.no_show_detected' then jsonb_build_object(
      'recipientRole', 'admin',
      'subject', 'No-show detected',
      'body', 'A possible no-show has been detected. Review attendance evidence, payout hold status, and recovery actions.',
      'deepLinkPath', '/admin/reliability',
      'internalOnly', true
    )
    when 'admin.cancellation_review_required' then jsonb_build_object(
      'recipientRole', 'admin',
      'subject', 'Cancellation review required',
      'body', 'A cancellation requires Admin classification. Review reason, evidence, protected-window status, and reassignment needs.',
      'deepLinkPath', '/admin/reliability',
      'internalOnly', true
    )
    when 'admin.payout_blocked' then jsonb_build_object(
      'recipientRole', 'admin',
      'subject', 'Payout blocked',
      'body', 'A job payout is blocked or pending review. Review reliability events, disputes, evidence status, and policy configuration.',
      'deepLinkPath', '/admin/reliability',
      'internalOnly', true
    )
    when 'admin.standby_activation_failed' then jsonb_build_object(
      'recipientRole', 'admin',
      'subject', 'Standby activation failed',
      'body', 'Standby activation did not produce an accepted backup inspector. Review manual reassignment options and builder communications.',
      'deepLinkPath', '/admin/reliability',
      'internalOnly', true
    )
    when 'admin.reliability_threshold_breached' then jsonb_build_object(
      'recipientRole', 'admin',
      'subject', 'Inspector reliability threshold breached',
      'body', 'An inspector crossed a reliability review threshold. Review recent events, credential status, payout controls, and any active appeals.',
      'deepLinkPath', '/admin/reliability',
      'internalOnly', true
    )
    else null
  end;
end;
$$;

create or replace function public.enqueue_reliability_notification(
  p_template_key text,
  p_recipient_user_id uuid,
  p_recipient_role text,
  p_channel text default 'in_app',
  p_context jsonb default '{}'::jsonb,
  p_scheduled_for timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template jsonb;
  v_notification_id uuid;
  v_deep_link text;
begin
  v_template := public.resolve_reliability_notification_template(p_template_key);

  if v_template is null then
    return jsonb_build_object('ok', false, 'error', 'Unknown reliability notification template.');
  end if;

  if p_recipient_role <> v_template ->> 'recipientRole' then
    return jsonb_build_object('ok', false, 'error', 'Recipient role is not permitted for this template.');
  end if;

  if p_channel not in ('email', 'in_app', 'sms', 'push') then
    return jsonb_build_object('ok', false, 'error', 'Unsupported notification channel.');
  end if;

  v_deep_link := v_template ->> 'deepLinkPath';

  insert into public.notification_events (
    event_key,
    template_key,
    recipient_user_id,
    recipient_role,
    channel,
    status,
    payload,
    scheduled_for
  )
  values (
    p_template_key,
    p_template_key,
    p_recipient_user_id,
    p_recipient_role,
    p_channel,
    'queued',
    jsonb_build_object(
      'templateKey', p_template_key,
      'subject', v_template ->> 'subject',
      'body', v_template ->> 'body',
      'deepLink', v_deep_link,
      'context', coalesce(p_context, '{}'::jsonb),
      'internalOnly', coalesce((v_template ->> 'internalOnly')::boolean, false)
    ),
    p_scheduled_for
  )
  returning id into v_notification_id;

  return jsonb_build_object('ok', true, 'notificationId', v_notification_id);
end;
$$;

create or replace function public.mark_notification_delivery_status(
  p_notification_id uuid,
  p_status text,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('queued', 'sent', 'failed', 'skipped') then
    return jsonb_build_object('ok', false, 'error', 'Unsupported notification status.');
  end if;

  update public.notification_events
  set
    status = p_status,
    delivery_attempted_at = now(),
    sent_at = case when p_status = 'sent' then now() else sent_at end,
    error = p_error
  where id = p_notification_id;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

grant execute on function public.resolve_reliability_notification_template(text) to authenticated;
grant execute on function public.enqueue_reliability_notification(text, uuid, text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.mark_notification_delivery_status(uuid, text, text) to authenticated;
