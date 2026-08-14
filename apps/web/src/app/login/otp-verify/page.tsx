import { OtpVerifyPage } from '@features/auth/presentation/pages/otp-verify-page';
import { Suspense } from 'react';

export default function OtpVerifyRoute() {
  return (
    <Suspense>
      <OtpVerifyPage />
    </Suspense>
  );
}
