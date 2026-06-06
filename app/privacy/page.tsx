import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How SmartSpeak handles your data — on-device by design.',
};

// NOTE: Review with the contact details below before publishing to the Play Store.
const CONTACT_EMAIL = 'support@smartspeak.app'; // ← replace with your real support email
const UPDATED = 'June 2026';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <nav className="mb-10">
        <Link href="/">
          <Logo size={28} />
        </Link>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="prose mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-foreground/90">
        <p>
          SmartSpeak is a presentation-practice app built to be <strong>private by design</strong>. We do not run
          accounts, and your practice audio is processed entirely on your device.
        </p>

        <section>
          <h2 className="text-xl font-semibold">Microphone &amp; audio</h2>
          <p>
            We use the microphone only while you are recording a practice take. Your recording is analysed on your
            device (pace, pauses, tone, volume and fillers) and, when needed, transcribed on your device. <strong>Your
            audio is never uploaded to us or to any third party, and we do not store it on any server.</strong>{' '}
            Recordings live only in your device&apos;s memory for the length of a session.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">On-device transcription</h2>
          <p>
            To turn speech into text, the app downloads a small speech-recognition model once from a public content
            delivery network and caches it on your device. Only the model is downloaded — <strong>your voice is not
            sent anywhere</strong>. Transcription then runs locally and works offline.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">What we store</h2>
          <p>
            Your progress (streak, XP, scores and recent takes) and microphone-calibration settings are saved in your
            browser&apos;s local storage on your device. They are not transmitted to us. Clearing the app&apos;s data or
            using &quot;Reset all progress&quot; removes them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Purchases</h2>
          <p>
            The optional one-time &quot;Pro&quot; unlock is processed by Google Play. We never see or receive your
            payment information. Google processes the transaction under its own privacy policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Data we do not collect</h2>
          <p>
            We do not collect personal information, do not require sign-in, and do not use advertising or third-party
            tracking. We do not sell or share any data, because we do not collect it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Children</h2>
          <p>SmartSpeak is intended for a general, working-professional audience and is not directed at children.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Changes</h2>
          <p>
            We may update this policy; material changes will be reflected by the &quot;last updated&quot; date above.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            Questions about privacy? Email{' '}
            <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-12 text-sm">
        <Link href="/terms" className="text-primary underline">
          Terms of Service
        </Link>
      </p>
    </div>
  );
}
