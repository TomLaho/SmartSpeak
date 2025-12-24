import Link from 'next/link';
import { ArrowRightIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    title: 'Speak with confidence',
    desc: 'Record or upload and get precise metrics on pace, fillers, pauses, and structure.',
    icon: <SparklesIcon className="h-6 w-6 text-primary" />,
  },
  {
    title: 'Actionable coaching',
    desc: 'Concise, structured feedback powered by GPT-4o-mini with clear quick wins.',
    icon: <ShieldCheckIcon className="h-6 w-6 text-primary" />,
  },
  {
    title: 'Built for iteration',
    desc: 'Track history, edit transcripts, and measure progress over time.',
    icon: <ArrowRightIcon className="h-6 w-6 text-primary" />,
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <header className="flex flex-col items-start gap-6 text-left md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">SmartSpeak · AI Speech Coach</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            Coach your speech with actionable AI feedback.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Record or upload a practice talk, get a clean transcript, metrics like WPM and fillers, and concise coaching feedback. Free plan includes 3 sessions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/app">Launch App</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#pricing">View pricing</Link>
            </Button>
          </div>
        </div>
        <div className="hidden rounded-2xl border bg-muted/50 p-6 shadow md:block">
          <div className="text-sm font-medium text-muted-foreground">Workflow</div>
          <ol className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Upload or record</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Auto-transcribe with Whisper</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Edit transcript</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Generate AI feedback</li>
          </ol>
        </div>
      </header>

      <section className="mt-16 grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader className="flex flex-row items-center gap-3">
              {feature.icon}
              <div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription>{feature.desc}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section id="pricing" className="mt-16 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Great for quick practice. 3 sessions included.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>✔️ 3 lifetime sessions</p>
            <p>✔️ Whisper transcription</p>
            <p>✔️ AI coaching feedback</p>
            <Button asChild className="mt-4 w-full">
              <Link href="/app">Start for free</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-primary/50 shadow-lg">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>Unlimited practice with full history and metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>✔️ Unlimited sessions</p>
            <p>✔️ Priority processing</p>
            <p>✔️ Billing via Stripe</p>
            <Button asChild className="mt-4 w-full">
              <Link href="/app/billing">Upgrade</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
