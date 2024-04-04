import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      threadId: 0,
      setThreadId: (id) => set({ threadId: id }),
    }),
    {
      name: 'openai-assistants-api-streaming',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)