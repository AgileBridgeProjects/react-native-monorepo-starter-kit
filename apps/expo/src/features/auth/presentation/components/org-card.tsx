import { AUTH_TEST_IDS } from '@features/auth/presentation/auth.copy';
import { iconSize } from '@starterkit/shared';
import { Image } from 'expo-image';
import type React from 'react';
import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors } from '@/constants/tokens';
import type { LinkedOrganisationDto } from '@/src/proxy/models/linkedOrganisationDto';

interface OrgCardProps {
  org: LinkedOrganisationDto;
  onPress: () => void;
  scheme: keyof typeof colors;
  accessibilityLabel: string;
}

export function OrgCard({ org, onPress, scheme, accessibilityLabel }: OrgCardProps) {
  let logo: React.ReactNode;
  if (org.clubLogoUrl) {
    logo = (
      <Image
        source={{ uri: org.clubLogoUrl }}
        className="h-12 w-12"
        contentFit="contain"
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
      />
    );
  } else {
    logo = (
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary">
        <Typography variant="h3" className="text-primary-foreground">
          {org.clubName.charAt(0).toUpperCase()}
        </Typography>
      </View>
    );
  }

  return (
    <Pressable
      testID={AUTH_TEST_IDS.selectOrg.orgItem(org.clubId)}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="min-h-18 w-full max-w-auth-form flex-row items-center rounded-2xl border border-border bg-surface-elevated px-lg py-md"
    >
      {logo}

      <View className="ml-md flex-1">
        <Typography variant="h4" className="text-text">
          {org.clubName}
        </Typography>
      </View>

      <IconSymbol name="chevron.right" size={iconSize.xs} color={colors[scheme].textMuted} />
    </Pressable>
  );
}
