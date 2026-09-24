import { NextResponse } from "next/server";
import { fetchWindGrid } from "@/lib/windGrid";

export async function GET() {
  try {
    const grid = await fetchWindGrid();
    return NextResponse.json(grid);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching wind data." },
      { status: 502 }
    );
  }
}
