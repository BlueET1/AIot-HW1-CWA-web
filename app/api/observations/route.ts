import { NextResponse } from "next/server";
import { fetchStationObservations } from "@/lib/cwaObservations";

export async function GET() {
  const apiKey = process.env.CWA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CWA_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const stations = await fetchStationObservations(apiKey);
    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      count: stations.length,
      stations,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching CWA data." },
      { status: 502 }
    );
  }
}
