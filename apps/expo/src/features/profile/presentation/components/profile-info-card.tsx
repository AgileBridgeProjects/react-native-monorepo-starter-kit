import { useTranslation } from '@lib/i18n';
import { View } from 'react-native';
import { Icon, Typography } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ProfileInfoProps {
  name: string;
  email: string;
  memberSince: string;
}

export function ProfileInfoCard({ name, email, memberSince }: ProfileInfoProps) {
  const { t } = useTranslation('profile');
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  return (
    <View className="gap-md rounded-2xl border border-border bg-background p-lg">
      <View className="flex-row items-center gap-md">
        <Avatar name={name} size="xl" textClassName="text-xl" />

        <View className="flex-1 gap-xs">
          <View className="flex-row items-center gap-xs">
            <Typography variant="h3">{name}</Typography>
            <Icon name="pencil" size={iconSize.sm} color={colors[colorScheme].icon} />
          </View>

          <Typography variant="body" className="text-text-secondary">
            {email}
          </Typography>
          <Typography variant="caption">{t('memberSince', { date: memberSince })}</Typography>
        </View>
      </View>
    </View>
  );
}
