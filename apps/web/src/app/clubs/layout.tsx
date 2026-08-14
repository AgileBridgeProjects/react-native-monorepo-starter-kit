'use client';
import { RequireAuth } from '@features/auth/presentation/components/require-auth';
import { requireAuth, requirePermission } from '@features/auth/presentation/guards/route-guards';

export default function ClubsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth
      guards={[requireAuth, requirePermission('StarterKit.Clubs.View', '/users')]}
      showLayout={false}
    >
      {children}
    </RequireAuth>
  );
}
