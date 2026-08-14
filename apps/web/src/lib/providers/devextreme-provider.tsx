'use client';

import config from 'devextreme/core/config';
import { locale as setDevExtremeLocale } from 'devextreme/localization';
import 'devextreme/dist/css/dx.dark.css';

/**
 * DevExtreme initialiser — imports the base CSS theme and registers the
 * license key. Mount once in the root layout.
 *
 * License key is read from NEXT_PUBLIC_DEVEXTREME_LICENSE_KEY env var.
 *
 * Theme choice: the portal is dark-only (see globals.css), so the base theme
 * must be a dark one. The DX stylesheet colours hundreds of widget internals
 * — calendar cells, filter builder, scroll views, validation popovers — that
 * globals.css does not override; starting from dx.light.css would leave those
 * white no matter how many tokens are remapped.
 *
 * Available dark themes:
 *   - dx.dark.css                 ← current (generic dark; neutral enough that
 *                                   the globals.css token overrides land cleanly)
 *   - dx.material.blue.dark.css
 *   - dx.fluent.blue.dark.css
 *
 * CSS overrides in globals.css align DX surfaces with the app's design tokens.
 */

// Register the license key at module load time — before any DX component renders.
// Calling this inside useEffect is too late; DX checks the key on first mount.
config({ licenseKey: process.env.NEXT_PUBLIC_DEVEXTREME_LICENSE_KEY });
setDevExtremeLocale('en-ZA');

export function DevExtremeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
