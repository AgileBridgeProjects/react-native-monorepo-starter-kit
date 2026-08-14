import { SetupAccountPage } from '@features/users/presentation/pages/setup-account-page';
import { Suspense } from 'react';

export default function SetupAccountRoute() {
  return (
    <Suspense>
      <SetupAccountPage />
    </Suspense>
  );
}
