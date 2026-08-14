import { AuditLogNotFoundFailure } from '@features/audit-log/domain/failures/audit-log-failures';
import { describe, expect, it } from 'vitest';

describe('AuditLogNotFoundFailure', () => {
  it('is an instance of Error', () => {
    const failure = new AuditLogNotFoundFailure('audit-1');
    expect(failure).toBeInstanceOf(Error);
  });

  it('has the correct name', () => {
    const failure = new AuditLogNotFoundFailure('audit-1');
    expect(failure.name).toBe('AuditLogNotFoundFailure');
  });

  it('includes the id in the message', () => {
    const failure = new AuditLogNotFoundFailure('audit-99');
    expect(failure.message).toContain('audit-99');
  });
});
