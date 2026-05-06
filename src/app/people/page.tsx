import SpreadsheetUpload from './SpreadsheetUpload';
import { redirect } from 'next/navigation';
import { getWorkOS, withAuth } from '@workos-inc/authkit-nextjs';

const ALLOWED_ROLES = new Set(['member', 'admin']);

export default async function People() {
  const { user } = await withAuth();

  if (!user) {
    redirect('/');
  }

  let roleSlug: string | undefined;

  try {
    const workos = getWorkOS();
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: user.id,
    });
    const rawSlug = memberships.data[0]?.role?.slug;
    roleSlug = rawSlug?.includes('-') ? rawSlug.split('-').slice(1).join('-') : rawSlug;
  } catch (error) {
    console.error('[People guard] role lookup failed', error);
  }

  if (!roleSlug || !ALLOWED_ROLES.has(roleSlug)) {
    redirect('/');
  }
  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <h1 className="text-3xl font-semibold text-gray-900">Spreadsheet Upload</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Upload an Excel workbook and inspect the parsed JSON returned by officeparser.
      </p>
      <SpreadsheetUpload />
    </main>
  );
}