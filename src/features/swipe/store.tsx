"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

/**
 * Swipe-deck store (CLAUDE.md: Zustand for the swipe deck). SSR-hydrated, so it uses
 * the store-factory + provider pattern: each mounted deck gets its own store seeded
 * with the server-fetched first page, holding the card stack + keyset cursor. There is
 * NO undo — the schema forbids it (UNIQUE(worker_profile_id, listing_id)); a failed
 * swipe rolls the card back onto the top of the deck instead.
 */
export interface DeckState<T> {
  items: T[];
  cursor: string | null;
  loadingMore: boolean;
  removeTop: () => void;
  restoreTop: (item: T) => void;
  appendPage: (items: T[], cursor: string | null) => void;
  setLoadingMore: (v: boolean) => void;
}

function createDeckStore<T>(items: T[], cursor: string | null): StoreApi<DeckState<T>> {
  return createStore<DeckState<T>>((set) => ({
    items,
    cursor,
    loadingMore: false,
    removeTop: () => set((s) => ({ items: s.items.slice(1) })),
    restoreTop: (item) => set((s) => ({ items: [item, ...s.items] })),
    appendPage: (newItems, nextCursor) =>
      set((s) => ({ items: [...s.items, ...newItems], cursor: nextCursor })),
    setLoadingMore: (loadingMore) => set({ loadingMore }),
  }));
}

const DeckContext = createContext<StoreApi<DeckState<unknown>> | null>(null);

export function DeckProvider<T>({
  items,
  cursor,
  children,
}: {
  items: T[];
  cursor: string | null;
  children: ReactNode;
}) {
  // Lazy init creates the store exactly once (per mounted deck), seeded with the
  // server-fetched first page — the SSR-safe store-factory pattern.
  const [store] = useState(() => createDeckStore<T>(items, cursor));
  return (
    <DeckContext.Provider value={store as StoreApi<DeckState<unknown>>}>
      {children}
    </DeckContext.Provider>
  );
}

export function useDeck<T, U>(selector: (s: DeckState<T>) => U): U {
  const store = useContext(DeckContext);
  if (!store) throw new Error("useDeck must be used within a DeckProvider");
  return useStore(store as unknown as StoreApi<DeckState<T>>, selector);
}
