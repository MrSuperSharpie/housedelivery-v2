import type { Metadata } from 'next'
import { LegalShell, LegalSection, LegalList, LegalContact } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Vero Permit Privacy Policy.',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalShell title="Vero Permit Privacy Policy" effectiveDate="June 22, 2026">
      <LegalSection heading="About Vero Permit">
        <p>
          Vero Permit is operated by 1578295 B.C. LTD., doing business as Vero Permit. This Privacy
          Policy explains what information we collect, how we use it, and how we handle the data
          generated through inspection workflows on the platform.
        </p>
      </LegalSection>

      <LegalSection heading="Information We Collect">
        <p>Vero Permit collects information you provide and information generated as you use the platform, including:</p>
        <LegalList
          items={[
            'User account details',
            'Project information',
            'Inspection requests',
            'Phone numbers',
            'Email addresses',
            'Field evidence',
            'Inspection notes',
            'Photos',
            'Uploaded documents',
            'Payment status information',
            'Workflow records',
          ]}
        />
      </LegalSection>

      <LegalSection heading="How We Use Information">
        <p>Vero Permit uses the information it collects to:</p>
        <LegalList
          items={[
            'Operate inspection workflows',
            'Dispatch inspectors',
            'Manage project records',
            'Send transactional notifications',
            'Support payments',
            'Secure the platform',
            'Maintain records',
          ]}
        />
      </LegalSection>

      <LegalSection heading="SMS Messages">
        <p>
          Users may receive transactional SMS messages when they provide a mobile phone number while
          creating or using a Vero Permit account, participating in a project, requesting an
          inspection, accepting an assignment, responding to a Hold, or engaging in inspection
          workflow activity.
        </p>
        <p>SMS messages may include:</p>
        <LegalList
          items={[
            'Inspection scheduling notices',
            'Same-day correction or Hold alerts',
            'Re-verification updates',
            'Builder or inspector response notifications',
            'Project updates',
            'Assignment updates',
            'Inspection status updates',
          ]}
        />
        <LegalList
          items={[
            'Vero Permit does not use SMS for marketing or promotional messages.',
            'Message and data rates may apply.',
            'Message frequency may vary based on project and inspection activity.',
            'Users may reply STOP to opt out.',
            'Users may reply HELP for help.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="Sharing of Information">
        <p>Vero Permit does not sell personal information to advertisers.</p>
        <p>
          Vero Permit may share information with service providers needed to operate the platform,
          including hosting, database, storage, email, SMS, payment, security, and monitoring
          providers.
        </p>
      </LegalSection>

      <LegalSection heading="Retention of Records">
        <p>
          Inspection records and evidence may be retained for project records, audit trails,
          completed records, and legal and operational requirements.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <LegalContact />
      </LegalSection>
    </LegalShell>
  )
}
