import { neon } from "@neondatabase/serverless";

// IMPORTANT: Next.js aggressively caches fetch() calls, and Neon's serverless
// driver makes its queries via fetch() under the hood. Without disabling that
// here, Next.js can silently serve a cached (stale) query result forever,
// even on a route marked `dynamic = "force-dynamic"`. fetchOptions below
// forces every query through fresh, uncached.
const noCacheOptions = { fetchOptions: { cache: "no-store" as RequestCache } };

// Set DATABASE_URL in Vercel project settings -> Environment Variables.
// Copy it from the Neon console for the "team-leaderboard" project / team_leaderboard database.
export function sql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(process.env.DATABASE_URL, noCacheOptions);
}
