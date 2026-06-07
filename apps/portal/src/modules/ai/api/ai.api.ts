import { api } from '../../../shared/utils/api';

export interface AiChatResponse {
  answer: string;
  routedToLawyer: boolean;
}

export const aiApi = {
  chat: (question: string) =>
    api.post<AiChatResponse>('/portal/ai/chat', { question }),
};
