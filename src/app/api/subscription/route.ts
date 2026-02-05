import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if service role key is configured
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Only create client if both are available
const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  // Check if Supabase is configured
  if (!supabase) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured!');
    return NextResponse.json({
      active: false,
      status: 'none',
      whitelisted: false,
      error: 'Server configuration error',
    });
  }

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  console.log('Checking subscription for:', { userId, email });

  try {
    // Check whitelist by email (use maybeSingle to not throw when not found)
    if (email) {
      console.log('Checking whitelist for email:', email.toLowerCase());

      const { data: whitelistRows, error: whitelistError } = await supabase
        .from('subscription_whitelist')
        .select('email')
        .eq('email', email.toLowerCase())
        .limit(1);

      console.log('Whitelist result:', { whitelistRows, whitelistError });

      if (whitelistError) {
        console.error('Whitelist check error:', whitelistError);
      }

      // Check if any rows were returned (user is in whitelist)
      if (whitelistRows && whitelistRows.length > 0) {
        console.log('User is whitelisted!');
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
