import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/features/auth/rate-limit";
import { reportSchema } from "@/features/reports/schemas";
import { submitReport } from "@/features/reports/service/report.service";

// POST /reports (api-contract.md §8). Any authed user files a report; rate-limited.
export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return err("unauthenticated", "Not signed in.", 401);

  const rl = await checkRateLimit(`report:${user.id}`); // moderate/user — wired in M9
  if (!rl.ok) {
    const res = err("rate_limited", "Slow down a moment.", 429);
    if (rl.retryAfterSeconds) res.headers.set("Retry-After", String(rl.retryAfterSeconds));
    return res;
  }

  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return err("invalid_input", "A valid report is required.", 400);

  const result = await submitReport(user.id, parsed.data);
  if (result.status === "invalid_target") {
    return err("invalid_input", "That report target doesn't exist.", 400);
  }
  return NextResponse.json({ data: { report_id: result.reportId, status: "open" } }, { status: 201 });
}
