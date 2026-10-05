'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

/** Login na thakle /login-e pathay. role dile role check kore. */
export function useRequireAuth(roles?: string[]) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (roles && !roles.includes(user.role)) router.replace('/dashboard');
  }, [ready, user, roles, router, path]);
  return { user, ready, allowed: !!user && (!roles || roles.includes(user.role)) };
}
