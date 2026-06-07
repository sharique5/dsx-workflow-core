import { useMutation } from '@tanstack/react-query';
import { aiLawyerApi } from '../api/ai.api';

export function useAiLawyerChat() {
  return useMutation({
    mutationFn: (question: string) =>
      aiLawyerApi.chat(question).then((r) => r.data),
  });
}
