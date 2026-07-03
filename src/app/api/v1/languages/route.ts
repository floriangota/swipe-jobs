import { NextResponse } from "next/server";
import { getLanguages } from "@/features/profiles/service/reference-data.service";

export async function GET() {
  const data = await getLanguages();
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
