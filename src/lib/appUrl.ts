import { headers } from 'next/headers';

function getEnvAppUrl() {
  const candidates = [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return new URL(candidate).origin;
    } catch {
      // Ignore invalid environment values and continue to runtime headers.
    }
  }

  return null;
}

export async function getAppBaseUrl() {
  const configuredUrl = getEnvAppUrl();

  if (configuredUrl) {
    return configuredUrl;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

  if (!host) {
    return 'http://localhost:3000';
  }

  const protocol =
    requestHeaders.get('x-forwarded-proto') ??
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${protocol}://${host}`;
}