import Stripe from 'stripe';
import { prisma } from './db';
import { Plan } from '@prisma/client';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export async function syncSubscriptionToUser(params: {
  customerId: string;
  subscriptionId?: string | null;
  status?: Stripe.Subscription.Status;
}) {
  const { customerId, subscriptionId, status } = params;
  const isActive = status && ['active', 'trialing', 'past_due'].includes(status);
  const plan = isActive ? Plan.PRO : Plan.FREE;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan,
      stripeSubscriptionId: subscriptionId || undefined,
    },
  });
}
