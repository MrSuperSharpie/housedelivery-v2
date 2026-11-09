import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildNotificationDeliveryStatusUpdate,
  buildReliabilityNotificationEvent,
  type ReliabilityNotificationChannel,
  type ReliabilityNotificationContext,
  type ReliabilityNotificationTemplateKey,
} from '@/lib/reliabilityNotifications'
import type { UserRole } from '@/lib/auth'

interface EnqueueReliabilityNotificationBody {
  templateKey: ReliabilityNotificationTemplateKey
  recipientUserId?: string
  recipientRole: Extract<UserRole, 'inspector' | 'builder' | 'admin'>
  channel?: ReliabilityNotificationChannel
  context?: ReliabilityNotificationContext
  scheduledFor?: string
}

interface DeliveryStatusBody {
  notificationId: string
  status: 'queued' | 'sent' | 'failed' | 'skipped'
  error?: string
}

export async function POST(req: NextRequest) {
  let body: EnqueueReliabilityNotificationBody
  try {
    body = await req.json() as EnqueueReliabilityNotificationBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.templateKey || !body.recipientRole) {
    return NextResponse.json({ ok: false, error: 'templateKey and recipientRole are required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const actorRole = readRole(authData.user?.app_metadata, authData.user?.user_metadata)

  let draft
  try {
    draft = buildReliabilityNotificationEvent({
      templateKey: body.templateKey,
      recipientUserId: body.recipientUserId,
      recipientRole: body.recipientRole,
      channel: body.channel ?? 'in_app',
      context: body.context ?? {},
      scheduledFor: body.scheduledFor,
      actorRole,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Notification rejected.' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('notification_events')
    .insert({
      event_key: draft.eventKey,
      recipient_user_id: draft.recipientUserId ?? null,
      recipient_role: draft.recipientRole,
      channel: draft.channel,
      status: draft.status,
      payload: draft.payload,
      scheduled_for: draft.scheduledFor,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[notifications/reliability] insert failed', { templateKey: body.templateKey, error: error.message })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, notificationId: data?.id, template: draft.payload })
}

export async function PATCH(req: NextRequest) {
  let body: DeliveryStatusBody
  try {
    body = await req.json() as DeliveryStatusBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  let update
  try {
    update = buildNotificationDeliveryStatusUpdate({
      notificationId: body.notificationId,
      status: body.status,
      error: body.error,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Invalid status update.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notification_events')
    .update({
      status: update.status,
      delivery_attempted_at: update.attemptedAt,
      sent_at: update.status === 'sent' ? update.attemptedAt : null,
      error: update.error ?? null,
    })
    .eq('id', update.notificationId)

  if (error) {
    console.error('[notifications/reliability] status update failed', { notificationId: body.notificationId, error: error.message })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: update.status })
}

function readRole(
  appMetadata?: Record<string, unknown>,
  userMetadata?: Record<string, unknown>,
): UserRole | null {
  const role = appMetadata?.role ?? userMetadata?.role
  return role === 'admin' || role === 'builder' || role === 'inspector' || role === 'auditor'
    ? role
    : null
}
