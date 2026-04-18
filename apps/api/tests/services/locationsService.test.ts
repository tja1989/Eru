import { describe, it, expect } from 'vitest';
import { locationsService } from '../../src/services/locationsService.js';

describe('locationsService', () => {
  describe('search()', () => {
    it('returns empty array for query shorter than 2 characters', () => {
      expect(locationsService.search('')).toEqual([]);
      expect(locationsService.search('e')).toEqual([]);
    });

    it('returns results for case-insensitive substring match on area', () => {
      const results = locationsService.search('ernakulam');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.district === 'Ernakulam' || r.area.toLowerCase().includes('ernakulam'))).toBe(true);
    });

    it('returns results for case-insensitive substring match on district', () => {
      // "Bengaluru Urban" is the district for Bangalore entries
      const results = locationsService.search('bengaluru');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.district.toLowerCase().includes('bengaluru') || r.area.toLowerCase().includes('bengaluru'))).toBe(true);
    });

    it('is case-insensitive (uppercase query)', () => {
      const lower = locationsService.search('ernakulam');
      const upper = locationsService.search('ERNAKULAM');
      expect(upper).toEqual(lower);
    });

    it('caps results at 10 entries (Bangalore has 11+ in fixture)', () => {
      // The fixture has 10 Bangalore entries (560001-560010), all matching "Bangalore"
      const results = locationsService.search('Bangalore');
      expect(results.length).toBeLessThanOrEqual(10);
      expect(results.length).toBe(10);
    });

    it('returns the exact pincode entry for a 6-digit pincode query', () => {
      const results = locationsService.search('682016');
      expect(results).toHaveLength(1);
      expect(results[0].pincode).toBe('682016');
      expect(results[0].area).toBe('Ernakulam Central');
      expect(results[0].district).toBe('Ernakulam');
      expect(results[0].state).toBe('Kerala');
    });

    it('returns empty array for an exact pincode that does not exist', () => {
      const results = locationsService.search('999999');
      expect(results).toEqual([]);
    });
  });

  describe('byPincode()', () => {
    it('returns the matching record for a known pincode', () => {
      const record = locationsService.byPincode('682016');
      expect(record).not.toBeNull();
      expect(record?.pincode).toBe('682016');
      expect(record?.area).toBe('Ernakulam Central');
    });

    it('returns null for an unknown pincode', () => {
      const record = locationsService.byPincode('000000');
      expect(record).toBeNull();
    });
  });
});
