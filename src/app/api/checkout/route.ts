import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

// Map plan names to Stripe price IDs
const PRICE_IDS: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY,
};

export async function POST(request: Request) {
  try {
    const { userId, email, plan } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    // Get the price ID for the selected plan (default to monthly)
    const priceId = PRICE_IDS[plan] || PRICE_IDS.monthly;

    if (!priceId) {
      return NextResponse.json(
        { error: 'No price configured for this plan' },
        { status: 400 }
      );
    }

    // Check if customer already exists in Stripe
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: userId,
        },
      },
      metadata: {
        supabase_user_id: userId,
      },
      success_url: `${origin}/tracker?subscription=success`,
      cancel_url: `${origin}/tracker?subscription=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
