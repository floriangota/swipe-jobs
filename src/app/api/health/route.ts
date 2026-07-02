import { NextResponse } from "next/server";

// System health check (api-contract.md §12). Public, no auth, no DB.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
