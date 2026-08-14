'use client';

import { useCurrentSession } from '@features/auth/presentation/hooks/use-current-session';
import { useAuthStore } from '@store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isHydrated, isAuthenticated, portalRoleVerified } = useAuthStore();
  const { hasPermission } = useCurrentSession();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !portalRoleVerified) return;

    const destination = hasPermission('StarterKit.Platform.Admin') ? '/clubs' : '/users';
    router.replace(destination);
  }, [isHydrated, isAuthenticated, portalRoleVerified, hasPermission, router]);

  return null;
}
