import Link from 'next/link';
import { signOut, withAuth, getWorkOS} from '@workos-inc/authkit-nextjs';
import { getAppBaseUrl } from '@/lib/appUrl';

export default async function AuthNav() {
  const { user } = await withAuth();
  // console.log('AuthNav user:', user);
  const workos = getWorkOS();
  const memberships = user
    ? await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
      })
    : null;

//console.log('Memberships.data = ', memberships.data);// just to see what is there. 
const orgName = memberships?.data[0]?.organizationName || 'Home'; // this is just to see one, if there are many roles you need to pick data[0].roles and loop through them to find the one you want, or use all of them.
//console.log('Memberships.data.role = ', memberships.data[0]?.role?.slug); // this is just to see one, if there are many roles you need to pick data[0].roles and loop through them to find the one you want, or use all of them. 

const roleSlug = memberships?.data[0]?.role?.slug; // this is just to see one, if there are many roles you need to pick data[0].roles and loop through them to find the one you want, or use all of them.

  return (
    <nav className="flex items-center justify-between bg-gray-800 p-4 text-white">
      <h1>
        <Link href="/" className="text-2xl font-bold">
          <span className="font-semibold">{orgName}</span>
        </Link>
      </h1>

      {user ? (
        <div className="flex items-center gap-4">
          <span className="font-semibold">{user.firstName ?? user.email ?? 'Logged in'}</span>
          <form
            action={async () => {
              'use server';
              const appBaseUrl = await getAppBaseUrl();
              await signOut({ returnTo: `${appBaseUrl}/` });
            }}
          >
            <button type="submit" className="rounded bg-white px-3 py-1 text-sm font-semibold text-gray-800">
              Logout
            </button>
          </form>
        </div>
      ) : (
        <a href="/login" className="rounded bg-white px-3 py-1 text-sm font-semibold text-gray-800">
          Login Yo
        </a>
      )}
    </nav>
  );
}