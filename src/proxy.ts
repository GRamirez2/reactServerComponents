import { authkitProxy } from '@workos-inc/authkit-nextjs';

// In middleware auth mode, each page is protected by default.
// Exceptions are configured via the `unauthenticatedPaths` option.
export const proxy = authkitProxy({
   //added to make login work for dev deployment on Render, where the external URL is different from localhost
  redirectUri: `${process.env.RENDER_EXTERNAL_URL}/callback`,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/login', '/callback'],
  },
});

export default proxy;

// Match routes that should have AuthKit proxy headers/session handling.
export const config = { matcher: ['/', '/info/:path*', '/people/:path*'] };
