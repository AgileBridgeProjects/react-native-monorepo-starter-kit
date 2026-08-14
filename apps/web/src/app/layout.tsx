import { I18nProvider } from '@lib/i18n';
import { getRequestLocale, getTextDirection, loadMessages } from '@lib/i18n/server';
import { ClientProviders } from '@lib/providers/client-providers';
import { DevExtremeProvider } from '@lib/providers/devextreme-provider';
import { QueryProvider } from '@lib/providers/query-provider';
import { appConfig } from '@starterkit/shared';
import type { Metadata } from 'next';
import { Bebas_Neue, Geist, Geist_Mono, Poppins } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// StarterKit brand fonts — Bebas Neue for headings, Poppins for body copy.
const bebasNeue = Bebas_Neue({
  variable: '--font-bebas-neue',
  weight: '400',
  subsets: ['latin'],
});

const poppins = Poppins({
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: appConfig.adminPortalTitle,
  description: appConfig.adminPortalTitle,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestedLocale = await getRequestLocale();
  const { locale, messages } = await loadMessages(requestedLocale);

  return (
    <html lang={locale} dir={getTextDirection(locale)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${poppins.variable} antialiased`}
      >
        <QueryProvider>
          <I18nProvider locale={locale} messages={messages}>
            <DevExtremeProvider>
              <ClientProviders>{children}</ClientProviders>
            </DevExtremeProvider>
          </I18nProvider>
          <Toaster position="bottom-right" closeButton expand />
        </QueryProvider>
      </body>
    </html>
  );
}
