import { create } from 'zustand';

interface RequestRefreshState {
  /** Set when the employee-request list should refetch on next focus (e.g. after a cancel). */
  shouldRefresh: boolean;
  requestRefresh: () => void;
  clearRefresh: () => void;
}

export const useRequestRefreshStore = create<RequestRefreshState>((set) => ({
  shouldRefresh: false,
  requestRefresh: () => set({ shouldRefresh: true }),
  clearRefresh: () => set({ shouldRefresh: false }),
}));
