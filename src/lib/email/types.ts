export type VeroEmailEventKey =
  | 'inspector.application_submitted'
  | 'inspector.approved'
  | 'inspector.needs_info'
  | 'builder.profile_submitted'
  | 'builder.approved'
  | 'builder.needs_info'
  | 'inspection.request_submitted'
  | 'inspection.claimed_builder_notice'
  | 'inspection.claimed_inspector_notice'
  | 'inspection.passed_builder_notice'
  | 'inspection.modification_required'
  | 'hold.issued_builder_notice'
  | 'hold.issued_inspector_confirmation'
  | 'hold.response_submitted_inspector_notice'
  | 'hold.released_builder_notice'
  | 'hold.needs_info_builder_notice'
  | 'final_record.ready'
  | 'schedule_cb.generated'
  | 'admin.inspector_application_submitted'
  | 'admin.builder_profile_submitted'
  | 'admin.hold_issued'

export type VeroEmailTemplateContext = {
  recipientName?: string
  projectName?: string
  inspectionType?: string
  inspectorName?: string
  builderName?: string
  jurisdiction?: string
  reviewerNote?: string
  holdReason?: string
  ctaUrl?: string
  ctaLabel?: string
  details?: string[]
}

export type VeroEmailTemplateInput = VeroEmailTemplateContext & {
  eventKey: VeroEmailEventKey
}

export type VeroEmailTemplateContent = {
  subject: string
  preview: string
  heading: string
  body: string[]
  ctaLabel?: string
}

export type RenderedVeroEmail = {
  eventKey: VeroEmailEventKey
  subject: string
  html: string
  text: string
}

export type SendVeroEmailOptions = VeroEmailTemplateInput & {
  to: string | string[]
  throwOnError?: boolean
}

export type VeroEmailSendResult =
  | {
      ok: true
      id?: string
      eventKey: VeroEmailEventKey
    }
  | {
      ok: false
      eventKey: VeroEmailEventKey
      code: 'missing_api_key' | 'send_failed' | 'unexpected_error'
      error: string
      providerError?: unknown
    }
