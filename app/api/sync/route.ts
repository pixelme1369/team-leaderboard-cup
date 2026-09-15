import { NextResponse } from "next/server";
import { runSync } from "../../../lib/sync";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

export async function GET() {
  const result = await runSync();
  return NextResponse.json({ ok: true, ...result });
}
