import { createClient } from '@/lib/supabase/client'
import type {
  NotificationDeliveryStatusUpdate,
  ReliabilityNotificationEventDraft,
} from '@/lib/reliabilityNotifications'

const supabase = createClient()

export async function enqueueReliabilityNotification(
  draft: ReliabilityNotificationEventDraft,
): Promise<{ ok: boolean; id?: string; error?: string }> {
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

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: typeof data?.id === 'string' ? data.id : undefined }
}

export async function logNotificationDeliveryStatus(
  update: NotificationDeliveryStatusUpdate,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('notification_events')
    .update({
      status: update.status,
      delivery_attempted_at: update.attemptedAt,
      sent_at: update.status === 'sent' ? update.attemptedAt : null,
      error: update.error ?? null,
    })
    .eq('id', update.notificationId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
