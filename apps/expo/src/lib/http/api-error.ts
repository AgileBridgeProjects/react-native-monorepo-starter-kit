import type { AxiosError } from 'axios';

interface ApiErrorResponseData {
  message?: string;
  /** ASP.NET Core ProblemDetails / ValidationProblemDetails */
  title?: string;
  /** The specific, human-readable reason — set via `ProblemDetails.Detail` server-side. */
  detail?: string;
  errors?: Record<string, string[]>;
  code?: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromAxiosError(error: AxiosError): ApiError {
    const data = error.response?.data as ApiErrorResponseData | undefined;
    const status = error.response?.status ?? 0;

    // Prefer explicit message, then the first field error from ValidationProblemDetails,
    // then ProblemDetails.Detail (the specific reason), then the generic problem title,
    // then the raw axios message.
    const firstFieldError = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
    const message =
      data?.message ??
      firstFieldError ??
      data?.detail ??
      data?.title ??
      error.message ??
      'An unknown error occurred.';

    const code = data?.code;
    const details = data?.details;
    return new ApiError(status, message, code, details);
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isUnprocessable(): boolean {
    return this.status === 422;
  }
  get isServerError(): boolean {
    return this.status >= 500;
  }
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}
