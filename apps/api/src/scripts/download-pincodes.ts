/**
 * download-pincodes.ts
 *
 * Converts a manually-downloaded India Post pincode CSV into the pincodes.json
 * fixture used by locationsService.
 *
 * HOW TO USE:
 *   1. Download the full India Post pincode dataset CSV manually from a public
 *      source (e.g. https://data.gov.in/resource/all-india-pincode-directory)
 *      and save it as `src/data/pincodes-raw.csv` in the api package root.
 *   2. Run: npm run db:pincodes
 *   3. The script reads the CSV, normalises column names, and writes
 *      `src/data/pincodes.json` — replacing the small handcrafted fixture.
 *
 * Expected CSV columns (case-insensitive):
 *   pincode, officename (→ area), districtname (→ district), statename (→ state)
 *
 * The output JSON is the array format consumed by locationsService.ts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_CSV = path.join(__dirname, '../data/pincodes-raw.csv');
const OUTPUT_JSON = path.join(__dirname, '../data/pincodes.json');

if (!fs.existsSync(INPUT_CSV)) {
  console.error(`ERROR: Input file not found at ${INPUT_CSV}`);
  console.error('Please download the India Post pincode CSV manually (see script header).');
  process.exit(1);
}

const raw = fs.readFileSync(INPUT_CSV, 'utf-8');
const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

if (lines.length < 2) {
  console.error('ERROR: CSV appears empty or has no data rows.');
  process.exit(1);
}

// Parse header row to find column indices (case-insensitive)
const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
const idx = (name: string) => headers.indexOf(name);

const pincodeIdx = idx('pincode');
const areaIdx = idx('officename');
const districtIdx = idx('districtname');
const stateIdx = idx('statename');

if ([pincodeIdx, areaIdx, districtIdx, stateIdx].some((i) => i === -1)) {
  console.error('ERROR: Could not find expected columns in CSV header.');
  console.error('Header found:', headers);
  process.exit(1);
}

const records: Array<{ pincode: string; area: string; district: string; state: string }> = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
  const pincode = cols[pincodeIdx]?.trim();
  const area = cols[areaIdx]?.trim();
  const district = cols[districtIdx]?.trim();
  const state = cols[stateIdx]?.trim();

  if (!pincode || !/^\d{6}$/.test(pincode)) continue;
  if (!area || !district || !state) continue;

  records.push({ pincode, area, district, state });
}

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(records, null, 2), 'utf-8');
console.log(`Written ${records.length} pincode records to ${OUTPUT_JSON}`);
