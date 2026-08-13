import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/utils/ai';

interface AIState {
  isEnabled: boolean;
  hasSeenIntro: boolean;
  messages: ChatMessage[];
  setEnabled: (enabled: boolean) => void;
  markIntroSeen: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      isEnabled: true,
      hasSeenIntro: false,
      messages: [],
      setEnabled: (enabled) => set({ isEnabled: enabled }),
      markIntroSeen: () => set({ hasSeenIntro: true }),
      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'fitflow-ai',
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState || {}) as Partial<AIState> & Record<string, unknown>;
        return {
          isEnabled: true,
          hasSeenIntro: Boolean(state.hasSeenIntro),
          messages: Array.isArray(state.messages) ? state.messages : [],
        } as AIState;
      },
    },
  ),
);
