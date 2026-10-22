import 'server-only';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { resolveAccountAccess } from '@/server/auth/account-access';
import { roleHomes } from '@/lib/accounts/fields';
import { AccountFailure } from '@/app/_components/account-boundary';
export async function customerAccess() {
  await connection();
  const access = await resolveAccountAccess();
  if (access.kind === 'unavailable' || access.kind === 'retry') return <AccountFailure kind={access.kind} />;
  if (access.kind !== 'verified') redirect(access.kind === 'session-ended' ? '/sign-in?notice=session-ended' : '/sign-in');
  if (access.actor.role !== 'customer') redirect(roleHomes[access.actor.role]);
  return null;
}
