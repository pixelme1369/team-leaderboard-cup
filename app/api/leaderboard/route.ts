import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export async function GET() {
  const client = sql();

  const teams = (await client(`
    SELECT
      t.team_id,
      t.team_name,
      t.captain,
      t.members,
      t.baseline_enrolled,
      t.baseline_deals,
      COALESCE(latest.current_enrolled, t.baseline_enrolled) AS current_enrolled,
      COALESCE(latest.current_deals, t.baseline_deals) AS current_deals,
      latest.captured_at
    FROM teams t
    LEFT JOIN LATERAL (
      SELECT current_enrolled, current_deals, captured_at
      FROM team_snapshots ts
      WHERE ts.team_id = t.team_id
      ORDER BY captured_at DESC
      LIMIT 1
    ) latest ON true
    ORDER BY (COALESCE(latest.current_deals, t.baseline_deals) - t.baseline_deals) DESC,
             (COALESCE(latest.current_enrolled, t.baseline_enrolled) - t.baseline_enrolled) DESC
  `)) as any[];

  // last 8 snapshots per team for sparkline trend (both units and dollars)
  const history = (await client(`
    SELECT team_id, current_enrolled, current_deals, captured_at
    FROM (
      SELECT team_id, current_enrolled, current_deals, captured_at,
             ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY captured_at DESC) as rn
      FROM team_snapshots
    ) s
    WHERE rn <= 8
    ORDER BY team_id, captured_at ASC
  `)) as any[];

  const historyByTeam: Record<number, number[]> = {};
  const dealsHistoryByTeam: Record<number, number[]> = {};
  for (const h of history) {
    if (!historyByTeam[h.team_id]) historyByTeam[h.team_id] = [];
    if (!dealsHistoryByTeam[h.team_id]) dealsHistoryByTeam[h.team_id] = [];
    historyByTeam[h.team_id].push(Number(h.current_enrolled));
    dealsHistoryByTeam[h.team_id].push(Number(h.current_deals));
  }

  const leaderboard = teams.map((t, i) => ({
    rank: i + 1,
    teamId: t.team_id,
    teamName: t.team_name,
    captain: t.captain,
    members: t.members,
    baselineEnrolled: Number(t.baseline_enrolled),
    currentEnrolled: Number(t.current_enrolled),
    deltaEnrolled: Number(t.current_enrolled) - Number(t.baseline_enrolled),
    baselineDeals: t.baseline_deals,
    currentDeals: t.current_deals,
    deltaDeals: t.current_deals - t.baseline_deals,
    trend: historyByTeam[t.team_id] || [],
    dealsTrend: dealsHistoryByTeam[t.team_id] || [],
    lastUpdated: t.captured_at,
  }));

  // Latest per-agent snapshot, joined to team names, powers the individual
  // contribution ticker at the bottom of the dashboard.
  const agents = (await client(`
    SELECT DISTINCT ON (a.agent_name)
      a.agent_name, a.current_deals, a.current_enrolled, t.team_name
    FROM agent_snapshots a
    JOIN teams t ON t.team_id = a.team_id
    ORDER BY a.agent_name, a.captured_at DESC
  `)) as any[];

  const agentContributions = agents
    .map((a) => ({
      name: a.agent_name,
      teamName: a.team_name,
      deals: Number(a.current_deals) || 0,
      enrolled: Number(a.current_enrolled) || 0,
    }))
    .sort((a, b) => b.deals - a.deals || b.enrolled - a.enrolled);

  const mocked = !(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);

  return NextResponse.json(
    { leaderboard, agentContributions, mocked },
    { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
  );
}
