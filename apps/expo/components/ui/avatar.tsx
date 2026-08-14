import { getUserInitials } from '@features/auth/presentation/utils/auth.utils';
import { useTranslation } from '@lib/i18n';
import { cva, type VariantProps } from 'class-variance-authority';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { cn } from '@/src/lib/cn';

import { Typography } from './typography';

const avatarVariants = cva('items-center justify-center rounded-full border', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary/20',
      ranked: 'border-border bg-surface-elevated',
      podium: 'border-white/30 bg-white/20',
    },
    size: {
      sm: 'h-10 w-10',
      md: 'h-11 w-11',
      lg: 'h-14 w-14',
      xl: 'h-20 w-20',
      xxl: 'h-24 w-24',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const avatarTextVariants = cva('font-bold', {
  variants: {
    variant: {
      default: 'text-primary',
      ranked: 'text-text',
      podium: 'text-white',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      xxl: 'text-2xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const rankBadgeVariants = cva(
  'absolute bottom-0 left-1/2 translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface',
  {
    variants: {
      size: {
        sm: 'h-6 w-6',
        md: 'h-7 w-7',
        lg: 'h-8 w-8',
        xl: 'h-10 w-10',
        xxl: 'h-12 w-12',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

const rankBadgeTextVariants = cva('font-bold text-text', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      xxl: 'text-2xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;
type AvatarVariant = NonNullable<VariantProps<typeof avatarVariants>['variant']>;

export interface AvatarProps {
  name?: string;
  initials?: string;
  uri?: string;
  onAvatarPress?: () => void;
  avatarTestID?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  rank?: number;
  className?: string;
  textClassName?: string;
}

export function Avatar({
  name,
  initials,
  uri,
  onAvatarPress,
  avatarTestID,
  size = 'md',
  variant = 'default',
  rank,
  className,
  textClassName,
}: AvatarProps) {
  const { t } = useTranslation('home');
  const resolvedInitials = initials ?? (name ? getUserInitials(name) : '');
  const accessibilityLabel = onAvatarPress
    ? `${t('profileLabel')}: ${resolvedInitials}`
    : resolvedInitials;

  const content = (
    <View className="relative">
      <View className={cn(avatarVariants({ size, variant }), className)}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%', borderRadius: 9999 }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Typography
            variant="body-sm"
            className={cn(avatarTextVariants({ size, variant }), textClassName)}
          >
            {resolvedInitials}
          </Typography>
        )}
      </View>

      {typeof rank === 'number' && (
        <View className={rankBadgeVariants({ size })}>
          <Typography variant="body-sm" className={rankBadgeTextVariants({ size })}>
            {rank}
          </Typography>
        </View>
      )}
    </View>
  );

  if (!onAvatarPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel} testID={avatarTestID}>
        {content}
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-sm">
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onAvatarPress}
        testID={avatarTestID}
      >
        {content}
      </Pressable>
    </View>
  );
}

export type { AvatarSize, AvatarVariant };
