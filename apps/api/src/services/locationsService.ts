import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Pincode {
  pincode: string;
  area: string;
  district: string;
  state: string;
}

// Lazy-loaded cache — we read the JSON once on first access, then reuse.
let _data: Pincode[] | null = null;

function getData(): Pincode[] {
  if (_data === null) {
    const filePath = path.join(__dirname, '../data/pincodes.json');
    if (!fs.existsSync(filePath)) {
      console.warn('[locationsService] pincodes.json missing — run npm run db:pincodes');
      _data = [];
      return _data;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    _data = JSON.parse(raw) as Pincode[];
  }
  return _data;
}

export const locationsService = {
  /**
   * Search pincodes by query string.
   *
   * Rules:
   * - Returns [] if query is < 2 characters.
   * - If query is exactly 6 digits, returns the single matching pincode entry (or []).
   * - Otherwise, substring-matches on area or district (case-insensitive), capped at 10.
   */
  search(query: string): Pincode[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const data = getData();

    // Exact 6-digit pincode lookup
    if (/^\d{6}$/.test(q)) {
      const match = data.find((p) => p.pincode === q);
      return match ? [match] : [];
    }

    // Substring match on area or district, case-insensitive, capped at 10
    const results: Pincode[] = [];
    for (const p of data) {
      if (
        p.area.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q)
      ) {
        results.push(p);
        if (results.length === 10) break;
      }
    }
    return results;
  },

  /**
   * Look up a single pincode record by its exact 6-digit pincode string.
   * Returns null if not found.
   */
  byPincode(pincode: string): Pincode | null {
    const data = getData();
    return data.find((p) => p.pincode === pincode) ?? null;
  },
};
