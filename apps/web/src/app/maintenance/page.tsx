import Image from 'next/image';

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Branded hero panel — mirrors AuthLayout */}
      <div className="auth-hero-gradient auth-hero-pattern relative flex shrink-0 items-center justify-center px-md py-xl lg:w-[45%] lg:py-0">
        <div className="relative z-10 flex flex-col items-center gap-lg">
          <Image
            src="/brand-wordmark.png"
            alt="StarterKit logo"
            width={280}
            height={77}
            priority
            className="h-auto w-56 lg:w-[280px]"
          />
          <div className="flex items-center gap-sm">
            <div className="h-px w-8 bg-white/40" />
            <span className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase">
              Admin Portal
            </span>
            <div className="h-px w-8 bg-white/40" />
          </div>
        </div>
      </div>

      {/* Message panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-md py-xl">
        <div className="flex w-full max-w-auth-card flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <h1 className="text-2xl font-semibold text-text">Deployment in progress</h1>
            <p className="text-sm leading-relaxed text-text-secondary">
              We're rolling out an update to StarterKit. This usually takes a couple of minutes — please
              refresh the page shortly and you'll be back up and running.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-md">
            <div className="flex items-start gap-sm">
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                style={{ animation: 'gradient-wave-pulse 2s ease-in-out infinite' }}
              />
              <p className="text-sm text-text-secondary">
                The system is healthy — your data is safe. Only the web services are temporarily
                unavailable while the update completes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
