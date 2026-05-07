import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const signInUrl = await getSignInUrl();

  console.log('WorkOS auth debug', {
    signInUrl,
    renderExternalUrl: process.env.RENDER_EXTERNAL_URL,
    nextPublicRedirectUri: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
    workosRedirectUri: process.env.WORKOS_REDIRECT_URI,
    port: process.env.PORT,
  });

  return NextResponse.redirect(signInUrl);
}
