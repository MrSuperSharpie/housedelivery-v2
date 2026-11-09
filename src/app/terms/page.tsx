import type { Metadata } from 'next'
import { LegalShell, LegalSection, LegalList, LegalContact } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Vero Permit Terms and Conditions.',
}

export default function TermsAndConditionsPage() {
  return (
    <LegalShell title="Vero Permit Terms and Conditions" effectiveDate="June 22, 2026">
      <LegalSection heading="Overview">
        <p>
          These terms govern use of Vero Permit, operated by 1578295 B.C. LTD., doing business as
          Vero Permit. By accessing or using Vero Permit, you agree to these Terms and Conditions.
        </p>
        <p>
          Vero Permit is a digital platform for construction inspection requests, builder and
          inspector coordination, governed checklists, field evidence, reports, scheduling, same-day
          corrections, re-verification activity, payments, project records, and related
          communications.
        </p>
        <p>
          Vero Permit does not replace municipal authority, AHJ (Authority Having Jurisdiction)
          authority, permit offices, regulators, engineers, architects, or professional advisers.
        </p>
      </LegalSection>

      <LegalSection heading="Users">
        <p>
          Users are responsible for the accuracy of the information they provide and for using Vero
          Permit in accordance with these terms and all applicable laws. Users must keep their
          account credentials secure and are responsible for activity under their account.
        </p>
      </LegalSection>

      <LegalSection heading="Builders">
        <p>
          Builders use Vero Permit to request inspections, coordinate with inspectors, respond to
          Holds and same-day corrections, and manage project records. Builders are responsible for
          providing accurate project and site information and for acting on inspection outcomes.
        </p>
      </LegalSection>

      <LegalSection heading="Inspectors">
        <p>
          Inspectors use Vero Permit to accept assignments, complete governed checklists, capture
          field evidence, and submit inspection reports. Inspectors are responsible for performing
          assignments in line with their professional credentials and applicable standards.
        </p>
      </LegalSection>

      <LegalSection heading="Inspection Outcomes">
        <p>
          Inspection outcomes recorded through Vero Permit reflect the work and judgment of the
          assigned inspector. Vero Permit provides the platform and records but does not itself
          certify, approve, or guarantee any inspection result.
        </p>
      </LegalSection>

      <LegalSection heading="Same-Day Corrections and Holds">
        <p>
          A Hold is a same-day correction workflow status raised during an inspection. A same-day correction
          allows a builder to address a flagged condition while the inspector is engaged. Holds and
          corrections remain connected to their project, stage, responsible party, and status until
          resolved through the platform.
        </p>
      </LegalSection>

      <LegalSection heading="Payments">
        <p>
          Vero Permit supports payments related to inspection activity. Payment amounts and status
          are processed through the platform and its payment providers. Users are responsible for
          payments associated with their requests and assignments.
        </p>
      </LegalSection>

      <LegalSection heading="SMS and Email Notifications">
        <p>
          Vero Permit may send transactional email and SMS notifications related to inspection
          workflows, scheduling, assignment activity, Holds, same-day corrections, re-verification,
          payment status, inspection updates, and project status.
        </p>
        <p>
          By providing a mobile phone number and using Vero Permit, users consent to receive
          transactional SMS messages related to their account, projects, assignments, or inspection
          activity.
        </p>
        <LegalList
          items={[
            'Message and data rates may apply.',
            'Message frequency may vary.',
            'Reply STOP to opt out.',
            'Reply HELP for help.',
            'Vero Permit does not use SMS for marketing or promotional messages.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="Uploaded Content and Evidence">
        <p>
          Users are responsible for the content, photos, documents, and field evidence they upload.
          Uploaded content must be accurate and lawful. Vero Permit may retain uploaded content as
          part of project records and audit trails.
        </p>
      </LegalSection>

      <LegalSection heading="Platform Availability">
        <p>
          Vero Permit aims to keep the platform available and reliable but does not guarantee
          uninterrupted or error-free operation. Access may be affected by maintenance, updates, or
          factors outside our control.
        </p>
      </LegalSection>

      <LegalSection heading="No Professional or Legal Advice">
        <p>
          Vero Permit does not provide professional, engineering, architectural, or legal advice.
          The platform does not replace the judgment of licensed professionals or the authority of
          municipalities, regulators, or permit offices.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Vero Permit and 1578295 B.C. LTD. are not liable
          for indirect, incidental, or consequential damages arising from use of the platform. Vero
          Permit is provided on an as-is and as-available basis.
        </p>
      </LegalSection>

      <LegalSection heading="Suspension or Termination">
        <p>
          Vero Permit may suspend or terminate access to accounts that violate these terms, misuse
          the platform, or create risk to other users or the integrity of inspection records.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to Terms">
        <p>
          Vero Permit may update these Terms and Conditions from time to time. Continued use of the
          platform after changes take effect constitutes acceptance of the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="Governing Law">
        <p>
          These terms are governed by the laws of the Province of British Columbia and the
          applicable laws of Canada.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <LegalContact />
      </LegalSection>
    </LegalShell>
  )
}
