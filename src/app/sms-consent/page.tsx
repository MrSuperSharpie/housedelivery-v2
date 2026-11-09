import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell, LegalSection, LegalContact } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Vero Permit SMS Consent',
  description: 'How Vero Permit collects SMS/text message consent and what transactional messages users may receive.',
}

export default function SmsConsentPage() {
  return (
    <LegalShell title="Vero Permit SMS Consent" effectiveDate="June 26, 2026">
      <LegalSection heading="Transactional SMS Messaging">
        <p>
          Vero Permit sends transactional SMS/text messages to registered builders, inspectors, and
          project participants.
        </p>
        <p>
          Messages may include inspection scheduling updates, appointment reminders, correction
          notices, re-verification updates, project status notices, and inspection workflow
          notifications.
        </p>
      </LegalSection>

      <LegalSection heading="How Consent Is Collected">
        <p>
          By checking the SMS consent box when creating or using a Vero Permit account, the user
          agrees to receive transactional SMS/text messages from Vero Permit.
        </p>
        <p>
          Message frequency varies based on account activity and scheduled inspections. Message and
          data rates may apply. Reply STOP to unsubscribe. Reply HELP for help.
        </p>
        <p>
          SMS consent is optional and separate from accepting Vero Permit&apos;s Terms of Service and
          Privacy Policy.
        </p>
        <p>
          Vero Permit does not send marketing, promotional, or third-party advertising messages by
          SMS.
        </p>
      </LegalSection>

      <LegalSection heading="Sample Consent Checkbox">
        <p>
          The following consent language is presented to users at the point of opt-in. This sample is
          shown for reference and is not an active form.
        </p>
        <div className="rounded-xl border border-rim/60 bg-panel px-5 py-4">
          <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              disabled
              aria-label="Sample SMS consent checkbox"
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span>
              I agree to receive transactional SMS/text messages from Vero Permit about my account,
              inspection scheduling, appointment reminders, project updates, correction notices,
              re-verification updates, and inspection workflow notifications. Message frequency
              varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help.
            </span>
          </label>
        </div>
      </LegalSection>

      <LegalSection heading="Related Policies">
        <p>
          For more information, see our{' '}
          <Link href="/privacy" className="text-flame hover:text-flame-light">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="text-flame hover:text-flame-light">
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <LegalContact />
      </LegalSection>
    </LegalShell>
  )
}
