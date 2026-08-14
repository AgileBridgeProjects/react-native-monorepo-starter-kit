import {
  ClubAlreadyExistsFailure,
  ClubNotFoundFailure,
} from '@features/clubs/domain/failures/club-failures';
import { describe, expect, it } from 'vitest';

describe('ClubNotFoundFailure', () => {
  it('is an instance of Error', () => {
    const failure = new ClubNotFoundFailure('club-1');
    expect(failure).toBeInstanceOf(Error);
  });

  it('has the correct name', () => {
    const failure = new ClubNotFoundFailure('club-1');
    expect(failure.name).toBe('ClubNotFoundFailure');
  });

  it('carries the club id in translationValues', () => {
    const failure = new ClubNotFoundFailure('club-99');
    expect(failure.translationValues.id).toBe('club-99');
  });

  it('uses the i18n key as message', () => {
    const failure = new ClubNotFoundFailure('club-1');
    expect(failure.message).toBe('errors:club.notFound');
  });
});

describe('ClubAlreadyExistsFailure', () => {
  it('is an instance of Error', () => {
    const failure = new ClubAlreadyExistsFailure('Acme');
    expect(failure).toBeInstanceOf(Error);
  });

  it('has the correct name', () => {
    const failure = new ClubAlreadyExistsFailure('Acme');
    expect(failure.name).toBe('ClubAlreadyExistsFailure');
  });

  it('carries the club name in translationValues', () => {
    const failure = new ClubAlreadyExistsFailure('Duplicate Co');
    expect(failure.translationValues.name).toBe('Duplicate Co');
  });

  it('uses the i18n key as message', () => {
    const failure = new ClubAlreadyExistsFailure('Acme');
    expect(failure.message).toBe('errors:club.alreadyExists');
  });
});
