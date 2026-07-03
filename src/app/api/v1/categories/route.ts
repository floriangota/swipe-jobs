import { NextResponse } from "next/server";
import { getCategories } from "@/features/profiles/service/reference-data.service";

// api-contract.md §10 — public, bilingual, cacheable.
export async function GET() {
  const data = await getCategories();
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
