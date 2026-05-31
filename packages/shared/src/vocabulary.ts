import type { IndustryConfig } from './api.types';

export const DEFAULT_LEGAL_VOCABULARY: IndustryConfig = {
  matter_label: 'Case',
  matter_plural: 'Cases',
  scheduled_event_label: 'Hearing',
  participant_label: 'Client',
  metadata_fields: {
    cnr: 'CNR Number',
    caseType: 'Case Type',
    state: 'State',
    district: 'District',
    courtComplex: 'Court Complex',
    judge: 'Judge',
    stage: 'Stage',
  },
  statuses: [
    { key: 'filed', label: 'Filed', isTerminal: false },
    { key: 'in_progress', label: 'In Progress', isTerminal: false },
    { key: 'hearing_scheduled', label: 'Hearing Scheduled', isTerminal: false },
    { key: 'adjourned', label: 'Adjourned', isTerminal: false },
    { key: 'closed', label: 'Closed', isTerminal: true },
  ],
};
