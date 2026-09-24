import { NextResponse } from "next/server";
import { parseTyphoonBulletin } from "@/lib/typhoonParser";

export async function GET() {
  const apiKey = process.env.CWA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CWA_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0034-001?Authorization=${encodeURIComponent(
      apiKey
    )}&format=JSON`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`CWA typhoon API responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(parseTyphoonBulletin(data));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching typhoon data." },
      { status: 502 }
    );
  }
}
