import Link from 'next/link';
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/brand/logo';
import { TRACKS } from '@/lib/exercises';

const trackBlurbs: Record<string, string> = {
  delivery:
    'Sound calm and in command: a steady pace, deliberate pauses before your key numbers, emphasis where it counts, and zero filler — all measured from your real audio.',
  structure:
    'Lead with the point. Turn findings into a clear "so what", walk a deck as one connected story, and make a single idea land and stick.',
  influence:
    'Win the room: a 60-second executive summary, a confident ask, and composed, answer-first responses when your plan gets challenged.',
};

const moments = [
  { emoji: '📊', title: 'Findings readout', desc: 'Lead with the headline, then the evidence.' },
  { emoji: '🖥️', title: 'Deck walkthrough', desc: 'Present your slides — don’t read them.' },
  { emoji: '🎯', title: 'Strategy pitch', desc: 'Make one big idea impossible to forget.' },
  { emoji: '🗂️', title: 'Implementation plan', desc: 'Ships-first, milestones, and the real risk.' },
  { emoji: '🚦', title: 'Status update', desc: 'Crisp, filler-free, on track vs. at risk.' },
  { emoji: '🛡️', title: 'Q&A & pushback', desc: 'Stay composed and answer the hard one first.' },
];

const steps = [
  { title: 'Pick a work moment', desc: 'A short, guided rep from the Delivery, Structure or Influence path.' },
  { title: 'Record one take', desc: 'Speak right in your browser. Live transcript, nothing to install.' },
  { title: 'Get instant coaching', desc: 'Real pace, pause, emphasis and structure scores — plus one concrete fix.' },
  { title: 'Walk in ready', desc: 'Earn XP, keep your streak, and watch your scores climb before the meeting.' },
];

export default function LandingPage() {
  return (
    <div>
      {/* Top nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo size={32} />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="#how">How it works</Link>
          </Button>
          <Button asChild>
            <Link href="/train">Open the app</Link>
          </Button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-8">
        {/* Hero */}
        <header className="flex flex-col items-start gap-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Your pocket presentation coach</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Rehearse the meeting before it happens.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              SmartSpeak helps you nail the presentations that move your career — reading out findings, walking a deck,
              pitching a strategy, defending an implementation plan, handling the tough question. Record a one-minute
              take and get instant, private feedback on both how you sound and how you structure the point.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/train">
                  Start practising free <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No sign-up. Runs entirely in your browser — your voice never leaves your device.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-2xl border bg-muted/40 p-6 shadow-sm">
            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>Today’s 5-minute session</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">3 reps</span>
            </div>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="text-lg">🗞️</span> Lead With the Headline
              </li>
              <li className="flex items-center gap-3">
                <span className="text-lg">📊</span> Present a Finding
              </li>
              <li className="flex items-center gap-3">
                <span className="text-lg">🛡️</span> Handle the Tough Question
              </li>
            </ol>
            <p className="mt-5 text-xs text-muted-foreground">🔥 Keep your streak · earn XP · level up your presence</p>
          </div>
        </header>

        {/* Skill paths */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold tracking-tight">Three skills behind every great presenter</h2>
          <p className="mt-2 text-muted-foreground">Short daily reps build the craft, the clarity, and the composure.</p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {(Object.values(TRACKS)).map((track) => (
              <Card key={track.id}>
                <CardHeader>
                  <div className={`mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl ${track.gradient}`}>
                    {track.emoji}
                  </div>
                  <CardTitle className="text-xl">{track.name}</CardTitle>
                  <CardDescription>{trackBlurbs[track.id]}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Real work moments */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold tracking-tight">Built for the moments that matter</h2>
          <p className="mt-2 text-muted-foreground">Every rep rehearses a real meeting, not a tongue-twister.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moments.map((m) => (
              <div key={m.title} className="rounded-2xl border bg-card p-5">
                <div className="text-2xl">{m.emoji}</div>
                <p className="mt-3 font-semibold">{m.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-20 scroll-mt-20">
          <div className="mb-6 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
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
        </section>

        {/* Final CTA */}
        <section className="mt-20 rounded-3xl border bg-gradient-to-br from-violet-600 to-blue-600 p-10 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">Your next presentation starts now.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Five focused minutes today. A calmer, clearer, more convincing you in the room tomorrow.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Link href="/train">
                Start practising free <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
