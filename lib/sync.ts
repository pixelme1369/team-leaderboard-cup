import { sql } from "./db";
import { getBigQueryClient } from "./bigquery";

// The competition began Sept 14 - only contacts submitted from this point on
// count toward a team's total. No baseline subtraction, ranking is purely
// "new deals submitted since the game started."
//
// The kickoff is midnight *Pacific*, not UTC: a UTC boundary would start the
// game at 5pm Pacific on the 13th and hand a head start to whoever submitted
// that evening.
const COMPETITION_START_DATE = "2026-09-14";
const COMPETITION_TIMEZONE = "America/Los_Angeles";

const BQ_DATASET = "`amity-one-call-data.aod_forth_data`";
const BQ_TABLE = "`amity-one-call-data.aod_forth_data.VW_SAMAN`";
const SUBMITTED_DATE_COLUMN = "submitted_date";

/**
 * Builds the "submitted since kickoff" comparison for whichever type the view
 * declares submitted_date as.
 *
 * The type matters more than it looks. A STRING column compared against a
 * timestamp-shaped string compares lexicographically, so plain "2026-09-14"
 * sorts *before* "2026-09-14T00:00:00Z" and the whole first day of the
 * competition silently drops out of the count.
 */
export function buildSubmittedSinceClause(dataType: string | null): string {
  const col = SUBMITTED_DATE_COLUMN;
  switch ((dataType || "").toUpperCase()) {
    case "TIMESTAMP":
      // An absolute instant: resolve Pacific midnight to its UTC instant.
      // TIMESTAMP(datetime, tz) is DST-aware, so this holds across the year.
      return `${col} >= TIMESTAMP(DATETIME(@startDate), @tz)`;
    case "DATETIME":
      // Wall-clock local time already - compare at local midnight.
      return `${col} >= DATETIME(@startDate)`;
    case "DATE":
      return `${col} >= @startDate`;
    case "STRING":
      // Take the leading YYYY-MM-DD and compare as a real date, so the
      // comparison can't fall back to lexicographic ordering.
      return `SAFE_CAST(SUBSTR(${col}, 1, 10) AS DATE) >= @startDate`;
    default:
      // Type unknown: normalise through text and compare whole days. Loses
      // sub-day precision but never silently drops the first day.
      return `SAFE_CAST(SUBSTR(CAST(${col} AS STRING), 1, 10) AS DATE) >= @startDate`;
  }
}

// The view's schema doesn't change between syncs, so look it up once.
let submittedDateType: string | null | undefined;

async function getSubmittedDateType(bq: any): Promise<string | null> {
  if (submittedDateType !== undefined) return submittedDateType;
  try {
    const [rows] = await bq.query({
      query: `
        SELECT data_type
        FROM ${BQ_DATASET}.INFORMATION_SCHEMA.COLUMNS
        WHERE table_name = @table AND column_name = @column
      `,
      params: { table: "VW_SAMAN", column: SUBMITTED_DATE_COLUMN },
    });
    submittedDateType = (rows as any[])[0]?.data_type ?? null;
  } catch (e) {
    // Fall back to the type-agnostic comparison rather than failing the sync.
    submittedDateType = null;
  }
  return submittedDateType;
}

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
    const submittedSince = buildSubmittedSinceClause(await getSubmittedDateType(bq));
    // One unit = one row in the view, i.e. one submitted contact, counted
    // against the agent in assigned_to.
    const [rows] = await bq.query({
      query: `
        SELECT assigned_to AS agent, SUM(enrolled_debt) AS enrolled, COUNT(*) AS deals
        FROM ${BQ_TABLE}
        WHERE ${submittedSince}
        GROUP BY assigned_to
      `,
      params: { startDate: COMPETITION_START_DATE, tz: COMPETITION_TIMEZONE },
      types: { startDate: "DATE", tz: "STRING" },
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
