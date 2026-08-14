import { Image, type ImageSource } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/src/lib/cn';
import { Button } from './button';
import { Icon } from './icon';
import type { IconSymbolName } from './icon-symbol';
import { Typography } from './typography';

interface AsyncStateViewProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  loadingView: ReactNode;
  renderContent: (data: T) => ReactNode;
  errorTitle?: string;
  errorMessage?: string | null;
  errorActionLabel?: string;
  onErrorAction?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyImage?: ImageSource | number;
  emptyIconName?: IconSymbolName;
  errorImage?: ImageSource | number;
  stateContainerClassName?: string;
  testID?: string;
  /** Wrap the error state node (e.g. in a ScrollView with RefreshControl). */
  errorWrapper?: (children: ReactNode) => ReactNode;
  /** Wrap the empty state node (e.g. in a ScrollView with RefreshControl). */
  emptyWrapper?: (children: ReactNode) => ReactNode;
}

export function AsyncStateView<T>({
  data,
  isLoading,
  isError = false,
  isEmpty = false,
  loadingView,
  renderContent,
  errorTitle,
  errorMessage,
  errorActionLabel,
  onErrorAction,
  emptyTitle,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  emptyImage,
  emptyIconName,
  errorImage,
  stateContainerClassName,
  testID,
  errorWrapper,
  emptyWrapper,
}: AsyncStateViewProps<T>) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  if (isLoading) {
    return loadingView;
  }

  if (isError || (data == null && !isEmpty)) {
    const errorStateIcon = errorImage ? (
      <Image source={errorImage} style={{ height: 200, width: 200 }} contentFit="contain" />
    ) : (
      <Icon name="xmark.circle.fill" size={iconSize.lg} color={colors[colorScheme].textMuted} />
    );
    const errorContent = (
      <View
        className={cn('flex-1 items-center justify-center px-xl py-2xl', stateContainerClassName)}
        testID={testID}
      >
        {errorStateIcon}
        {errorTitle ? (
          <Typography variant="h3" className="mt-md text-center">
            {errorTitle}
          </Typography>
        ) : null}
        {errorMessage ? (
          <Typography variant="body" className="mt-xs text-center text-text-secondary">
            {errorMessage}
          </Typography>
        ) : null}
        {errorActionLabel && onErrorAction ? (
          <Button variant="outline" className="mt-lg" onPress={onErrorAction}>
            {errorActionLabel}
          </Button>
        ) : null}
      </View>
    );
    return errorWrapper ? errorWrapper(errorContent) : errorContent;
  }

  if (isEmpty) {
    const emptyStateIcon = emptyImage ? (
      <Image source={emptyImage} style={{ height: 200, width: 200 }} contentFit="contain" />
    ) : (
      <Icon
        name={emptyIconName ?? 'magnifyingglass'}
        size={iconSize.lg}
        color={colors[colorScheme].textMuted}
      />
    );
    const emptyContent = (
      <View
        className={cn('flex-1 items-center justify-center px-xl py-2xl', stateContainerClassName)}
        testID={testID}
      >
        {emptyStateIcon}
        {emptyTitle ? (
          <Typography variant="h3" className="mt-md text-center">
            {emptyTitle}
          </Typography>
        ) : null}
        {emptyMessage ? (
          <Typography variant="body" className="mt-xs text-center text-text-secondary">
            {emptyMessage}
          </Typography>
        ) : null}
        {emptyActionLabel && onEmptyAction ? (
          <Button variant="outline" className="mt-lg" onPress={onEmptyAction}>
            {emptyActionLabel}
          </Button>
        ) : null}
      </View>
    );
    return emptyWrapper ? emptyWrapper(emptyContent) : emptyContent;
  }

  return <>{data != null ? renderContent(data as T) : null}</>;
}

export type { AsyncStateViewProps };
