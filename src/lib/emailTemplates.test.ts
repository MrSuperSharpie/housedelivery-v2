import assert from 'node:assert/strict'
import test from 'node:test'

import {
  renderVeroEmail,
  VERO_EMAIL_LOGO_HEIGHT,
  VERO_EMAIL_LOGO_URL,
  VERO_EMAIL_LOGO_WIDTH,
  veroEmailTemplateKeys,
} from './email/templates'
import type { VeroEmailTemplateInput } from './email/types'

const representativeEmails: Array<{
  input: VeroEmailTemplateInput
  subject: string
  heading: string
  unchangedCopy: string
}> = [
  {
    input: {
      eventKey: 'inspection.passed_builder_notice',
      recipientName: 'Maya',
      projectName: 'Harbour View',
      ctaUrl: 'https://veropermit.com/builder/project/inspection-record',
    },
    subject: 'Inspection record updated',
    heading: 'Inspection record updated',
    unchangedCopy: 'The inspection record has been updated with a documented Pass result.',
  },
  {
    input: {
      eventKey: 'builder.profile_submitted',
      recipientName: 'Jordan',
      ctaUrl: 'https://veropermit.com/builder/onboarding',
    },
    subject: 'Your Vero Permit builder profile was received',
    heading: 'Builder profile received',
    unchangedCopy: 'Thank you for submitting your Vero Permit builder profile.',
  },
  {
    input: {
      eventKey: 'inspection.claimed_inspector_notice',
      recipientName: 'Avery',
      projectName: 'Harbour View',
      ctaUrl: 'https://veropermit.com/inspector/assignment/inspection-record',
    },
    subject: 'Inspection assignment confirmed',
    heading: 'Inspection assignment confirmed',
    unchangedCopy: 'Your inspection assignment is confirmed.',
  },
  {
    input: {
      eventKey: 'admin.builder_profile_submitted',
      recipientName: 'Admin',
      builderName: 'Coastal Developments',
      ctaUrl: 'https://veropermit.com/admin/builders',
    },
    subject: 'Builder profile submitted',
    heading: 'Builder profile ready for review',
    unchangedCopy: 'A builder profile has been submitted.',
  },
]

test('every shared operational email uses the official absolute Vero Permit PNG', () => {
  assert.match(VERO_EMAIL_LOGO_URL, /^https:\/\/veropermit\.com\/.+\.png$/)

  for (const eventKey of veroEmailTemplateKeys) {
    const rendered = renderVeroEmail({ eventKey })

    assert.match(rendered.html, new RegExp(`src="${VERO_EMAIL_LOGO_URL}"`), eventKey)
    assert.match(rendered.html, /alt="Vero Permit"/, eventKey)
    assert.match(rendered.html, new RegExp(`width="${VERO_EMAIL_LOGO_WIDTH}"`), eventKey)
    assert.match(rendered.html, new RegExp(`height="${VERO_EMAIL_LOGO_HEIGHT}"`), eventKey)
    assert.match(rendered.html, /style="display:block;/, eventKey)
    assert.match(rendered.html, /max-width:100%;height:auto;/, eventKey)
  }
})

test('shared header keeps visible brand text and descriptor when remote images are blocked', () => {
  const rendered = renderVeroEmail({ eventKey: 'inspection.passed_builder_notice' })

  assert.match(rendered.html, />Vero Permit<\/p>/)
  assert.match(rendered.html, />Operational project and account notification<\/p>/)
  assert.match(rendered.text, /^Vero Permit$/m)
})

test('representative inspection, builder, inspector, and admin emails preserve content and CTA links', () => {
  for (const sample of representativeEmails) {
    const rendered = renderVeroEmail(sample.input)

    assert.equal(rendered.subject, sample.subject)
    assert.ok(rendered.html.includes(`>${sample.heading}</h1>`), sample.input.eventKey)
    assert.ok(rendered.html.includes(sample.unchangedCopy), sample.input.eventKey)
    assert.match(rendered.html, new RegExp(`href="${sample.input.ctaUrl}"`), sample.input.eventKey)
    assert.ok(rendered.text.includes(sample.unchangedCopy), sample.input.eventKey)
    assert.ok(rendered.text.includes(sample.input.ctaUrl ?? ''), sample.input.eventKey)
  }
})

test('email logo markup remains table-based and compatible with narrow clients', () => {
  const rendered = renderVeroEmail({ eventKey: 'builder.profile_submitted' })
  const logoIndex = rendered.html.indexOf(`src="${VERO_EMAIL_LOGO_URL}"`)
  const headerTableIndex = rendered.html.lastIndexOf('<table role="presentation"', logoIndex)

  assert.ok(headerTableIndex >= 0)
  assert.ok(headerTableIndex < logoIndex)
  assert.match(rendered.html, /<img[^>]+width="176"[^>]+height="88"[^>]+style="display:block;width:176px;max-width:100%;height:auto;/)
  assert.doesNotMatch(rendered.html, /src="\/(?!\/)|src="\.\//)
  assert.doesNotMatch(rendered.html, /data:image\//)
})
