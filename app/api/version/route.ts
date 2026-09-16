import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Identifies the build currently serving traffic.
 *
 * The wall displays poll this and reload themselves when the value changes, so
 * a new deploy reaches every TV without anyone walking over to refresh it.
 */
export async function GET() {
  const version =
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "dev";

  return NextResponse.json(
    { version },
    { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
  );
}
