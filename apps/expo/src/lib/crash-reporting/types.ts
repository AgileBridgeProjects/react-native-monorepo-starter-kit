export interface CrashReporter {
  recordError(error: Error, context?: Record<string, string>): void;
  log(message: string): void;
  setUserId(id: string | null): void;
  setAttribute(key: string, value: string): void;
}
