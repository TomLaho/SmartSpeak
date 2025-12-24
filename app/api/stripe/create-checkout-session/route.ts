import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST() {
  try {
    const user = await getOrCreateUser();

    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/app/billing?status=success`,
      cancel_url: `${process.env.APP_URL}/app/billing?status=cancel`,
      subscription_data: {
        metadata: { userId: user.id },
      },
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/checkout]', error);
    return NextResponse.json({ error: 'Unable to create checkout session' }, { status: 500 });
  }
}
