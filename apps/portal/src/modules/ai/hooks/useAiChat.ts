import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../api/ai.api';

export function useAiChat() {
  return useMutation({
    mutationFn: (question: string) =>
      aiApi.chat(question).then((r) => r.data),
  });
}
