import { NextResponse } from "next/server";
import { parseCWATropicalCyclones, parseTyphoonBulletin, type TyphoonStatus } from "@/lib/typhoonParser";
import { DEFAULT_TYPHOON_TRACK, type TyphoonTrack } from "@/lib/typhoonData";

export async function GET() {
  const apiKey = process.env.CWA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      active: true,
      name: DEFAULT_TYPHOON_TRACK.name,
      internationalName: DEFAULT_TYPHOON_TRACK.internationalName,
      intensity: DEFAULT_TYPHOON_TRACK.intensity,
      track: DEFAULT_TYPHOON_TRACK,
      tracks: [DEFAULT_TYPHOON_TRACK],
    });
  }

  try {
    // 1. Fetch live official CWA tropical cyclones track and forecast (W-C0034-005)
    const tcUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0034-005?Authorization=${encodeURIComponent(
      apiKey
    )}&format=JSON`;

    // 2. Fetch official CWA typhoon warning bulletin (W-C0034-001)
    const warnUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0034-001?Authorization=${encodeURIComponent(
      apiKey
    )}&format=JSON`;

    const [tcRes, warnRes] = await Promise.allSettled([
      fetch(tcUrl, { next: { revalidate: 600 } }),
      fetch(warnUrl, { next: { revalidate: 600 } }),
    ]);

    let tracks: TyphoonTrack[] = [];
    if (tcRes.status === "fulfilled" && tcRes.value.ok) {
      const tcData = await tcRes.value.json();
      tracks = parseCWATropicalCyclones(tcData);
    }

    let warning: TyphoonStatus | null = null;
    if (warnRes.status === "fulfilled" && warnRes.value.ok) {
      const warnData = await warnRes.value.json();
      warning = parseTyphoonBulletin(warnData);
    }

    // If live tracks exist from CWA W-C0034-005, use the latest official active track
    if (tracks.length > 0) {
      const activeTrack = tracks[0];
      return NextResponse.json({
        active: true,
        name: activeTrack.name,
        internationalName: activeTrack.internationalName,
        intensity: activeTrack.intensity,
        track: activeTrack,
        tracks,
        warning: warning?.active ? warning : null,
      });
    }

    // Fallback if no active cyclones currently in basin
    return NextResponse.json({
      active: warning?.active ?? false,
      ...(warning || {}),
      track: DEFAULT_TYPHOON_TRACK,
      tracks: [DEFAULT_TYPHOON_TRACK],
    });
  } catch (err) {
    return NextResponse.json({
      active: true,
      track: DEFAULT_TYPHOON_TRACK,
      tracks: [DEFAULT_TYPHOON_TRACK],
      error: err instanceof Error ? err.message : "Error fetching CWA typhoon data",
    });
  }
}
