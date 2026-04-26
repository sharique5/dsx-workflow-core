/**
 * eCourts CNR (Case Number Record) parser.
 *
 * CNR format: [State(2)][CourtType(2)][EstCode(2)][Serial(6)][Year(4)] = 16 chars
 * e.g. MPHC020312152025
 *      MP = Madhya Pradesh, HC = High Court, 02 = Indore bench
 */

export interface CnrInfo {
  cnr: string;
  state: string;
  courtType: string;
  court: string;
  bench?: string;
  year: string;
}

const STATE_CODES: Record<string, string> = {
  AN: 'Andaman & Nicobar',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  CH: 'Chandigarh',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HP: 'Himachal Pradesh',
  HR: 'Haryana',
  JH: 'Jharkhand',
  JK: 'Jammu & Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  TS: 'Telangana',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
};

const COURT_TYPES: Record<string, string> = {
  HC: 'High Court',
  DC: 'District Court',
  CC: 'City Civil Court',
  SC: 'Sessions Court',
  FC: 'Family Court',
  LC: 'Labour Court',
};

// State-specific bench mappings keyed by establishment code
const HC_BENCHES: Record<string, Record<string, string>> = {
  MP: { '01': 'Jabalpur', '02': 'Indore', '03': 'Gwalior' },
  MH: { '01': 'Bombay', '02': 'Nagpur', '03': 'Aurangabad', '04': 'Goa' },
  RJ: { '01': 'Jodhpur', '02': 'Jaipur' },
  AP: { '01': 'Amaravati', '02': 'Hyderabad' },
};

/**
 * Parses a CNR number and returns structured court info, or null if it cannot
 * be recognised (too short, unknown state code, non-numeric year, etc.).
 */
export function parseCnr(raw: string): CnrInfo | null {
  const cnr = raw.trim().toUpperCase().replace(/[\s\-]/g, '');
  if (cnr.length < 10) return null;

  const stateCode = cnr.slice(0, 2);
  const courtCode = cnr.slice(2, 4);
  const year = cnr.slice(-4);

  const state = STATE_CODES[stateCode];
  if (!state) return null;
  if (!/^\d{4}$/.test(year)) return null;

  const courtType = COURT_TYPES[courtCode] ?? courtCode;
  const court = `${state} ${courtType}`;

  let bench: string | undefined;
  if (courtCode === 'HC' && cnr.length >= 6) {
    const estCode = cnr.slice(4, 6);
    bench = HC_BENCHES[stateCode]?.[estCode];
  }

  return { cnr, state, courtType, court, bench, year };
}
