'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type BillingResponse = {
  plan: string;
  email: string;
  lifetimeSessionsUsed: number;
};

export default function BillingPage() {
  const { data, mutate } = useSWR<BillingResponse>('/api/account', fetcher);
  const [loading, setLoading] = useState(false);

  const checkout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to start checkout');
      window.location.href = json.url;
    } catch (err) {
      console.error(err);
      alert('Unable to start checkout');
    } finally {
      setLoading(false);
      mutate();
    }
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Upgrade to unlimited sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center gap-2">
          <p className="font-semibold">Current plan</p>
          <Badge variant="secondary">{data?.plan || '—'}</Badge>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-lg font-semibold">Pro — $15 / month</p>
          <p className="text-muted-foreground">Unlimited sessions, history, and faster processing.</p>
          <Button className="mt-3" onClick={checkout} disabled={loading}>
            {loading ? 'Redirecting...' : 'Upgrade with Stripe'}
          </Button>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-lg font-semibold">Free</p>
          <p className="text-muted-foreground">3 lifetime sessions to get started.</p>
        </div>
      </CardContent>
    </Card>
  );
}
