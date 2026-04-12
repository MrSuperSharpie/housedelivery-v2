export const SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST = {
  packetTemplateVersion: 'schedule-cb-packet/v1',
  statutoryTemplateVersion: 'schedule-cb-form/bc-template-repo-copy/v1',
  statutoryTemplatePath: 'public/templates/Schedule_C-B.pdf',
  complianceTodos: [
    'Compliance TODO: confirm the statutory Schedule C-B PDF in public/templates/Schedule_C-B.pdf matches the current AHJ-approved revision before production issuance.',
    'Compliance TODO: verify the final inspector title, discipline, and firm-name formatting against the governing professional practice guidance for the issuing jurisdiction.',
    'Compliance TODO: confirm document retention and verification-ID policy for the audit-trail and appendix pages before external circulation.',
  ],
} as const

export type ScheduleCBPacketTemplateManifest = typeof SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST
