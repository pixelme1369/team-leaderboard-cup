import { sql } from "./db";
import { getBigQueryClient } from "./bigquery";

// The competition began Sept 14 - only contacts submitted from this point on
// count toward a team's total. No baseline subtraction, ranking is purely
// "new deals submitted since the game started."
const COMPETITION_START = "2026-09-14T00:00:00Z";

const BQ_TABLE = "`amity-one-call-data.aod_forth_data.VW_SAMAN`";

/**
 * Aggregates directly from the BigQuery view by agent, for contacts
 * submitted since the competition started. This replaces the earlier
 * Forth-API-based sync entirely - the view already has everything needed
 * (assigned_to, enrolled_debt, submitted_date) with no pagination or
 * concurrency issues to work around.
 */
async function fetchAgentEnrollment(): Promise<{
  data: Record<string, { enrolled: number; deals: number }>;
  mocked: boolean;
}> {
  const hasRealCreds =
    process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;

  if (hasRealCreds) {
    const bq = getBigQueryClient();
    const [rows] = await bq.query({
      query: `
        SELECT assigned_to AS agent, SUM(enrolled_debt) AS enrolled, COUNT(*) AS deals
        FROM ${BQ_TABLE}
        WHERE submitted_date >= @competitionStart
        GROUP BY assigned_to
      `,
      params: { competitionStart: COMPETITION_START },
    });

    const data: Record<string, { enrolled: number; deals: number }> = {};
    for (const r of rows as any[]) {
      if (!r.agent) continue;
      data[r.agent] = { enrolled: Number(r.enrolled) || 0, deals: Number(r.deals) || 0 };
    }
    return { data, mocked: false };
  }

  // MOCK MODE fallback - small plausible increments so the dashboard still
  // works end to end before real credentials are set.
  const client = sql();
  const rows = (await client(
    `SELECT DISTINCT ON (ar.agent_name) ar.agent_name, ar.team_id,
            COALESCE(ts.current_enrolled, t.baseline_enrolled) as last_enrolled,
            COALESCE(ts.current_deals, t.baseline_deals) as last_deals
     FROM agent_roster ar
     JOIN teams t ON t.team_id = ar.team_id
     LEFT JOIN team_snapshots ts ON ts.team_id = ar.team_id
     ORDER BY ar.agent_name, ts.captured_at DESC`
  )) as any[];

  const perTeamMembers: Record<number, number> = {};
  for (const r of rows) perTeamMembers[r.team_id] = (perTeamMembers[r.team_id] || 0) + 1;

  const data: Record<string, { enrolled: number; deals: number }> = {};
  for (const r of rows) {
    const memberCount = perTeamMembers[r.team_id] || 1;
    const teamIncrement = Math.random() * 9000;
    data[r.agent_name] = {
      enrolled: Number(r.last_enrolled) / memberCount + teamIncrement / memberCount,
      deals: Number(r.last_deals) / memberCount + (Math.random() < 0.15 ? 1 : 0) / memberCount,
    };
  }
  return { data, mocked: true };
}

export async function runSync() {
  const client = sql();
  const teams = (await client(`SELECT team_id, team_name FROM teams`)) as any[];
  const roster = (await client(`SELECT agent_name, team_id FROM agent_roster`)) as any[];

  const { data: enrollment, mocked } = await fetchAgentEnrollment();

  const teamTotals: Record<number, { enrolled: number; deals: number }> = {};
  for (const t of teams) teamTotals[t.team_id] = { enrolled: 0, deals: 0 };

  for (const r of roster) {
    const agentData = enrollment[r.agent_name];
    if (!agentData) continue;
    teamTotals[r.team_id].enrolled += agentData.enrolled;
    teamTotals[r.team_id].deals += agentData.deals;
  }

  for (const t of teams) {
    const totals = teamTotals[t.team_id];
    await client(
      `INSERT INTO team_snapshots (team_id, current_enrolled, current_deals) VALUES ($1, $2, $3)`,
      [t.team_id, totals.enrolled, Math.round(totals.deals)]
    );
  }

  // Per-agent snapshots power the individual-contribution ticker on the
  // dashboard - a separate table from team_snapshots since it's a different
  // grain (one row per agent per sync, not per team).
  if (roster.length > 0) {
    const agentRows = roster.map((r) => {
      const agentData = enrollment[r.agent_name] || { enrolled: 0, deals: 0 };
      return [r.agent_name, r.team_id, Math.round(agentData.deals), agentData.enrolled];
    });
    const valuesSql = agentRows
      .map((_, i) => {
        const base = i * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, now())`;
      })
      .join(", ");
    await client(
      `INSERT INTO agent_snapshots (agent_name, team_id, current_deals, current_enrolled, captured_at)
       VALUES ${valuesSql}`,
      agentRows.flat()
    );
  }

  return { mocked, teamsUpdated: teams.length };
}
