"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { MatchStatus, MessageRow } from "../types";

export interface MatchChannelHandlers {
  onMessageInsert: (row: MessageRow) => void;
  onRead: (readerUserId: string) => void;
  onStatus: (status: MatchStatus) => void;
  /** Fired when the channel re-subscribes after a drop — refetch to close the gap. */
  onResync: () => void;
}

/**
 * Live chat delivery over the PRIVATE per-match Broadcast channel `match:{id}`.
 * Subscription is authorized at the database: RLS on realtime.messages admits only
 * the two match parties (a non-party's subscribe is rejected), and only the database
 * itself publishes (no client INSERT policy) — events can't be spoofed. REST remains
 * the source of truth; on reconnect we resync instead of trusting the stream.
 */
export function useMatchChannel(matchId: string, handlers: MatchChannelHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let disposed = false;
    let dropped = false;

    void (async () => {
      // Private channels authorize with the caller's JWT (RLS runs as this user).
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || disposed) return;
      await supabase.realtime.setAuth(token);
      if (disposed) return;

      channel = supabase
        .channel(`match:${matchId}`, { config: { private: true } })
        .on("broadcast", { event: "INSERT" }, (msg) => {
          // broadcast_changes payload: { schema, table, operation, record, old_record }
          const record = (msg.payload as { record?: MessageRow } | undefined)?.record;
          if (record) handlersRef.current.onMessageInsert(record);
        })
        .on("broadcast", { event: "read" }, (msg) => {
          const reader = (msg.payload as { reader_user_id?: string } | undefined)
            ?.reader_user_id;
          if (reader) handlersRef.current.onRead(reader);
        })
        .on("broadcast", { event: "status" }, (msg) => {
          const status = (msg.payload as { status?: MatchStatus } | undefined)?.status;
          if (status) handlersRef.current.onStatus(status);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            if (dropped) {
              dropped = false;
              handlersRef.current.onResync();
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            dropped = true; // the client auto-rejoins; we resync when it does
          }
        });
    })();

    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [matchId]);
}
