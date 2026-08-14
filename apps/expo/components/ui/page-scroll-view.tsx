import { toTestId } from '@starterkit/shared';
import type { ReactNode } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView, View } from 'react-native';

import { cn } from '@/src/lib/cn';

import { BackButton } from './back-button';
import { Typography } from './typography';

interface PageScrollViewProps extends Omit<ScrollViewProps, 'children'> {
  title: string;
  description?: string;
  children: ReactNode;
  contentContainerClassName?: string;
  showBack?: boolean;
}

export function PageScrollView({
  title,
  description,
  children,
  contentContainerClassName,
  showBack,
  ...scrollViewProps
}: PageScrollViewProps) {
  const titleTestID = toTestId(title, 'title');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName={cn('gap-lg px-lg py-lg', contentContainerClassName)}
      contentInsetAdjustmentBehavior="automatic"
      {...scrollViewProps}
    >
      {showBack && <BackButton />}

      <View className="gap-xs">
        <Typography variant="h1" testID={titleTestID}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body" className="text-text-secondary">
            {description}
          </Typography>
        )}
      </View>

      {children}
    </ScrollView>
  );
}

export type { PageScrollViewProps };
