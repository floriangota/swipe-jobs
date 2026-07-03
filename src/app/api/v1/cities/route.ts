import { NextResponse } from "next/server";
import { getCities } from "@/features/profiles/service/reference-data.service";

export async function GET() {
  const data = await getCities();
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
