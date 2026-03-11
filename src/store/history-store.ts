import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultsCount: number;
  foundAvailable: boolean;
}

interface HistoryStore {
  items: SearchHistoryItem[];
  addSearch: (query: string, resultsCount: number, foundAvailable: boolean) => void;
  clearHistory: () => void;
  getRecentSearches: (limit?: number) => SearchHistoryItem[];
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      items: [],

      addSearch: (query, resultsCount, foundAvailable) => {
        const newItem: SearchHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          query,
          timestamp: new Date().toISOString(),
          resultsCount,
          foundAvailable,
        };
        
        // Keep only last 50 searches
        const items = [newItem, ...get().items].slice(0, 50);
        set({ items });
      },

      clearHistory: () => {
        set({ items: [] });
      },

      getRecentSearches: (limit = 10) => {
        return get().items.slice(0, limit);
      },
    }),
    {
      name: 'search-history',
    }
  )
);
