import { NextResponse } from "next/server";
import { getBusinessTypes } from "@/features/profiles/service/reference-data.service";

export async function GET() {
  const data = await getBusinessTypes();
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
