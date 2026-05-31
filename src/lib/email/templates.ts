import type {
  RenderedVeroEmail,
  VeroEmailEventKey,
  VeroEmailTemplateContent,
  VeroEmailTemplateContext,
  VeroEmailTemplateInput,
} from './types'

const footerText =
  'This is an operational notification from Vero Permit about your account, inspection request, or project record. If you believe you received this in error, contact admin@veropermit.com.'

const templates: Record<VeroEmailEventKey, (context: VeroEmailTemplateContext) => VeroEmailTemplateContent> = {
  'inspector.application_submitted': context => ({
    subject: 'Your Vero Permit inspector application was received',
    preview: 'Your inspector application is queued for review.',
    heading: 'Inspector application received',
    body: [
      greeting(context, 'Thank you for submitting your Vero Permit inspector application.'),
      'We\'ve received your information and our team will review your credentials, trade discipline, service region, and supporting details before activating your profile.',
      'If anything is missing or needs clarification, we\'ll contact you with the next steps. Once approved, you\'ll be able to receive eligible inspection opportunities through Vero.',
      'Thank you for helping build a faster, more accountable inspection pathway for builders, professionals, and communities.',
    ],
    ctaLabel: 'View your application',
  }),
  'inspector.approved': context => ({
    subject: 'Your Vero Permit platform access is approved',
    preview: 'Your inspector profile is ready for eligible inspection opportunities.',
    heading: 'Platform access approved',
    body: [
      greeting(context, 'Your Vero Permit inspector profile has been approved for platform access.'),
      'You can now review eligible inspection requests based on your credentials, service region, and project requirements.',
      'Please keep your profile current so builders and admins can rely on accurate availability and credential records.',
    ],
    ctaLabel: 'Open Vero Permit',
  }),
  'inspector.needs_info': context => ({
    subject: 'More information is needed for your Vero Permit profile',
    preview: 'Please review the requested profile information.',
    heading: 'Profile information requested',
    body: withReviewerNote(context, [
      greeting(context, 'We need a little more information before your inspector profile can move forward.'),
      'Please review the request and upload or update the required information when you are ready.',
      'Once submitted, the Vero Permit team will continue the review of your platform access.',
    ]),
    ctaLabel: 'Update your profile',
  }),
  'builder.profile_submitted': context => ({
    subject: 'Your Vero Permit builder profile was received',
    preview: 'Your builder profile is queued for review.',
    heading: 'Builder profile received',
    body: [
      greeting(context, 'Thank you for submitting your Vero Permit builder profile.'),
      'We\'ve received your information and our team will review your company details before activating your builder account.',
      'If anything is missing or needs clarification, we\'ll contact you with the next steps. Once approved, you\'ll be able to request inspections, manage project records, and keep your permit pathway moving with greater visibility.',
      'Thank you for helping modernize the inspection process for builders, professionals, and communities.',
    ],
    ctaLabel: 'View your profile',
  }),
  'builder.approved': context => ({
    subject: 'Your Vero Permit builder access is approved',
    preview: 'Your builder profile is ready for project activity.',
    heading: 'Builder access approved',
    body: [
      greeting(context, 'Your Vero Permit builder profile has been approved for platform access.'),
      'You can now prepare project records and submit inspection requests through the governed Vero Permit workflow.',
      'Use complete project details and clear evidence to help inspectors and reviewers move efficiently.',
    ],
    ctaLabel: 'Open Vero Permit',
  }),
  'builder.needs_info': context => ({
    subject: 'More information is needed for your Vero Permit builder profile',
    preview: 'Please review the requested builder profile information.',
    heading: 'Builder profile information requested',
    body: withReviewerNote(context, [
      greeting(context, 'We need a little more information before your builder profile can move forward.'),
      'Please review the request and update the required account or project readiness details.',
      'After you submit the update, the Vero Permit team will continue the review.',
    ]),
    ctaLabel: 'Update your profile',
  }),
  'inspection.request_submitted': context => ({
    subject: 'Inspection request submitted',
    preview: 'Your inspection request is now in the Vero Permit workflow.',
    heading: 'Inspection request submitted',
    body: [
      greeting(context, 'Your inspection request has been submitted.'),
      projectSentence(context, 'The request is now part of the Vero Permit dispatch workflow.'),
      'Eligible inspectors can be matched based on credential requirements, availability, and project details.',
    ],
    ctaLabel: 'View inspection request',
  }),
  'inspection.claimed_builder_notice': context => ({
    subject: 'Your inspection request has been claimed',
    preview: 'An inspector has accepted the inspection request.',
    heading: 'Inspection claimed',
    body: [
      greeting(context, 'An eligible inspector has accepted your inspection request.'),
      inspectorSentence(context, 'The assigned inspector will use the project record and submitted evidence to prepare for the visit.'),
      'Please keep site access details, timing, and required documentation current in the project record.',
    ],
    ctaLabel: 'View inspection details',
  }),
  'inspection.claimed_inspector_notice': context => ({
    subject: 'Inspection assignment confirmed',
    preview: 'Your accepted inspection assignment is ready for preparation.',
    heading: 'Inspection assignment confirmed',
    body: [
      greeting(context, 'Your inspection assignment is confirmed.'),
      projectSentence(context, 'Please review the project record, scope, site details, and evidence before attending.'),
      'Complete documentation supports a defensible inspection record regardless of the inspection outcome.',
    ],
    ctaLabel: 'Review assignment',
  }),
  'inspection.passed_builder_notice': context => ({
    subject: 'Inspection record updated',
    preview: 'The inspection record has been updated with the documented result.',
    heading: 'Inspection record updated',
    body: [
      greeting(context, 'The inspection record has been updated with a documented Pass result.'),
      projectSentence(context, 'The project record now includes the inspection outcome and supporting evidence captured in Vero Permit.'),
      'Please review the record and keep any related project documentation available for future reference.',
    ],
    ctaLabel: 'View project record',
  }),
  'inspection.modification_required': context => ({
    subject: 'Modification required for inspection record',
    preview: 'The inspection record includes items that need action.',
    heading: 'Modification required',
    body: [
      greeting(context, 'The inspection record has been updated with a Modification Required result.'),
      projectSentence(context, 'Please review the documented items and complete the requested updates before moving forward.'),
      'The project record will remain clearer and more defensible when updates, evidence, and responses are kept in one place.',
    ],
    ctaLabel: 'Review required modifications',
  }),
  'hold.issued_builder_notice': context => ({
    subject: 'HOLD issued to protect the project record',
    preview: 'A HOLD has been added so the project record can be clarified.',
    heading: 'HOLD issued',
    body: withHoldReason(context, [
      greeting(context, 'A HOLD has been issued to protect the project record while an item is clarified.'),
      projectSentence(context, 'Please review the HOLD details and provide the requested response or evidence.'),
      'This helps keep the record complete, traceable, and ready for review.',
    ]),
    ctaLabel: 'Respond to HOLD',
  }),
  'hold.issued_inspector_confirmation': context => ({
    subject: 'HOLD issuance confirmed',
    preview: 'The HOLD has been recorded in the project workflow.',
    heading: 'HOLD recorded',
    body: withHoldReason(context, [
      greeting(context, 'The HOLD has been recorded in Vero Permit.'),
      projectSentence(context, 'The builder will be asked to provide the requested response or evidence.'),
      'Your documented reason and supporting context are now part of the project record.',
    ]),
    ctaLabel: 'View HOLD record',
  }),
  'hold.response_submitted_inspector_notice': context => ({
    subject: 'Builder response submitted for HOLD',
    preview: 'A builder response is ready for review.',
    heading: 'HOLD response submitted',
    body: [
      greeting(context, 'A builder response has been submitted for the HOLD.'),
      projectSentence(context, 'Please review the response and supporting evidence in the project record.'),
      'When the record is complete, update the HOLD status through the Vero Permit workflow.',
    ],
    ctaLabel: 'Review response',
  }),
  'hold.released_builder_notice': context => ({
    subject: 'HOLD released for project record',
    preview: 'The HOLD has been released and the project record was updated.',
    heading: 'HOLD released',
    body: [
      greeting(context, 'The HOLD has been released.'),
      projectSentence(context, 'The project record has been updated with the reviewed response and current status.'),
      'Please continue using the project record for future inspection evidence and communication.',
    ],
    ctaLabel: 'View project record',
  }),
  'hold.needs_info_builder_notice': context => ({
    subject: 'More information is needed for the HOLD response',
    preview: 'Please review the requested HOLD response details.',
    heading: 'More information requested',
    body: withReviewerNote(context, [
      greeting(context, 'More information is needed before the HOLD can be resolved.'),
      projectSentence(context, 'Please review the request and add the missing response or evidence to the project record.'),
      'A complete response helps keep the record clear and ready for review.',
    ]),
    ctaLabel: 'Update HOLD response',
  }),
  'final_record.ready': context => ({
    subject: 'Final project record is ready',
    preview: 'The final project record is ready for review.',
    heading: 'Final project record ready',
    body: [
      greeting(context, 'The final project record is ready in Vero Permit.'),
      projectSentence(context, 'The record includes the available inspection documentation, evidence, and project history captured through the platform.'),
      'Please review the record and keep it available for your project files.',
    ],
    ctaLabel: 'View final record',
  }),
  'schedule_cb.generated': context => ({
    subject: 'Schedule C-B platform packet generated',
    preview: 'The Schedule C-B platform packet is ready in the project record.',
    heading: 'Schedule C-B platform packet generated',
    body: [
      greeting(context, 'The Schedule C-B platform packet has been generated.'),
      projectSentence(context, 'The packet is available in the project record with the related audit trail and evidence appendix.'),
      'Please review the packet carefully and keep the project record current if additional evidence is added.',
    ],
    ctaLabel: 'View Schedule C-B packet',
  }),
  'admin.inspector_application_submitted': context => ({
    subject: 'Inspector application submitted',
    preview: 'An inspector application is ready for admin review.',
    heading: 'Inspector application ready for review',
    body: [
      adminGreeting(context, 'An inspector application has been submitted.'),
      inspectorSentence(context, 'Review the profile, credentials, documents, and service region before changing platform access.'),
      'Use reviewer notes for any requested follow-up so the applicant receives a clear next step.',
    ],
    ctaLabel: 'Review application',
  }),
  'admin.builder_profile_submitted': context => ({
    subject: 'Builder profile submitted',
    preview: 'A builder profile is ready for admin review.',
    heading: 'Builder profile ready for review',
    body: [
      adminGreeting(context, 'A builder profile has been submitted.'),
      builderSentence(context, 'Review the account details and project readiness information before approving platform access.'),
      'Use reviewer notes for any requested follow-up so the builder receives a clear next step.',
    ],
    ctaLabel: 'Review builder profile',
  }),
  'admin.hold_issued': context => ({
    subject: 'HOLD issued on project record',
    preview: 'A HOLD was issued and may need admin visibility.',
    heading: 'HOLD issued',
    body: withHoldReason(context, [
      adminGreeting(context, 'A HOLD has been issued on a project record.'),
      projectSentence(context, 'Review the HOLD reason, assignment context, and any required follow-up.'),
      'This notification is for operational visibility and does not change enforcement status by itself.',
    ]),
    ctaLabel: 'Review HOLD',
  }),
}

export const veroEmailTemplateKeys = Object.keys(templates) as VeroEmailEventKey[]

export function renderVeroEmail(input: VeroEmailTemplateInput): RenderedVeroEmail {
  const content = templates[input.eventKey](input)
  const ctaLabel = input.ctaLabel ?? content.ctaLabel
  const html = renderHtml(content, input, ctaLabel)
  const text = renderText(content, input, ctaLabel)

  return {
    eventKey: input.eventKey,
    subject: content.subject,
    html,
    text,
  }
}

function renderHtml(
  content: VeroEmailTemplateContent,
  context: VeroEmailTemplateContext,
  ctaLabel?: string
): string {
  const bodyHtml = content.body
    .map(paragraph => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65;">${escapeHtml(paragraph)}</p>`)
    .join('')
  const detailHtml = context.details?.length
    ? `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin:22px 0;background:#f8fafc;">
        <p style="margin:0 0 10px;color:#0f172a;font-size:13px;font-weight:700;">Key details</p>
        <ul style="margin:0;padding-left:18px;color:#334155;font-size:14px;line-height:1.6;">
          ${context.details.map(detail => `<li>${escapeHtml(detail)}</li>`).join('')}
        </ul>
      </div>`
    : ''
  const ctaHtml = context.ctaUrl && ctaLabel
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 4px;">
        <tr>
          <td style="border-radius:8px;background:#f97316;">
            <a href="${escapeAttribute(context.ctaUrl)}" style="display:inline-block;padding:12px 18px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
          </td>
        </tr>
      </table>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(content.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${escapeHtml(content.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;margin:0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dbe3ef;">
            <tr>
              <td style="background:#0a192f;padding:26px 30px;">
                <p style="margin:0;color:#f97316;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Vero Permit</p>
                <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;line-height:1.5;">Operational project and account notification</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <h1 style="margin:0 0 18px;color:#0f172a;font-size:24px;line-height:1.25;font-weight:800;">${escapeHtml(content.heading)}</h1>
                ${bodyHtml}
                ${detailHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#0a192f;padding:20px 30px;border-top:4px solid #f97316;">
                <p style="margin:0;color:#cbd5e1;font-size:12px;line-height:1.6;">${escapeHtml(footerText)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function renderText(
  content: VeroEmailTemplateContent,
  context: VeroEmailTemplateContext,
  ctaLabel?: string
): string {
  return [
    'Vero Permit',
    '',
    content.heading,
    '',
    ...content.body.flatMap(paragraph => [paragraph, '']),
    ...(context.details?.length ? ['Key details:', ...context.details.map(detail => `- ${detail}`), ''] : []),
    ...(context.ctaUrl && ctaLabel ? [`${ctaLabel}: ${context.ctaUrl}`, ''] : []),
    footerText,
  ].join('\n').trim()
}

function greeting(context: VeroEmailTemplateContext, fallback: string): string {
  return context.recipientName ? `Hi ${context.recipientName}, ${fallback}` : fallback
}

function adminGreeting(context: VeroEmailTemplateContext, fallback: string): string {
  return context.recipientName ? `Hi ${context.recipientName}, ${fallback}` : fallback
}

function projectSentence(context: VeroEmailTemplateContext, fallback: string): string {
  return context.projectName ? `Project: ${context.projectName}. ${fallback}` : fallback
}

function inspectorSentence(context: VeroEmailTemplateContext, fallback: string): string {
  return context.inspectorName ? `Inspector: ${context.inspectorName}. ${fallback}` : fallback
}

function builderSentence(context: VeroEmailTemplateContext, fallback: string): string {
  return context.builderName ? `Builder: ${context.builderName}. ${fallback}` : fallback
}

function withReviewerNote(context: VeroEmailTemplateContext, body: string[]): string[] {
  return context.reviewerNote ? [...body, `Reviewer note: ${context.reviewerNote}`] : body
}

function withHoldReason(context: VeroEmailTemplateContext, body: string[]): string[] {
  return context.holdReason ? [...body, `HOLD reason: ${context.holdReason}`] : body
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#96;')
}
