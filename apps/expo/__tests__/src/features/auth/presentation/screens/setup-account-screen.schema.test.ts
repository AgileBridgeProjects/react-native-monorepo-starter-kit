import { createSetupSchema } from '@features/auth/presentation/screens/setup-account-screen.schema';
import { describe, expect, it } from 'vitest';

// Passthrough translator — assert on the message key the schema requests.
const t = (key: string) => key;
const schema = createSetupSchema(t);

describe('createSetupSchema', () => {
  it('accepts a complex password that matches its confirmation', () => {
    const result = schema.safeParse({ password: 'Passw0rd!', confirmPassword: 'Passw0rd!' });
    expect(result.success).toBeTruthy();
  });

  it('rejects an empty password as required', () => {
    const result = schema.safeParse({ password: '', confirmPassword: '' });
    expect(result.success).toBeFalsy();
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('validation.passwordRequired');
    }
  });

  it('rejects a password that fails the complexity rule', () => {
    const result = schema.safeParse({ password: 'password', confirmPassword: 'password' });
    expect(result.success).toBeFalsy();
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === 'validation.passwordComplexity'),
      ).toBeTruthy();
    }
  });

  it('requires the confirmation field', () => {
    const result = schema.safeParse({ password: 'Passw0rd!', confirmPassword: '' });
    expect(result.success).toBeFalsy();
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('validation.confirmPasswordRequired');
    }
  });

  it('rejects mismatched passwords and targets the confirmPassword field', () => {
    const result = schema.safeParse({ password: 'Passw0rd!', confirmPassword: 'Different1!' });
    expect(result.success).toBeFalsy();
    if (!result.success) {
      const mismatch = result.error.issues.find((i) => i.message === 'validation.passwordMismatch');
      expect(mismatch).toBeTruthy();
      expect(mismatch?.path).toEqual(['confirmPassword']);
    }
  });
});
