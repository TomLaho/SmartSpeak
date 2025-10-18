import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Sign in to SmartSpeak</h1>
        <p className="text-muted-foreground">Practice with AI-powered feedback tailored to your delivery.</p>
      </div>
      <div className="grid w-full gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Use your email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="signin" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New here?</CardTitle>
            <CardDescription>Create an account to start logging your sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AuthForm mode="signup" />
            <p className="text-xs text-muted-foreground">
              By creating an account you agree to practice privacy-first sharing. Recordings stay private until you generate a link.
            </p>
          </CardContent>
        </Card>
      </div>
      <Link href="/" className="text-sm text-primary hover:underline">
        Back to home
      </Link>
    </div>
  );
}
