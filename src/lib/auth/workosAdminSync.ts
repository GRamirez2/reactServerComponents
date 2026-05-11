import { getWorkOS } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { users } from '@/lib/schema';
import { getUserById, type AppUser } from '@/lib/repositories/usersRepository';

type AuthUserLike = {
  id: string;
  email?: string | null;
};

function normalizeRoleSlug(rawSlug: string | null | undefined): string {
  if (!rawSlug) {
    return '';
  }

  return rawSlug.includes('-')
    ? rawSlug.split('-').slice(1).join('-')
    : rawSlug;
}

async function getWorkOSRoleSlug(userId: string): Promise<string> {
  const workos = getWorkOS();
  const memberships = await workos.userManagement.listOrganizationMemberships({
    userId,
  });

  return normalizeRoleSlug(memberships.data[0]?.role?.slug);
}

export async function getWorkOSAdminStatus(userId: string): Promise<boolean> {
  try {
    const roleSlug = await getWorkOSRoleSlug(userId);
    return roleSlug === 'admin';
  } catch (error) {
    console.error('[Auth sync] WorkOS role lookup failed', error);
    return false;
  }
}

export async function syncAuthUserFromWorkOS(
  user: AuthUserLike,
): Promise<{ appUser: AppUser | null; isWorkOSAdmin: boolean }> {
  const isWorkOSAdmin = await getWorkOSAdminStatus(user.id);
  const existingUser = await getUserById(user.id);
  const email = user.email ?? null;

  if (!existingUser) {
    if (!email) {
      return { appUser: null, isWorkOSAdmin };
    }

    await db.insert(users).values({
      id: user.id,
      email,
      role: isWorkOSAdmin ? 'ADMIN' : 'MEMBER',
    });

    return {
      appUser: {
        id: user.id,
        email,
        role: isWorkOSAdmin ? 'ADMIN' : 'MEMBER',
      },
      isWorkOSAdmin,
    };
  }

  const nextEmail = email ?? existingUser.email;
  const nextRole = isWorkOSAdmin ? 'ADMIN' : existingUser.role;

  if (nextEmail !== existingUser.email || nextRole !== existingUser.role) {
    await db
      .update(users)
      .set({ email: nextEmail, role: nextRole })
      .where(eq(users.id, user.id));

    return {
      appUser: {
        ...existingUser,
        email: nextEmail,
        role: nextRole,
      },
      isWorkOSAdmin,
    };
  }

  return { appUser: existingUser, isWorkOSAdmin };
}
