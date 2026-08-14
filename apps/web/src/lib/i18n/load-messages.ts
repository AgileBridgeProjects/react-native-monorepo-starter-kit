import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

import { DEFAULT_LOCALE, MESSAGES_DIRECTORY } from './settings';

export type Messages = Record<string, Record<string, string>>;

const messagesRoot = path.join(process.cwd(), MESSAGES_DIRECTORY);

async function readLocaleMessages(locale: string): Promise<Messages> {
  const localeDirectory = path.join(messagesRoot, locale);
  const entries = await readdir(localeDirectory, { withFileTypes: true });

  const messages = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        const filePath = path.join(localeDirectory, entry.name);
        const namespace = path.basename(entry.name, '.json');
        const contents = await readFile(filePath, 'utf8');

        return [namespace, JSON.parse(contents) as Record<string, string>] as const;
      }),
  );

  return Object.fromEntries(messages);
}

export const getAvailableLocales = cache(async () => {
  const entries = await readdir(messagesRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
});

export const loadMessages = cache(async (requestedLocale: string) => {
  const locales = await getAvailableLocales();
  const locale = locales.includes(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: await readLocaleMessages(locale),
  };
});
