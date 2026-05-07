import { listUsers, listUsersByWorkosId, type User } from '@/lib/repositories/usersRepository';

interface UsersListProps {
  workosId: string;
}

async function getUsers(workosId: string): Promise<{ users: User[]; error: string | null }> {
  try {
    // const users = await listUsers();
    const users = await listUsersByWorkosId(workosId);
    return { users, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { users: [], error: message };
  }
}

export async function UsersList({ workosId }: UsersListProps) {
  const { users, error } = await getUsers(workosId);
  if (error) {
    return <p><strong>DB error:</strong> {error}</p>;
  }
  return (
    <section className="my-8">
      <h3 className='text-xl'>List of Users from the Users table that match the WorkOS ID</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name} — {user.email} - {user.workosId}</li>
        ))}
      </ul>
      <hr className="mt-4"/>
    </section>
  );
}
