import { useSendHelpEmail } from '@features/profile/presentation/hooks/use-help';
import { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeHelpRequest } from '@/test/factories/profile.factory';
import { renderHook } from '@/test/utils/render-hook';

const sendHelpEmail = vi.fn();
vi.mock('@features/profile/infrastructure/help.datasource', () => ({
  HelpDataSource: vi.fn(() => ({
    sendHelpEmail: (...args: unknown[]) => sendHelpEmail(...args),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSendHelpEmail', () => {
  it('is idle before any mutation runs', () => {
    const { result } = renderHook(() => useSendHelpEmail());
    expect(result.current.isPending).toBeFalsy();
    expect(result.current.isSuccess).toBeFalsy();
    expect(result.current.isError).toBeFalsy();
  });

  it('forwards the subject/body to the datasource and resolves on success', async () => {
    sendHelpEmail.mockResolvedValue(undefined);
    const { result, rerender } = renderHook(() => useSendHelpEmail());
    const payload = makeHelpRequest({ subject: 'Hi', body: 'Need a hand here.' });

    await act(async () => {
      await result.current.mutateAsync(payload);
    });
    rerender();

    expect(sendHelpEmail).toHaveBeenCalledWith(payload);
    expect(result.current.isSuccess).toBeTruthy();
  });

  it('enters the error state when the datasource rejects', async () => {
    sendHelpEmail.mockRejectedValue(new Error('send failed'));
    const { result, rerender } = renderHook(() => useSendHelpEmail());

    await act(async () => {
      await result.current.mutateAsync(makeHelpRequest()).catch(() => {});
    });
    rerender();

    expect(result.current.isError).toBeTruthy();
    expect(result.current.error?.message).toBe('send failed');
  });
});
