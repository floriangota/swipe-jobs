"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { MatchStatus, MessageView } from "./types";

/**
 * Chat-thread store (CLAUDE.md: Zustand for chat UI). SSR-hydrated like the swipe
 * deck: store-factory + provider, seeded with the server-fetched newest page. Holds
 * the ascending message list, the older-messages cursor, and the live match status.
 * Optimistic sends append a pending message; the POST response (or the broadcast,
 * whichever lands first) replaces it — dedupe is by message id.
 */
export interface ChatMessage extends MessageView {
  pending?: boolean;
  failed?: boolean;
}

export interface ChatState {
  currentUserId: string;
  messages: ChatMessage[]; // ascending (oldest → newest)
  olderCursor: string | null;
  loadingOlder: boolean;
  matchStatus: MatchStatus;
  appendMessage: (m: ChatMessage) => void;
  reconcileOutgoing: (m: ChatMessage) => void;
  replaceMessage: (id: string, m: ChatMessage) => void;
  markMessageFailed: (id: string) => void;
  removeMessage: (id: string) => void;
  prependOlder: (older: ChatMessage[], cursor: string | null) => void;
  resetLatest: (latest: ChatMessage[], cursor: string | null) => void;
  markMineRead: (readAt: string) => void;
  setMatchStatus: (s: MatchStatus) => void;
  setLoadingOlder: (v: boolean) => void;
}

export function createChatStore(
  currentUserId: string,
  messages: ChatMessage[],
  olderCursor: string | null,
  matchStatus: MatchStatus,
): StoreApi<ChatState> {
  return createStore<ChatState>((set) => ({
    currentUserId,
    messages,
    olderCursor,
    loadingOlder: false,
    matchStatus,
    // Dedupe by id: the POST response and the channel broadcast both carry the row.
    appendMessage: (m) =>
      set((s) => (s.messages.some((x) => x.id === m.id) ? s : { messages: [...s.messages, m] })),
    // My own message echoed back over the broadcast. Its server id never matches the
    // optimistic temp id, so id-dedupe can't catch it — promote the matching pending/
    // failed temp row (by sender+body) to the server row instead of appending a copy.
    // Failed rows are eligible too: if the POST response was lost but the insert
    // committed, the broadcast clears the false "failed" state.
    reconcileOutgoing: (m) =>
      set((s) => {
        if (s.messages.some((x) => x.id === m.id)) return s; // already installed
        const idx = s.messages.findIndex(
          (x) => (x.pending || x.failed) && x.senderUserId === m.senderUserId && x.body === m.body,
        );
        if (idx === -1) return { messages: [...s.messages, m] };
        const next = s.messages.slice();
        next[idx] = m;
        return { messages: next };
      }),
    // Swap the optimistic temp row for the server row. Guard the case where the temp
    // is already gone (e.g. a resync ran) but the server row is present: return
    // unchanged rather than filtering the server row out (which would DELETE it).
    replaceMessage: (id, m) =>
      set((s) => {
        const hasTemp = s.messages.some((x) => x.id === id);
        if (hasTemp) {
          // Drop any server dup the broadcast already added, then promote the temp.
          return {
            messages: s.messages.filter((x) => x.id !== m.id).map((x) => (x.id === id ? m : x)),
          };
        }
        if (s.messages.some((x) => x.id === m.id)) return s; // broadcast already has it
        return { messages: [...s.messages, m] };
      }),
    markMessageFailed: (id) =>
      set((s) => ({
        messages: s.messages.map((x) =>
          x.id === id ? { ...x, pending: false, failed: true } : x,
        ),
      })),
    removeMessage: (id) => set((s) => ({ messages: s.messages.filter((x) => x.id !== id) })),
    prependOlder: (older, cursor) =>
      set((s) => {
        const known = new Set(s.messages.map((x) => x.id));
        return {
          messages: [...older.filter((x) => !known.has(x.id)), ...s.messages],
          olderCursor: cursor,
          loadingOlder: false,
        };
      }),
    // After a realtime gap: replace with the fresh newest page, but CARRY OVER any
    // optimistic pending/failed rows — the fetched page can't contain them yet, and
    // dropping them would silently lose an unsent message (and its retry affordance).
    resetLatest: (latest, cursor) =>
      set((s) => {
        const known = new Set(latest.map((x) => x.id));
        const optimistic = s.messages.filter((x) => (x.pending || x.failed) && !known.has(x.id));
        return { messages: [...latest, ...optimistic], olderCursor: cursor };
      }),
    // The counterpart read the chat — flip my sent messages to read (their receipt).
    markMineRead: (readAt) =>
      set((s) => ({
        messages: s.messages.map((x) =>
          x.senderUserId === s.currentUserId && x.readAt == null && !x.pending && !x.failed
            ? { ...x, readAt }
            : x,
        ),
      })),
    setMatchStatus: (matchStatus) => set({ matchStatus }),
    setLoadingOlder: (loadingOlder) => set({ loadingOlder }),
  }));
}

const ChatContext = createContext<StoreApi<ChatState> | null>(null);

export function ChatProvider({
  currentUserId,
  initialMessages,
  initialCursor,
  initialStatus,
  children,
}: {
  currentUserId: string;
  initialMessages: ChatMessage[];
  initialCursor: string | null;
  initialStatus: MatchStatus;
  children: ReactNode;
}) {
  // Lazy init creates the store exactly once per mounted thread, seeded with the
  // server-fetched newest page — the SSR-safe store-factory pattern.
  const [store] = useState(() =>
    createChatStore(currentUserId, initialMessages, initialCursor, initialStatus),
  );
  return <ChatContext.Provider value={store}>{children}</ChatContext.Provider>;
}

export function useChat<U>(selector: (s: ChatState) => U): U {
  const store = useContext(ChatContext);
  if (!store) throw new Error("useChat must be used within a ChatProvider");
  return useStore(store, selector);
}
