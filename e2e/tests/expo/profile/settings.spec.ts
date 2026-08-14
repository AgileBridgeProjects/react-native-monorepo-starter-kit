import { expect, type Page, test } from '@playwright/test';
import { SettingsPage } from '../../../expo/pages/profile.page';
import { injectExpoSupabaseAuth } from '../../../playwright/utils/auth';

// ─── Notification permission stub ──────────────────────────────────────────────
//
// expo-notifications' web module reads `window.Notification.permission` and calls
// `window.Notification.requestPermission()` (see node_modules/expo-notifications/
// build/NotificationPermissionsModule.js). We override that browser API before the
// app boots so we control grant/deny deterministically (CI has no real prompt).
//
// SHARED-HELPER NOTE: this belongs in a shared util (e.g. mockExpoNotifications(page,
// 'granted' | 'denied')) but lives here to respect this task's file-ownership scope.

async function stubNotificationPermission(page: Page, outcome: 'granted' | 'denied') {
  await page.addInitScript((result: string) => {
    // biome-ignore lint/complexity/noStaticOnlyClass: mirrors the browser Notification API, which is a static-only global
    class FakeNotification {
      static permission = 'default';
      static requestPermission(cb?: (p: string) => void) {
        FakeNotification.permission = result;
        cb?.(result);
        return Promise.resolve(result);
      }
    }
    // @ts-expect-error overriding the browser Notification API for the test
    window.Notification = FakeNotification;
  }, outcome);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Settings Screen', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    await injectExpoSupabaseAuth(page);
    settingsPage = new SettingsPage(page);
  });

  test('renders all toggles', async ({ page }) => {
    await stubNotificationPermission(page, 'denied');
    await settingsPage.goto();
    await settingsPage.waitForScreen();

    await expect(settingsPage.notificationsSwitch).toBeVisible();
    await expect(settingsPage.darkModeSwitch).toBeVisible();
    await expect(settingsPage.reduceMotionSwitch).toBeVisible();
  });

  // ─── Notifications ────────────────────────────────────────────────────────

  test('granting permission enables the notifications toggle', async ({ page }) => {
    await stubNotificationPermission(page, 'granted');
    await settingsPage.goto();
    await settingsPage.waitForScreen();

    // The on-mount sync only forces OFF when the OS denied; 'granted' leaves it as-is.
    await settingsPage.toggleNotifications();
    await expect(settingsPage.notificationsSwitch).toBeChecked();
  });

  test('denying permission keeps the notifications toggle off (permission gate)', async ({
    page,
  }) => {
    await stubNotificationPermission(page, 'denied');
    await settingsPage.goto();
    await settingsPage.waitForScreen();

    await settingsPage.toggleNotifications();
    // requestPermissionsAsync resolved 'denied' → the handler forces the store back to false.
    await expect(settingsPage.notificationsSwitch).not.toBeChecked();
  });

  // ─── Dark mode ──────────────────────────────────────────────────────────────

  test('dark-mode row is shown but locked on', async ({ page }) => {
    // StarterKit ships dark-mode only (see use-color-scheme.ts), so settings-screen.tsx renders
    // this row with `disabled` and a hard-coded `value={true}` — there is nothing to toggle.
    // The previous test clicked it and waited for the value to flip, which could only ever
    // time out. Asserting the locked state instead keeps the row covered: if someone
    // re-enables theming, this fails and the toggle test comes back with it.
    await stubNotificationPermission(page, 'denied');
    await settingsPage.goto();
    await settingsPage.waitForScreen();

    await expect(settingsPage.darkModeSwitch).toBeChecked();
    await expect(settingsPage.darkModeSwitch).toBeDisabled();
  });

  // ─── Reduce motion ────────────────────────────────────────────────────────

  test('reduce-motion toggle flips state', async ({ page }) => {
    await stubNotificationPermission(page, 'denied');
    await settingsPage.goto();
    await settingsPage.waitForScreen();

    await settingsPage.toggleReduceMotion();
    await expect(settingsPage.reduceMotionSwitch).toBeChecked();
  });
});
