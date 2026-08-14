import {
  ClubAlreadyExistsFailure,
  ClubNotFoundFailure,
} from '@features/clubs/domain/failures/club-failures';
import { getErrorMessage } from '@lib/error-message';

describe('getErrorMessage', () => {
  const t = (key: string, options?: Record<string, unknown>) => {
    if (key === 'errors:club.notFound') {
      return `Club "${options?.id}" was not found.`;
    }

    if (key === 'errors:club.alreadyExists') {
      return `A club named "${options?.name}" already exists.`;
    }

    if (key === 'errors:genericError') {
      return 'Something went wrong. Please try again.';
    }

    return key;
  };

  it('interpolates translation values for domain failures', () => {
    expect(getErrorMessage(new ClubNotFoundFailure('123'), t)).toBe('Club "123" was not found.');
    expect(getErrorMessage(new ClubAlreadyExistsFailure('Acme'), t)).toBe(
      'A club named "Acme" already exists.',
    );
  });

  it('returns the fallback for non-domain errors', () => {
    expect(getErrorMessage(new Error('boom'), t)).toBe('Something went wrong. Please try again.');
  });
});
