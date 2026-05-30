import { Injectable } from '@nestjs/common';

// webpack inlines JSON at build time — no file path resolution needed
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const COURT_DATA: StateEntry[] = require('./data/india-courts.json');

interface CourtComplex {
  value: string;
  text: string;
}

interface District {
  district: string;
  districtValue: string;
  courtComplexes: CourtComplex[];
}

interface StateEntry {
  state: string;
  stateValue: string;
  districts: District[];
}

@Injectable()
export class CourtsService {
  private data: StateEntry[] = COURT_DATA;

  getStates() {
    return this.data.map((s) => ({ id: s.stateValue, name: s.state }));
  }

  getDistricts(stateId: string) {
    const state = this.data.find((s) => s.stateValue === stateId);
    if (!state) return [];
    return state.districts.map((d) => ({
      id: d.districtValue,
      name: d.district,
    }));
  }

  getComplexes(stateId: string, districtId: string) {
    const state = this.data.find((s) => s.stateValue === stateId);
    if (!state) return [];
    const district = state.districts.find((d) => d.districtValue === districtId);
    if (!district) return [];
    return district.courtComplexes.map((c) => ({ id: c.value, name: c.text }));
  }
}
