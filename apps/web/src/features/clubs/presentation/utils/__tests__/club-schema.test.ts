import { clubSchema } from '../club-schema';

// A minimal object that satisfies every required field. Spread it and override
// the field under test so each case exercises one rule in isolation.
const valid = { name: 'Acme Corp', streetAddress: '123 Main St', city: 'Denver', state: 'CO' };

describe('clubSchema', () => {
  describe('name', () => {
    it('accepts a valid name', () => {
      const result = clubSchema.safeParse({ ...valid, name: 'Acme Corp' });
      expect(result.success).toBe(true);
    });

    it('rejects an empty name', () => {
      const result = clubSchema.safeParse({ ...valid, name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects a name exceeding max length', () => {
      const result = clubSchema.safeParse({ ...valid, name: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('streetAddress', () => {
    it('accepts a valid street address', () => {
      const result = clubSchema.safeParse({ ...valid, streetAddress: '1 Beach Rd' });
      expect(result.success).toBe(true);
    });

    it('rejects a missing street address', () => {
      const result = clubSchema.safeParse({ name: 'Acme Corp', city: 'Denver', state: 'CO' });
      expect(result.success).toBe(false);
    });

    it('rejects an empty street address', () => {
      const result = clubSchema.safeParse({ ...valid, streetAddress: '' });
      expect(result.success).toBe(false);
    });

    it('rejects a street address exceeding max length', () => {
      const result = clubSchema.safeParse({ ...valid, streetAddress: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });
  });

  describe('city', () => {
    it('rejects an empty city', () => {
      const result = clubSchema.safeParse({ ...valid, city: '' });
      expect(result.success).toBe(false);
    });

    it('rejects a city exceeding max length', () => {
      const result = clubSchema.safeParse({ ...valid, city: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('state', () => {
    it('accepts a two-letter USPS code', () => {
      const result = clubSchema.safeParse({ ...valid, state: 'TX' });
      expect(result.success).toBe(true);
    });

    it('rejects an empty state', () => {
      const result = clubSchema.safeParse({ ...valid, state: '' });
      expect(result.success).toBe(false);
    });

    it('rejects a lowercase or long value', () => {
      expect(clubSchema.safeParse({ ...valid, state: 'tx' }).success).toBe(false);
      expect(clubSchema.safeParse({ ...valid, state: 'Texas' }).success).toBe(false);
    });
  });

  describe('zipCode', () => {
    it('accepts a five-digit ZIP', () => {
      const result = clubSchema.safeParse({ ...valid, zipCode: '80202' });
      expect(result.success).toBe(true);
    });

    it('accepts a ZIP+4', () => {
      const result = clubSchema.safeParse({ ...valid, zipCode: '80202-1234' });
      expect(result.success).toBe(true);
    });

    it('accepts an empty string (optional)', () => {
      const result = clubSchema.safeParse({ ...valid, zipCode: '' });
      expect(result.success).toBe(true);
    });

    it('rejects a malformed ZIP', () => {
      const result = clubSchema.safeParse({ ...valid, zipCode: '1234' });
      expect(result.success).toBe(false);
    });
  });

  describe('timezone', () => {
    it('accepts an IANA timezone id', () => {
      const result = clubSchema.safeParse({ ...valid, timezone: 'America/New_York' });
      expect(result.success).toBe(true);
    });

    it('accepts an empty string (no timezone)', () => {
      const result = clubSchema.safeParse({ ...valid, timezone: '' });
      expect(result.success).toBe(true);
    });

    it('accepts null', () => {
      const result = clubSchema.safeParse({ ...valid, timezone: null });
      expect(result.success).toBe(true);
    });
  });

  describe('maxAthletes', () => {
    it('accepts a positive integer', () => {
      const result = clubSchema.safeParse({ ...valid, maxAthletes: 50 });
      expect(result.success).toBe(true);
    });

    it('accepts null', () => {
      const result = clubSchema.safeParse({ ...valid, maxAthletes: null });
      expect(result.success).toBe(true);
    });

    it('rejects zero', () => {
      const result = clubSchema.safeParse({ ...valid, maxAthletes: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative values', () => {
      const result = clubSchema.safeParse({ ...valid, maxAthletes: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('logoUrl', () => {
    it('accepts a valid https URL', () => {
      const result = clubSchema.safeParse({
        ...valid,
        logoUrl: 'https://cdn.example.com/logo.png',
      });
      expect(result.success).toBe(true);
    });

    it('accepts an empty string (no logo)', () => {
      const result = clubSchema.safeParse({ ...valid, logoUrl: '' });
      expect(result.success).toBe(true);
    });

    it('accepts null (no logo)', () => {
      const result = clubSchema.safeParse({ ...valid, logoUrl: null });
      expect(result.success).toBe(true);
    });

    it('accepts undefined (optional)', () => {
      const result = clubSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('accepts a non-URL string (server-set blob path)', () => {
      const result = clubSchema.safeParse({ ...valid, logoUrl: 'not-a-url' });
      expect(result.success).toBe(true);
    });
  });

  describe('teams', () => {
    it('accepts an array of teams with name + optional logo', () => {
      const result = clubSchema.safeParse({
        ...valid,
        teams: [{ name: 'U15 Boys', logoUrl: 'logos/u15.png' }, { name: 'U17 Girls' }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts an empty array', () => {
      const result = clubSchema.safeParse({ ...valid, teams: [] });
      expect(result.success).toBe(true);
    });

    it('accepts undefined (optional)', () => {
      const result = clubSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
