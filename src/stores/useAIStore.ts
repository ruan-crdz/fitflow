import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/utils/ai';

interface AIState {
  apiKey: string | null;
  isEnabled: boolean;
  hasSeenIntro: boolean;
  messages: ChatMessage[];
  setApiKey: (key: string) => void;
  removeApiKey: () => void;
  markIntroSeen: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      apiKey: null,
      isEnabled: false,
      hasSeenIntro: false,
      messages: [],
      setApiKey: (key) => set({ apiKey: key, isEnabled: true }),
      removeApiKey: () => set({ apiKey: null, isEnabled: false, hasSeenIntro: false, messages: [] }),
      markIntroSeen: () => set({ hasSeenIntro: true }),
      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'fitflow-ai' },
  ),
);
