'use client';

import { RequireAuth } from '@features/auth/presentation/components/require-auth';
import { requirePublic } from '@features/auth/presentation/guards/route-guards';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth guards={[requirePublic]} showLayout={false}>
      {children}
    </RequireAuth>
  );
}
