import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

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
export class CourtsService implements OnModuleInit {
  private data: StateEntry[] = [];

  onModuleInit() {
    const filePath = join(__dirname, 'data', 'india-courts.json');
    const raw = readFileSync(filePath, 'utf-8');
    this.data = JSON.parse(raw) as StateEntry[];
  }

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
