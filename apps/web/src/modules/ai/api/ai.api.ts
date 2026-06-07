import { api } from '../../../shared/utils/api';

export interface AiLawyerResponse {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  caveats: string | null;
  isLegalResearch: boolean;
  groundedCaseRefs: string[];
  unverifedCaseRefs: string[];
}

export const aiLawyerApi = {
  chat: (question: string) =>
    api.post<AiLawyerResponse>('/ai/lawyer-chat', { question }),
};
