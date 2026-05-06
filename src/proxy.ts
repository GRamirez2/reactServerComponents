import { authkitProxy } from '@workos-inc/authkit-nextjs';

// In middleware auth mode, each page is protected by default.
// Exceptions are configured via the `unauthenticatedPaths` option.
export const proxy = authkitProxy({
  redirectUri: process.env.WORKOS_REDIRECT_URI ?? process.env.REDIRECT_URI,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/login', '/callback'],
  },
});

export default proxy;

// Match routes that should have AuthKit proxy headers/session handling.
export const config = {
  matcher: ['/', '/login', '/callback', '/info/:path*', '/people/:path*', '/admin/:path*', '/doctor/:path*'],
};
