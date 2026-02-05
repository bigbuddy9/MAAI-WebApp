import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for subscription/whitelist checks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Check whitelist by email (use maybeSingle to not throw when not found)
    if (email) {
      const { data: whitelist, error: whitelistError } = await supabase
        .from('subscription_whitelist')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (whitelistError) {
        console.error('Whitelist check error:', whitelistError);
      }

      if (whitelist) {
        return NextResponse.json({
          active: true,
          status: 'whitelisted',
          whitelisted: true,
        });
      }
    }

    // Check subscription (use maybeSingle to not throw when not found)
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Subscription check error:', subError);
    }

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
