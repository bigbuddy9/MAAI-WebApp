import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Check whitelist by email
    if (email) {
      const { data: whitelist } = await supabase
        .from('subscription_whitelist')
        .select('email')
        .eq('email', email.toLowerCase())
        .single();

      if (whitelist) {
        return NextResponse.json({
          active: true,
          status: 'whitelisted',
          whitelisted: true,
        });
      }
    }

    // Check subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!sub) {
      return NextResponse.json({
        active: false,
        status: 'none',
        whitelisted: false,
      });
    }

    // Active statuses: active, trialing
    const isActive = sub.status === 'active' || sub.status === 'trialing';

    return NextResponse.json({
      active: isActive,
      status: sub.status,
      trialEnd: sub.trial_end,
      currentPeriodEnd: sub.current_period_end,
      cancelAt: sub.cancel_at,
      whitelisted: false,
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    // If tables don't exist or query fails, allow access rather than blocking
    return NextResponse.json({
      active: false,
      status: 'none',
      whitelisted: false,
    });
  }
}
