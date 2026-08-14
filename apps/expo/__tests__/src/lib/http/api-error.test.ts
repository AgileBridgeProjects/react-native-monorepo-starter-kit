import { ApiError } from '@lib/http/api-error';
import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

describe('ApiError', () => {
  describe('constructor', () => {
    it('sets status, message, and name', () => {
      const error = new ApiError(404, 'Not found');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('ApiError');
    });

    it('is an instance of Error', () => {
      const error = new ApiError(500, 'Server error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe('fromAxiosError', () => {
    it('maps a response error to ApiError', () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized', code: 'AUTH_001' },
        },
        message: 'Request failed with status code 401',
      } as unknown as AxiosError;

      const error = ApiError.fromAxiosError(axiosError);
      expect(error.status).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('AUTH_001');
    });

    it('falls back to axios message when response has no data.message', () => {
      const axiosError = {
        response: { status: 500, data: {} },
        message: 'Network Error',
      } as unknown as AxiosError;

      const error = ApiError.fromAxiosError(axiosError);
      expect(error.message).toBe('Network Error');
    });

    it('uses ProblemDetails.detail when message and field errors are absent', () => {
      const axiosError = {
        response: {
          status: 400,
          data: { title: 'Bad Request', detail: 'This setup link has already been used.' },
        },
        message: 'Request failed with status code 400',
      } as unknown as AxiosError;

      const error = ApiError.fromAxiosError(axiosError);
      expect(error.message).toBe('This setup link has already been used.');
    });

    it('prefers ProblemDetails.detail over the generic title', () => {
      const axiosError = {
        response: {
          status: 400,
          data: { title: 'Bad Request', detail: 'This setup link has expired.' },
        },
        message: 'Request failed with status code 400',
      } as unknown as AxiosError;

      const error = ApiError.fromAxiosError(axiosError);
      expect(error.message).toBe('This setup link has expired.');
    });

    it('uses status 0 for network errors with no response', () => {
      const axiosError = {
        response: undefined,
        message: 'Network Error',
      } as unknown as AxiosError;

      const error = ApiError.fromAxiosError(axiosError);
      expect(error.status).toBe(0);
      expect(error.isNetworkError).toBeTruthy();
    });
  });

  describe('status getters', () => {
    it.each([
      [401, 'isUnauthorized'],
      [403, 'isForbidden'],
      [404, 'isNotFound'],
      [409, 'isConflict'],
      [422, 'isUnprocessable'],
      [500, 'isServerError'],
      [0, 'isNetworkError'],
    ] as const)('status %i sets %s to true', (status, getter) => {
      const error = new ApiError(status, 'test');
      expect(error[getter]).toBeTruthy();
    });
  });
});
