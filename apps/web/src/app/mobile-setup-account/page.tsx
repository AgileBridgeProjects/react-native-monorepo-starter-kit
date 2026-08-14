import { MobileSetupAccountPage } from '@features/mobile-setup/presentation/pages/mobile-setup-account-page';
import { Suspense } from 'react';

export default function MobileSetupAccountRoute() {
  return (
    <Suspense>
      <MobileSetupAccountPage />
    </Suspense>
  );
}
