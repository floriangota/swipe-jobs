import { describe, it, expect } from "vitest";
import { createChatStore, type ChatMessage } from "../store";

// These lock the M6-review fixes for the optimistic-send / realtime-resync races.
const ME = "me-user";
const THEM = "them-user";

function msg(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "srv-1",
    matchId: "m1",
    senderUserId: ME,
    body: "hi",
    readAt: null,
    createdAt: "2026-07-03T00:00:00.000Z",
    ...over,
  };
}

describe("chat store — optimistic send / resync races", () => {
  it("reconcileOutgoing promotes the matching pending temp instead of duplicating", () => {
    const s = createChatStore(ME, [], null, "active");
    s.getState().appendMessage({ ...msg({ id: "temp-1", body: "yo" }), pending: true });
    // My own message echoes back over the broadcast with its real server id.
    s.getState().reconcileOutgoing(msg({ id: "srv-9", body: "yo" }));
    const items = s.getState().messages;
    expect(items).toHaveLength(1); // NOT duplicated
    expect(items[0]?.id).toBe("srv-9");
    expect(items[0]?.pending).toBeUndefined();
  });

  it("reconcileOutgoing is a no-op when the server row is already present", () => {
    const s = createChatStore(ME, [msg({ id: "srv-9", body: "yo" })], null, "active");
    s.getState().reconcileOutgoing(msg({ id: "srv-9", body: "yo" }));
    expect(s.getState().messages).toHaveLength(1);
  });

  it("reconcileOutgoing clears a false 'failed' state when the broadcast confirms delivery", () => {
    const s = createChatStore(ME, [], null, "active");
    s.getState().appendMessage({ ...msg({ id: "temp-1", body: "sent?" }), failed: true });
    s.getState().reconcileOutgoing(msg({ id: "srv-9", body: "sent?" }));
    const items = s.getState().messages;
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("srv-9");
    expect(items[0]?.failed).toBeUndefined();
  });

  it("replaceMessage does NOT delete the server row when the temp is already gone (resync race)", () => {
    // The high-severity bug: temp removed by a resync, then the POST response lands.
    const server = msg({ id: "srv-9", body: "yo" });
    const s = createChatStore(ME, [server], null, "active");
    s.getState().replaceMessage("temp-1", server); // temp-1 no longer present
    expect(s.getState().messages).toHaveLength(1); // must NOT vanish
    expect(s.getState().messages[0]?.id).toBe("srv-9");
  });

  it("replaceMessage swaps the temp and drops a broadcast dup of the same server row", () => {
    const server = msg({ id: "srv-9", body: "yo" });
    const s = createChatStore(ME, [server, { ...msg({ id: "temp-1", body: "yo" }), pending: true }], null, "active");
    s.getState().replaceMessage("temp-1", server);
    const items = s.getState().messages;
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("srv-9");
  });

  it("resetLatest carries over pending/failed optimistic rows the fetched page can't contain", () => {
    const s = createChatStore(
      ME,
      [msg({ id: "srv-1" }), { ...msg({ id: "temp-2", body: "unsent" }), failed: true }],
      null,
      "active",
    );
    // A reconnect refetch returns only committed rows.
    s.getState().resetLatest([msg({ id: "srv-1" }), msg({ id: "srv-2", senderUserId: THEM })], "cur");
    const items = s.getState().messages;
    expect(items.map((m) => m.id)).toContain("temp-2"); // the failed message survives
    const failed = items.find((m) => m.id === "temp-2");
    expect(failed?.failed).toBe(true);
    expect(s.getState().olderCursor).toBe("cur");
  });

  it("markMineRead flips my delivered messages to read, not pending/failed ones", () => {
    const s = createChatStore(
      ME,
      [
        msg({ id: "srv-1", senderUserId: ME }),
        { ...msg({ id: "temp-2", senderUserId: ME }), pending: true },
        msg({ id: "srv-3", senderUserId: THEM }),
      ],
      null,
      "active",
    );
    s.getState().markMineRead("2026-07-03T01:00:00.000Z");
    const byId = new Map(s.getState().messages.map((m) => [m.id, m]));
    expect(byId.get("srv-1")?.readAt).toBe("2026-07-03T01:00:00.000Z");
    expect(byId.get("temp-2")?.readAt).toBeNull(); // still pending — not a delivered receipt
    expect(byId.get("srv-3")?.readAt).toBeNull(); // their message, not mine
  });
});
