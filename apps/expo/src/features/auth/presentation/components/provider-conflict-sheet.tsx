import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { ProviderConflictFailure } from '@starterkit/shared';
import { useCallback } from 'react';
import { View } from 'react-native';
import { Button, Typography } from '@/components/ui';
import { ActionSheet } from '@/components/ui/action-sheet';
import { useTranslation } from '@/src/lib/i18n';

interface ProviderConflictSheetProps {
  /** The error to inspect — only renders when it's a ProviderConflictFailure. */
  error: Error | null | undefined;
  /** Called when the user dismisses the sheet. */
  onDismiss: () => void;
}

/**
 * Bottom sheet explaining that the user's email is already linked to a
 * different auth provider. Guides them to sign in with the correct one.
 */
export function ProviderConflictSheet({ error, onDismiss }: ProviderConflictSheetProps) {
  const { t } = useTranslation('auth');

  const conflict = error instanceof ProviderConflictFailure ? error : null;

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <ActionSheet visible={!!conflict} onClose={handleDismiss}>
      <View className="items-center gap-md">
        <Typography variant="h3" className="text-center">
          {t('providerConflict.title')}
        </Typography>

        <Typography variant="body" className="text-text-secondary text-center">
          {conflict?.noLinkedProvider
            ? t('providerConflict.messageNoProvider', {
                email: conflict.localeParams?.email ?? '',
              })
            : conflict?.localeParams?.email && conflict.localeParams.email !== 'unknown'
              ? t('providerConflict.message', {
                  email: conflict.localeParams.email,
                  provider: conflict.existingProvider ?? '',
                })
              : t('providerConflict.messageNoEmail', {
                  provider: conflict?.existingProvider ?? '',
                })}
        </Typography>

        <Button
          testID={AUTH_TEST_IDS.components.providerConflict.dismissButton}
          variant="primary"
          size="lg"
          onPress={handleDismiss}
          className="w-full mt-sm"
        >
          {t('providerConflict.dismiss')}
        </Button>
      </View>
    </ActionSheet>
  );
}
