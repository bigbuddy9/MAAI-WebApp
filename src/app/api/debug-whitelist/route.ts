import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'jessebarbato788@gmail.com';

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({
      error: 'Missing env vars',
      hasKey: !!serviceRoleKey,
      hasUrl: !!supabaseUrl,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Use the EXACT same query as subscription route
  const { data: whitelistRows, error: whitelistError } = await supabase
    .from('subscription_whitelist')
    .select('email')
    .eq('email', email.toLowerCase())
    .limit(1);

  const isWhitelisted = whitelistRows && whitelistRows.length > 0;

  return NextResponse.json({
    searchedEmail: email.toLowerCase(),
    isWhitelisted,
    whitelistRows,
    whitelistError,
    wouldReturnActive: isWhitelisted,
    keyPreview: serviceRoleKey.substring(0, 20) + '...',
  });
}
