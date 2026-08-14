/**
 * US timezone reference data for the Club timezone picker.
 *
 * the identity split mandates storing an IANA zone id (never a UTC offset, never auto-derived from state,
 * because several states straddle zones and Arizona skips DST). This data does NOT derive the
 * timezone from the state — it only *narrows* the choices: single-zone states auto-select their
 * one zone (still editable); straddling states surface all their zones for the user to resolve.
 *
 * US English only (per BRD), so these labels/names are reference data, not localized strings.
 */

/** The canonical US IANA zones, with human-friendly labels. */
export const US_ZONE_LABELS: Readonly<Record<string, string>> = {
  'America/New_York': 'Eastern Time (ET)',
  'America/Chicago': 'Central Time (CT)',
  'America/Denver': 'Mountain Time (MT)',
  'America/Phoenix': 'Mountain Time — no DST (Arizona)',
  'America/Los_Angeles': 'Pacific Time (PT)',
  'America/Anchorage': 'Alaska Time (AKT)',
  'Pacific/Honolulu': 'Hawaii Time (HST)',
};

export interface UsTimezoneOption {
  /** IANA zone id — this is what gets stored on the club. */
  id: string;
  /** Friendly display label. */
  label: string;
}

/** All US zones as picker options (used when no state is selected). */
export const US_TIMEZONE_OPTIONS: readonly UsTimezoneOption[] = Object.entries(US_ZONE_LABELS).map(
  ([id, label]) => ({ id, label }),
);

export interface UsState {
  /** Two-letter USPS code. */
  code: string;
  name: string;
  /** IANA zone(s) the state spans. One entry = single zone; more = straddling (user resolves). */
  zones: readonly string[];
}

const ET = 'America/New_York';
const CT = 'America/Chicago';
const MT = 'America/Denver';
const AZ = 'America/Phoenix';
const PT = 'America/Los_Angeles';
const AK = 'America/Anchorage';
const HI = 'Pacific/Honolulu';

/** 50 states + DC → their IANA zone(s). Straddling states list every zone they span. */
export const US_STATES: readonly UsState[] = [
  { code: 'AL', name: 'Alabama', zones: [CT] },
  { code: 'AK', name: 'Alaska', zones: [AK] },
  { code: 'AZ', name: 'Arizona', zones: [AZ, MT] }, // Navajo Nation observes DST (Mountain)
  { code: 'AR', name: 'Arkansas', zones: [CT] },
  { code: 'CA', name: 'California', zones: [PT] },
  { code: 'CO', name: 'Colorado', zones: [MT] },
  { code: 'CT', name: 'Connecticut', zones: [ET] },
  { code: 'DE', name: 'Delaware', zones: [ET] },
  { code: 'DC', name: 'District of Columbia', zones: [ET] },
  { code: 'FL', name: 'Florida', zones: [ET, CT] }, // panhandle is Central
  { code: 'GA', name: 'Georgia', zones: [ET] },
  { code: 'HI', name: 'Hawaii', zones: [HI] },
  { code: 'ID', name: 'Idaho', zones: [MT, PT] }, // northern panhandle is Pacific
  { code: 'IL', name: 'Illinois', zones: [CT] },
  { code: 'IN', name: 'Indiana', zones: [ET, CT] },
  { code: 'IA', name: 'Iowa', zones: [CT] },
  { code: 'KS', name: 'Kansas', zones: [CT, MT] },
  { code: 'KY', name: 'Kentucky', zones: [ET, CT] },
  { code: 'LA', name: 'Louisiana', zones: [CT] },
  { code: 'ME', name: 'Maine', zones: [ET] },
  { code: 'MD', name: 'Maryland', zones: [ET] },
  { code: 'MA', name: 'Massachusetts', zones: [ET] },
  { code: 'MI', name: 'Michigan', zones: [ET, CT] }, // western UP is Central
  { code: 'MN', name: 'Minnesota', zones: [CT] },
  { code: 'MS', name: 'Mississippi', zones: [CT] },
  { code: 'MO', name: 'Missouri', zones: [CT] },
  { code: 'MT', name: 'Montana', zones: [MT] },
  { code: 'NE', name: 'Nebraska', zones: [CT, MT] },
  { code: 'NV', name: 'Nevada', zones: [PT, MT] }, // West Wendover is Mountain
  { code: 'NH', name: 'New Hampshire', zones: [ET] },
  { code: 'NJ', name: 'New Jersey', zones: [ET] },
  { code: 'NM', name: 'New Mexico', zones: [MT] },
  { code: 'NY', name: 'New York', zones: [ET] },
  { code: 'NC', name: 'North Carolina', zones: [ET] },
  { code: 'ND', name: 'North Dakota', zones: [CT, MT] },
  { code: 'OH', name: 'Ohio', zones: [ET] },
  { code: 'OK', name: 'Oklahoma', zones: [CT] },
  { code: 'OR', name: 'Oregon', zones: [PT, MT] }, // Malheur County is Mountain
  { code: 'PA', name: 'Pennsylvania', zones: [ET] },
  { code: 'RI', name: 'Rhode Island', zones: [ET] },
  { code: 'SC', name: 'South Carolina', zones: [ET] },
  { code: 'SD', name: 'South Dakota', zones: [CT, MT] },
  { code: 'TN', name: 'Tennessee', zones: [ET, CT] },
  { code: 'TX', name: 'Texas', zones: [CT, MT] }, // El Paso area is Mountain
  { code: 'UT', name: 'Utah', zones: [MT] },
  { code: 'VT', name: 'Vermont', zones: [ET] },
  { code: 'VA', name: 'Virginia', zones: [ET] },
  { code: 'WA', name: 'Washington', zones: [PT] },
  { code: 'WV', name: 'West Virginia', zones: [ET] },
  { code: 'WI', name: 'Wisconsin', zones: [CT] },
  { code: 'WY', name: 'Wyoming', zones: [MT] },
];

/** Timezone options for a given state code — falls back to all US zones when unknown/empty. */
export function zoneOptionsForState(stateCode: string | null | undefined): UsTimezoneOption[] {
  const state = US_STATES.find((s) => s.code === stateCode);
  if (!state) return [...US_TIMEZONE_OPTIONS];
  return state.zones.map((id) => ({ id, label: US_ZONE_LABELS[id] ?? id }));
}
