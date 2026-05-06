import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({
  onError: async ({ error }) => {
    console.error('[WorkOS callback error]', error);
    return Response.redirect(new URL('/?authError=callback', process.env.BASE_URL ?? 'http://localhost:3000'));
  },
});