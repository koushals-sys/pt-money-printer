import { NextRequest, NextResponse } from "next/server";

const NPI_UPSTREAM = "https://npiregistry.cms.hhs.gov/api/";

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const upstream = `${NPI_UPSTREAM}?${params.toString()}`;

  try {
    const res = await fetch(upstream, { headers: { Accept: "application/json" } });
    if (!res.ok) return NextResponse.json({ results: [], result_count: 0 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ results: [], result_count: 0 });
  }
}
