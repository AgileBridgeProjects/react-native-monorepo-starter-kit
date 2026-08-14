'use client';
import { RequireAuth } from '@features/auth/presentation/components/require-auth';
import { requireAuth, requirePermission } from '@features/auth/presentation/guards/route-guards';

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth
      guards={[requireAuth, requirePermission('StarterKit.Teams.View', '/users')]}
      showLayout={false}
    >
      {children}
    </RequireAuth>
  );
}
