import {
  US_STATES,
  US_TIMEZONE_OPTIONS,
  zoneOptionsForState,
} from '@features/clubs/presentation/utils/us-timezones';
import { describe, expect, it } from 'vitest';

describe('us-timezones', () => {
  describe('US_STATES', () => {
    it('covers 50 states plus DC with unique codes', () => {
      expect(US_STATES).toHaveLength(51);
      const codes = new Set(US_STATES.map((s) => s.code));
      expect(codes.size).toBe(51);
    });

    it('gives every state at least one IANA zone', () => {
      for (const state of US_STATES) {
        expect(state.zones.length).toBeGreaterThan(0);
        for (const zone of state.zones) {
          expect(zone).toMatch(/^(America|Pacific)\//);
        }
      }
    });
  });

  describe('US_TIMEZONE_OPTIONS', () => {
    it('exposes the seven canonical US zones, not the full IANA set', () => {
      expect(US_TIMEZONE_OPTIONS).toHaveLength(7);
      expect(US_TIMEZONE_OPTIONS.map((o) => o.id)).toContain('America/New_York');
    });
  });

  describe('zoneOptionsForState', () => {
    it('returns a single zone for a single-zone state (auto-select case)', () => {
      const options = zoneOptionsForState('CA');
      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('America/Los_Angeles');
    });

    it('returns multiple zones for a straddling state so the user resolves it', () => {
      const options = zoneOptionsForState('TN');
      expect(options.map((o) => o.id)).toEqual(['America/New_York', 'America/Chicago']);
    });

    it('falls back to all US zones for unknown/null state', () => {
      expect(zoneOptionsForState(null)).toHaveLength(US_TIMEZONE_OPTIONS.length);
      expect(zoneOptionsForState('ZZ')).toHaveLength(US_TIMEZONE_OPTIONS.length);
    });

    it('labels each option with a friendly name', () => {
      expect(zoneOptionsForState('CA')[0].label).toBe('Pacific Time (PT)');
    });
  });
});
