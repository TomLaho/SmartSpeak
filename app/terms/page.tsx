import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using SmartSpeak.',
};

const CONTACT_EMAIL = 'support@smartspeak.app'; // ← replace with your real support email
const UPDATED = 'June 2026';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <nav className="mb-10">
        <Link href="/">
          <Logo size={28} />
        </Link>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="text-xl font-semibold">Using SmartSpeak</h2>
          <p>
            SmartSpeak helps you rehearse work presentations and gives automated feedback on your delivery and
            structure. By using the app you agree to these terms. The feedback is for practice and self-improvement and
            is provided for informational purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Free preview &amp; Pro unlock</h2>
          <p>
            You can try a limited number of exercises for free. The optional one-time &quot;Pro&quot; purchase unlocks
            the full curriculum and is tied to your Google account. Payments, refunds and restorations are handled by
            Google Play under its terms; please refer to Google Play&apos;s refund policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Acceptable use</h2>
          <p>
            Use the app lawfully and don&apos;t attempt to disrupt, reverse-engineer for misuse, or infringe others&apos;
            rights. Record only your own voice or content you&apos;re permitted to record.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">No warranty</h2>
          <p>
            The app is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by
            law, we are not liable for any indirect or consequential damages arising from your use of the app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Changes</h2>
          <p>We may update these terms; continued use after an update means you accept the revised terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            Questions? Email{' '}
            <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-12 text-sm">
        <Link href="/privacy" className="text-primary underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
