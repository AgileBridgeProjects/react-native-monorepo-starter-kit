import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { OrgCard } from '@features/auth/presentation/components/org-card';
import { OrgListSkeleton } from '@features/auth/presentation/components/org-list-skeleton';
import { SelectOrgHeader } from '@features/auth/presentation/components/select-org-header';
import {
  useOrganisations,
  useOrgSwitch,
} from '@features/auth/presentation/hooks/use-organisations';
import { useTranslation } from '@lib/i18n';
import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { AsyncStateView, Spacer } from '@/components/ui';
import type { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LinkedOrganisationDto } from '@/src/proxy/models/linkedOrganisationDto';

/**
 * "Choose your team" screen shown after login when the user is linked to >1 org.
 */
export function SelectOrganisationScreen() {
  const { data: orgs, isLoading, isError, refetch } = useOrganisations();
  const switchOrg = useOrgSwitch();
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const { t } = useTranslation('auth');

  const handleSelect = (clubId: string) => {
    switchOrg(clubId);
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-background px-xl" testID={AUTH_TEST_IDS.selectOrg.screen}>
      <AsyncStateView<LinkedOrganisationDto[]>
        data={orgs}
        isLoading={isLoading}
        isError={isError}
        loadingView={<OrgListSkeleton />}
        errorTitle={t('selectOrg.errorTitle')}
        errorMessage={t('selectOrg.errorMessage')}
        errorActionLabel={t('selectOrg.retry')}
        onErrorAction={() => {
          void refetch();
        }}
        renderContent={(items) => (
          <FlatList
            data={items}
            keyExtractor={(item) => item.clubId}
            contentContainerClassName="flex-grow justify-center pb-2xl"
            ListHeaderComponent={<SelectOrgHeader scheme={scheme} />}
            ItemSeparatorComponent={Spacer}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <OrgCard
                org={item}
                onPress={() => handleSelect(item.clubId)}
                scheme={scheme}
                accessibilityLabel={t('selectOrg.selectAria', { name: item.clubName })}
              />
            )}
          />
        )}
      />
    </View>
  );
}
