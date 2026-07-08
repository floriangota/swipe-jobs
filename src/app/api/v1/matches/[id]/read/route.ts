import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { markMatchRead } from "@/features/chat/service/message.service";

// POST /matches/:id/read (api-contract.md §6). Marks the counterpart's messages as
// read (receipt) — party-only, enforced inside the mark_match_read DB function.
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return err("not_found", "Match not found.", 404);

  const result = await markMatchRead(id);
  if (result.status === "not_found") return err("not_found", "Match not found.", 404);

  return new NextResponse(null, { status: 204 });
}
