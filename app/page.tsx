import Link from 'next/link';
import { ArrowRightIcon, MicrophoneIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const tracks = [
  {
    title: 'Delivery',
    emoji: '🎙️',
    desc: 'Master the technical craft: pace, deliberate pauses, intonation, energy and killing filler words — all measured from your real audio.',
  },
  {
    title: 'Storytelling',
    emoji: '✨',
    desc: 'Learn to hook fast, structure a clear arc, explain complex things simply, and make every point land and stick.',
  },
];

const steps = [
  { title: 'Pick a 5-minute exercise', desc: 'A short, guided drill from the Delivery or Storytelling path.' },
  { title: 'Record one take', desc: 'Speak right in your browser. Live transcript, no setup.' },
  { title: 'Get instant coaching', desc: 'Real pace, pause, pitch & story scores with one concrete fix to try next.' },
  { title: 'Build the habit', desc: 'Earn XP, keep your streak, and watch your scores climb.' },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <header className="flex flex-col items-start gap-8 text-left md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">SmartSpeak · Public speaking, 5 minutes a day</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            Become a clear, captivating speaker — one short workout at a time.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            SmartSpeak is like Duolingo for public speaking. Bite-sized daily exercises train two things at once: the
            technical delivery of your voice, and the storytelling that makes people actually listen.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/train">
                Start training free <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#how">How it works</Link>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">No sign-up needed — runs entirely in your browser.</p>
        </div>
        <div className="hidden rounded-2xl border bg-muted/50 p-6 shadow md:block">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MicrophoneIcon className="h-4 w-4 text-primary" /> Today&apos;s workout
          </div>
          <ol className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />🏃 Find Your Pace</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />🪝 Hook in 10 Seconds</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />🧒 Explain It Simply</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />⏸️ The Power of the Pause</li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">🔥 Keep your streak · earn XP · level up</p>
        </div>
      </header>

      <section className="mt-16 grid gap-6 md:grid-cols-2">
        {tracks.map((track) => (
          <Card key={track.title}>
            <CardHeader className="flex flex-row items-center gap-3">
              <span className="text-3xl">{track.emoji}</span>
              <div>
                <CardTitle className="text-xl">{track.title}</CardTitle>
                <CardDescription>{track.desc}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section id="how" className="mt-16">
        <div className="mb-6 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">How it works</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((step, i) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <CardTitle className="text-base">{step.title}</CardTitle>
                <CardDescription>{step.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/train">
              Try your first workout <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
