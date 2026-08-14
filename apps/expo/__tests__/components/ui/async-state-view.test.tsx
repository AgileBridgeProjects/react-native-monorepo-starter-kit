import { View } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { AsyncStateViewProps } from '@/components/ui/async-state-view';
import { AsyncStateView } from '@/components/ui/async-state-view';

vi.mock('expo-image', () => ({
  Image: ({ testID }: { testID?: string }) => <View testID={testID ?? 'mock-image'} />,
}));

function renderAsyncStateView<T>(props: AsyncStateViewProps<T>) {
  let renderer: ReturnType<typeof create> | undefined;

  act(() => {
    renderer = create(<AsyncStateView {...props} />);
  });

  if (!renderer) {
    throw new Error('Expected async state view renderer to be created.');
  }

  return renderer;
}

describe('AsyncStateView', () => {
  it('renders the loading view when loading', () => {
    const renderer = renderAsyncStateView({
      data: null,
      isLoading: true,
      loadingView: <View testID="loading-view" />,
      renderContent: () => null,
    });

    const loadingView = renderer.root.findByProps({ testID: 'loading-view' });

    expect(loadingView).toBeTruthy();
  });

  it('renders the error state with an action when an error occurs', () => {
    const onRetry = vi.fn();
    const renderer = renderAsyncStateView({
      data: null,
      isLoading: false,
      isError: true,
      loadingView: <View />,
      errorTitle: 'Could not load',
      errorMessage: 'Please try again.',
      errorActionLabel: 'Try again',
      onErrorAction: onRetry,
      renderContent: () => null,
    });

    const button = renderer.root.findByProps({ accessibilityLabel: 'Try again' });

    act(() => {
      button.props.onPress();
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the content when data is available', () => {
    const renderer = renderAsyncStateView({
      data: { id: '1' },
      isLoading: false,
      loadingView: <View />,
      renderContent: (data) => <View testID={`content-${data.id}`} />,
    });

    const content = renderer.root.findByProps({ testID: 'content-1' });

    expect(content).toBeTruthy();
  });

  it('renders the errorImage when provided in error state', () => {
    const renderer = renderAsyncStateView({
      data: null,
      isLoading: false,
      isError: true,
      loadingView: <View />,
      errorImage: { uri: 'https://example.com/error.png' },
      renderContent: () => null,
    });

    const image = renderer.root.findByProps({ testID: 'mock-image' });

    expect(image).toBeTruthy();
  });

  it('renders the emptyImage when provided in empty state', () => {
    const renderer = renderAsyncStateView({
      data: [],
      isLoading: false,
      isEmpty: true,
      loadingView: <View />,
      emptyImage: { uri: 'https://example.com/empty.png' },
      renderContent: () => null,
    });

    const image = renderer.root.findByProps({ testID: 'mock-image' });

    expect(image).toBeTruthy();
  });
});
