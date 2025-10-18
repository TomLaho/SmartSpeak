import Link from 'next/link';
import { ArrowRight, Mic2, TrendingUp, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    title: 'Upload or record',
    description: 'Bring any speech into the coach with lightning-fast uploads or the built-in recorder.',
    icon: Video
  },
  {
    title: 'AI insight dashboard',
    description: 'Track pace, fillers, pauses, and clarity in one beautiful, accessible timeline.',
    icon: TrendingUp
  },
  {
    title: 'Actionable guidance',
    description: 'Receive concise drills tailored to your delivery so your next talk lands.',
    icon: Mic2
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-24 text-center md:pt-32">
        <p className="mx-auto inline-flex items-center rounded-full border border-primary/30 px-4 py-1 text-sm text-primary/80">
          SmartSpeak Coach · Practice with purpose
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Transform your public speaking with feedback you can trust.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
          SmartSpeak analyzes your delivery, highlights fillers and pacing, and gives you a plan to improve every time you step up to speak.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/signin">
              Enter the app
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">Explore the workflow</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-6 pb-24">
        <section id="how-it-works" className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card/60 backdrop-blur">
              <CardHeader>
                <feature.icon className="mb-4 h-10 w-10 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border bg-background/70 p-10 backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold">Ready to rehearse smarter?</h2>
              <p className="text-muted-foreground">
                Sign in, upload your latest practice, and let SmartSpeak deliver instant coaching with measurable progress.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/app/new">Start a session</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
