export interface TyphoonStatus {
  active: boolean;
  name?: string;
  internationalName?: string;
  intensity?: string;
  lat?: number;
  lon?: number;
  summary?: string;
}

interface RawSection {
  title?: string;
  value?: string;
}

interface RawInfo {
  description?: { section?: RawSection[] };
}

const NAME_RE = /(輕度|中度|強烈)?颱風\s*([一-龥]+)(?:（國際命名\s*([A-Za-z]+)）)?/;
const LATLON_RE = /北緯\s*([\d.]+)\s*度[，,]\s*東經\s*([\d.]+)\s*度/;

// CWA's typhoon warning bulletin (W-C0034-001) is free text, not a clean
// coordinate feed, so we regex the current-position sentence out of it
// rather than trying to parse a structured forecast track.
export function parseTyphoonBulletin(data: unknown): TyphoonStatus {
  const info: RawInfo[] = (data as { records?: { info?: RawInfo[] } })?.records?.info ?? [];
  if (!info.length) return { active: false };

  const sections = info[0]?.description?.section ?? [];
  const positionSection = sections.find((s) => s.value && LATLON_RE.test(s.value));
  if (!positionSection?.value) return { active: false };

  const latlon = positionSection.value.match(LATLON_RE);
  const nameMatch = positionSection.value.match(NAME_RE);
  if (!latlon) return { active: false };

  return {
    active: true,
    intensity: nameMatch?.[1],
    name: nameMatch?.[2],
    internationalName: nameMatch?.[3],
    lat: Number(latlon[1]),
    lon: Number(latlon[2]),
    summary: positionSection.value,
  };
}
