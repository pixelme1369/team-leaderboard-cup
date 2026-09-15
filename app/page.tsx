"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

type Team = {
  rank: number;
  teamId: number;
  teamName: string;
  captain: string;
  members: string[];
  baselineEnrolled: number;
  currentEnrolled: number;
  deltaEnrolled: number;
  deltaDeals: number;
  trend: number[];
  dealsTrend: number[];
  lastUpdated: string | null;
};

const money = (n: number) =>
  n < 0
    ? `-$${Math.round(Math.abs(n)).toLocaleString("en-US")}`
    : `$${Math.round(n).toLocaleString("en-US")}`;

const units = (n: number) => Math.round(n).toLocaleString("en-US");

const LOGO_DATA_URI = "data:image/png;base64,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";


function CountUp({
  value,
  className,
  style,
  format = money,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
  format?: (n: number) => string;
}) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20, mass: 1 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(v));
    return unsub;
  }, [spring]);

  return (
    <span className={className} style={style}>
      {format(display)}
    </span>
  );
}

function ShieldIcon({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M24 4 L42 10 V22 C42 33 34 41 24 44 C14 41 6 33 6 22 V10 Z"
        fill="url(#shieldGrad)"
        stroke="var(--gold-line)"
        strokeWidth="1.5"
      />
      <path d="M24 12 L24 30 M16 20 L32 20" stroke="var(--navy-black)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M15 9 L24 6 L33 9" stroke="var(--gold)" strokeWidth="1.2" fill="none" />
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a3f8f" />
          <stop offset="1" stopColor="#101a34" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TrophyIcon({ size = 40, color = "var(--gold)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" stroke={color} strokeWidth="1.6" fill={`${color}22`} />
      <path d="M7 5H4v1a4 4 0 0 0 4 4" stroke={color} strokeWidth="1.6" />
      <path d="M17 5h3v1a4 4 0 0 1-4 4" stroke={color} strokeWidth="1.6" />
      <path d="M12 12v4" stroke={color} strokeWidth="1.6" />
      <path d="M8 20h8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 20v-2a3 3 0 0 1 3-2 3 3 0 0 1 3 2v2" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function DollarBillIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 60 33" fill="none">
      <rect x="1" y="1" width="58" height="31" rx="3" fill="#1b6b3a" stroke="#8fdcae" strokeWidth="1.2" />
      <rect x="4.5" y="4.5" width="51" height="24" rx="1.5" fill="none" stroke="#8fdcae" strokeWidth="0.8" />
      <circle cx="30" cy="16.5" r="8" fill="none" stroke="#c9f2d9" strokeWidth="1" />
      <text x="30" y="20.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#c9f2d9" fontFamily="Georgia, serif">
        $
      </text>
    </svg>
  );
}

function FloatingBills() {
  const bills = [
    { left: 4, delay: 0, dur: 14, rot: -8, drift: 60, size: 26 },
    { left: 14, delay: 3, dur: 17, rot: 10, drift: -40, size: 22 },
    { left: 24, delay: 7, dur: 15, rot: -14, drift: 30, size: 30 },
    { left: 40, delay: 1, dur: 18, rot: 6, drift: -50, size: 24 },
    { left: 58, delay: 5, dur: 16, rot: -10, drift: 45, size: 28 },
    { left: 70, delay: 2, dur: 19, rot: 12, drift: -35, size: 22 },
    { left: 82, delay: 8, dur: 15, rot: -6, drift: 55, size: 26 },
    { left: 91, delay: 4, dur: 17, rot: 14, drift: -30, size: 24 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {bills.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.left}%`,
            bottom: -60,
            ["--bill-rot" as any]: `${b.rot}deg`,
            ["--bill-drift" as any]: `${b.drift}px`,
            animation: `billFloat ${b.dur}s linear ${b.delay}s infinite`,
          }}
        >
          <DollarBillIcon size={b.size} />
        </div>
      ))}
    </div>
  );
}


type AgentContribution = { name: string; teamName: string; deals: number; enrolled: number };

const TEAM_LOGOS: Record<string, string> = {
  bigdawgz: "/team-logos/big-dawgz.png",
  ixfigure4orce: "/team-logos/six-figure-4orce.png",
  moneystackers: "/team-logos/money-stackers.png",
  dealmachine: "/team-logos/deal-machine.png",
  debtmafia: "/team-logos/debt-mafia.png",
  c4: "/team-logos/c4.png",
  thedebtcartel: "/team-logos/debt-cartel.png",
  smurfcrew: "/team-logos/smurf-crew.png",
  thedoorsrightthere: "/team-logos/the-doors-right-there.png",
};

function teamLogoFor(teamName: string) {
  return TEAM_LOGOS[teamName.toLowerCase().replace(/[^a-z0-9]/g, "")];
}

function TeamLogo({ teamName, size = 56 }: { teamName: string; size?: number }) {
  const logo = teamLogoFor(teamName);
  if (!logo) return null;

  return (
    <img
      src={logo}
      alt=""
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flex: "0 0 auto",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
      }}
    />
  );
}

function NameTicker({ agents }: { agents: AgentContribution[] }) {
  if (agents.length === 0) return null;
  const topAgents = agents.slice(0, 3);
  const items = topAgents.map((a, index) => `${index + 1}. ${a.name.toUpperCase()} (${a.teamName.toUpperCase()}) · ${units(a.deals)} UNITS`);
  const loopItems = [...items, ...items];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 48,
        left: 0,
        right: 0,
        overflow: "hidden",
        padding: "10px 0",
        background: "linear-gradient(180deg, rgba(8,12,28,0.98), rgba(13,22,48,0.98))",
        borderTop: "2px solid rgba(255,210,63,0.8)",
        zIndex: 11,
      }}
    >
      <div
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          width: "200vw",
          animation: "marquee 150s linear infinite",
        }}
      >
        {loopItems.map((item, i) => (
          <span
            key={i}
            className="scoreboard"
            style={{
              fontSize: 17,
              width: "33.333vw",
              padding: "0 32px",
              boxSizing: "border-box",
              color: i % topAgents.length === 0 ? "var(--gold)" : "var(--chalk)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 2px 4px rgba(0,0,0,0.45)",
            }}
          >
            <span style={{ color: "var(--gold)", marginRight: 22 }}>•</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ContributionTicker({ agents }: { agents: AgentContribution[] }) {
  if (agents.length === 0) return null;
  const top = agents[0];
  const items = [
    `🏆 TOP CLOSER: ${top.name.toUpperCase()} (${top.teamName.toUpperCase()}) — ${units(top.deals)} UNITS`,
    ...agents
      .slice(1)
      .map(
        (a) =>
          `${a.name.toUpperCase()} (${a.teamName.toUpperCase()}): ${units(a.deals)} units · ${money(a.enrolled)}`
      ),
  ];
  const loopItems = [...items, ...items];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        overflow: "hidden",
        padding: "12px 0",
        background:
          "linear-gradient(180deg, #14572b, var(--grass) 60%), repeating-linear-gradient(90deg, transparent, transparent 78px, rgba(255,255,255,0.06) 78px, rgba(255,255,255,0.06) 80px)",
        borderTop: "2px solid var(--gold-line)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          width: "max-content",
          animation: "marquee 150s linear infinite",
        }}
      >
        {loopItems.map((item, i) => (
          <span
            key={i}
            className="scoreboard"
            style={{
              fontSize: 17,
              padding: "0 32px",
              color: item.startsWith("🏆") ? "var(--gold)" : "var(--chalk)",
              letterSpacing: 0.3,
            }}
          >
            {item}
            <span style={{ color: "var(--gold)", marginLeft: 32 }}>●</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamRow({ team, align = "left" }: { team: Team; align?: "left" | "right" }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: align === "left" ? "row" : "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        minHeight: 88,
        padding: "13px 20px",
      }}
    >
      <div style={{ textAlign: align, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            flexDirection: align === "left" ? "row" : "row-reverse",
            alignItems: "center",
            justifyContent: align === "left" ? "flex-start" : "flex-end",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 20, color: "var(--chalk)", lineHeight: 1.05 }}>
            {team.teamName.toUpperCase()}
          </div>
          <TeamLogo teamName={team.teamName} />
        </div>
        <div style={{ fontSize: 14, color: "var(--chalk-dim)", letterSpacing: 0.3, marginTop: 5 }}>
          CAPTAIN: {team.captain}
        </div>
      </div>
      <CountUp
        value={team.deltaDeals}
        format={units}
        className="scoreboard"
        style={{ fontSize: 30, color: "var(--gold)", minWidth: 46, textAlign: align === "left" ? "right" : "left" }}
      />
    </div>
  );
}

function MatchCard({ a, b, align = "left", delay = 0 }: { a: Team; b: Team; align?: "left" | "right"; delay?: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: align === "left" ? -14 : 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        width: 410,
        background: "linear-gradient(180deg, var(--navy-surface), var(--navy-deep))",
        border: "1.5px solid var(--gold-line)",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: "-40%",
            left: "-20%",
            width: "50%",
            height: "220%",
            background: "linear-gradient(90deg, transparent, rgba(255,210,63,0.12), transparent)",
            animation: `shimmerSweep 6s ease-in-out ${delay}s infinite`,
          }}
        />
      </div>
      <TeamRow team={a} align={align} />
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          letterSpacing: 2,
          color: "var(--flare)",
          borderTop: "1px solid var(--navy-line)",
          borderBottom: "1px solid var(--navy-line)",
          padding: "5px 0",
          fontWeight: 700,
        }}
      >
        VS
      </div>
      <TeamRow team={b} align={align} />
    </motion.div>
  );
}

function ByeCard({ team }: { team: Team }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        width: 430,
        background: "linear-gradient(180deg, var(--navy-surface), var(--navy-deep))",
        border: "2px solid var(--gold)",
        borderRadius: 10,
        padding: "24px 30px",
        textAlign: "center",
        boxShadow: "0 0 30px rgba(255,210,63,0.25)",
        animation: "goldPulse 3s ease-in-out infinite",
      }}
    >
      <div style={{ animation: "crownFloat 2.4s ease-in-out infinite" }}>
        <TrophyIcon size={42} />
      </div>
      <div className="scoreboard" style={{ fontSize: 16, color: "var(--gold)", letterSpacing: 3, marginTop: 10 }}>
        ROUND 1 BYE
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          marginTop: 8,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 30, lineHeight: 1.05 }}>{team.teamName.toUpperCase()}</div>
        <TeamLogo teamName={team.teamName} size={82} />
      </div>
      <div style={{ fontSize: 16, color: "var(--chalk-dim)", marginTop: 8 }}>CAPTAIN: {team.captain}</div>
      <CountUp
        value={team.deltaDeals}
        format={units}
        className="scoreboard"
        style={{ fontSize: 50, color: "var(--gold)", display: "block", marginTop: 12 }}
      />
      <div style={{ fontSize: 14, color: "var(--chalk-dim)", letterSpacing: 2 }}>UNITS</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<AgentContribution[]>([]);
  const [mocked, setMocked] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        setTeams(json.leaderboard);
        setMocked(json.mocked);
        setAgents(json.agentContributions || []);
        setLastFetched(new Date());
      } catch (e) {
        // keep last known good data on transient failure
      }
    }
    load();
    const interval = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const byeTeam = teams[0];
  const rest = teams.slice(1); // already sorted by units desc
  // Adjacent-rank pairing: closest competitors face off (2v3, 4v5, 6v7, 8v9)
  const pairs: [Team, Team][] = [];
  for (let i = 0; i < rest.length - 1; i += 2) {
    pairs.push([rest[i], rest[i + 1]]);
  }
  const leftPairs = pairs.slice(0, 2);
  const rightPairs = pairs.slice(2, 4);

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "hidden", paddingBottom: 150 }}>
      <BackgroundFX />
      <FloatingBills />

      <div style={{ padding: "24px 24px 0", position: "relative" }}>
        {/* Corner taglines */}
        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 1720, margin: "0 auto" }}>
          <div className="corner-tag" style={{ fontSize: 20, transform: "rotate(-4deg)" }}>
            PLAY
            <br />
            HARDER
          </div>
          <div className="corner-tag" style={{ fontSize: 20, textAlign: "right", transform: "rotate(4deg)" }}>
            CREATE YOUR OWN
            <br />
            OPPORTUNITY
          </div>
        </div>

        {/* Title lockup */}
        <div style={{ textAlign: "center", margin: "0 auto 4px", maxWidth: 1720 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
            <img src={LOGO_DATA_URI} alt="American Debt Protection" style={{ height: 56 }} />
          </div>
          <div className="scoreboard" style={{ fontSize: 22, letterSpacing: 3, color: "var(--chalk)" }}>
            AMERICAN DEBT PROTECTION
          </div>
          <div style={{ fontSize: 12, letterSpacing: 2, color: "var(--chalk-dim)", marginTop: 2 }}>
            ONE TEAM &nbsp;•&nbsp; ONE GOAL &nbsp;•&nbsp; BIGGER PAYCHECKS
          </div>
          <h1 className="poster-title" style={{ fontSize: 36, margin: "8px 0 0", letterSpacing: 0.5 }}>
            NINE TEAM CHAMPIONSHIP
          </h1>
        </div>

        <div
          style={{
            textAlign: "center",
            color: "var(--chalk-dim)",
            fontSize: 13,
            margin: "4px 0 18px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--flare)",
                display: "inline-block",
                animation: "pulseDot 2s infinite",
              }}
            />
            {lastFetched
              ? `UPDATED ${lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "LOADING"}
          </span>
          <span style={{ margin: "0 10px" }}>·</span>
          UNITS DECIDE IT · ROUND 1 LIVE PAIRINGS
        </div>

        {mocked && (
          <div
            style={{
              maxWidth: 1720,
              margin: "0 auto 24px",
              padding: "10px 18px",
              border: "1px solid var(--navy-line)",
              borderLeft: "3px solid var(--flare)",
              color: "var(--chalk-dim)",
              fontSize: 14,
              borderRadius: 4,
              textAlign: "center",
            }}
          >
            Showing sample movement — connect live data to switch off demo mode.
          </div>
        )}

        {/* Bracket layout */}
        <div
          style={{
            maxWidth: 1720,
            margin: "-16px auto 0",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 34,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 44, alignItems: "flex-end" }}>
            {leftPairs.map(([a, b], i) => (
              <MatchCard key={a.teamId + "-" + b.teamId} a={a} b={b} align="left" delay={i * 1.5} />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            {byeTeam && <ByeCard team={byeTeam} />}
            <div style={{ fontSize: 14, color: "var(--chalk-dim)", textAlign: "center", maxWidth: 260 }}>
              Winners advance after manager confirmation
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 44, alignItems: "flex-start" }}>
            {rightPairs.map(([a, b], i) => (
              <MatchCard key={a.teamId + "-" + b.teamId} a={a} b={b} align="right" delay={0.75 + i * 1.5} />
            ))}
          </div>
        </div>

        <footer
          style={{
            maxWidth: 1720,
            margin: "24px auto 0",
            textAlign: "center",
            color: "var(--chalk-dim)",
            fontSize: 13,
          }}
        >
          More deals · Stronger team · Bigger future
        </footer>
      </div>
      <NameTicker agents={agents} />
      <ContributionTicker agents={agents} />
    </main>
  );
}

function BackgroundFX() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% -10%, #16224a, var(--navy-black) 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -100,
          left: "8%",
          width: 260,
          height: 900,
          background: "linear-gradient(180deg, rgba(255,59,48,0.22), transparent 75%)",
          transform: "rotate(18deg)",
          filter: "blur(6px)",
          animation: "beamDrift 6s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -100,
          right: "10%",
          width: 220,
          height: 900,
          background: "linear-gradient(180deg, rgba(255,210,63,0.16), transparent 75%)",
          transform: "rotate(-16deg)",
          filter: "blur(6px)",
          animation: "beamDrift 7.5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      {[
        [4, 6], [10, 9], [18, 4], [26, 10], [70, 5], [78, 9], [88, 6], [94, 10],
      ].map(([left, size], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${4 + (i % 3) * 3}%`,
            left: `${left}%`,
            width: size * 6,
            height: size * 6,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.55), transparent 70%)",
            filter: "blur(3px)",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
      ))}
      {/* Pitch strip at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 140,
          background:
            "linear-gradient(180deg, transparent, rgba(15,107,48,0.5)), repeating-linear-gradient(90deg, transparent, transparent 78px, rgba(255,255,255,0.04) 78px, rgba(255,255,255,0.04) 80px)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}
