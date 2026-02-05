import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'jessebarbato788@gmail.com';

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Check if env vars are set
  if (!serviceRoleKey) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is not set',
      hasUrl: !!supabaseUrl,
    });
  }

  if (!supabaseUrl) {
    return NextResponse.json({
      error: 'NEXT_PUBLIC_SUPABASE_URL is not set',
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Try to query the whitelist
  const { data: whitelist, error: whitelistError } = await supabase
    .from('subscription_whitelist')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  // Also get all entries in the table for debugging
  const { data: allEntries, error: allError } = await supabase
    .from('subscription_whitelist')
    .select('*');

  return NextResponse.json({
    searchedEmail: email.toLowerCase(),
    found: !!whitelist,
    whitelist,
    whitelistError,
    allEntries,
    allError,
    keyPreview: serviceRoleKey.substring(0, 20) + '...',
  });
}
