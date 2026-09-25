import type { LucideIcon } from "lucide-react";
import { Store, Factory, Search, Users, FileSpreadsheet } from "lucide-react";

type BlogCoverArtProps = {
  className?: string;
  variant?:
    | "code-debt"
    | "cloud-cost"
    | "vibe-mvp"
    | "two-paths"
    | "local-business"
    | "vertical-saas"
    | "cloud-audit"
    | "fractional-partner"
    | "legacy-tool";
};

const ICON_SCENES: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  "local-business": { icon: Store, color: "#D9A441", label: "BOOKINGS UP" },
  "vertical-saas": { icon: Factory, color: "#4FA88A", label: "DIGITIZING THE FLOOR" },
  "cloud-audit": { icon: Search, color: "#2E9DB0", label: "WHERE THE SPEND GOES" },
  "fractional-partner": { icon: Users, color: "#E0637A", label: "ALWAYS-ON PARTNER" },
  "legacy-tool": { icon: FileSpreadsheet, color: "#B0512E", label: "ONE CELL AWAY" },
};

const CLEAN_X = [40, 108, 176, 244, 312];
const CLEAN_Y = [230, 190, 210, 165, 195];
const DEBT_X = [380, 442, 500, 555];
const DEBT_Y = [150, 175, 120, 155];

function pathThrough(points: [number, number][]) {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
}

function CodeDebtScene() {
  const cleanPoints: [number, number][] = CLEAN_X.map((x, i) => [x, CLEAN_Y[i]]);
  const debtPoints: [number, number][] = DEBT_X.map((x, i) => [x, DEBT_Y[i]]);
  const allPoints = [...cleanPoints, ...debtPoints];

  return (
    <>
      <div
        className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(214,69,69,0.35) 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <svg viewBox="0 0 600 320" className="relative h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d={pathThrough(allPoints)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {cleanPoints.map(([x, y], i) => (
          <circle key={`clean-${i}`} cx={x} cy={y} r={5} fill="#C7CBDC" />
        ))}

        {debtPoints.map(([x, y], i) => (
          <g key={`debt-${i}`}>
            <circle cx={x} cy={y} r={11} fill="#D64545" opacity={0.18} />
            <circle cx={x} cy={y} r={7} fill="#D64545" />
          </g>
        ))}

        <text x={380} y={112} fontSize={12} fontWeight={600} fill="#F0A5A5" fontFamily="var(--font-poppins), sans-serif" letterSpacing="0.05em">
          DEBT ACCUMULATING
        </text>
        <line x1={378} y1={122} x2={556} y2={122} stroke="#D64545" strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
      </svg>
    </>
  );
}

function CloudCostScene() {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-10 -top-16 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(90,130,214,0.35) 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <svg viewBox="0 0 600 320" className="relative h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* cloud silhouette, top-left */}
        <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M80,120 a28,28 0 1,1 8,-54 a34,34 0 1,1 56,18 a26,26 0 0,1 -4,52 h-90 a24,24 0 0,1 -6,-47 a24,24 0 0,1 36,-11" />
        </g>

        {/* dashed migration path from cloud down to racks */}
        <path
          d="M120,140 C170,190 220,210 270,236"
          fill="none"
          stroke="#8FAEE8"
          strokeWidth={2}
          strokeDasharray="5 6"
          opacity={0.6}
        />
        <circle cx={270} cy={236} r={5} fill="#8FAEE8" />

        {/* server rack stack, right side */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(420, ${118 + i * 46})`}>
            <rect x={0} y={0} width={150} height={34} rx={7} fill="rgba(255,255,255,0.06)" stroke="#5B7BC7" strokeWidth={1.5} />
            <circle cx={18} cy={17} r={4} fill="#5CD68F" />
            <rect x={34} y={13} width={90} height={7} rx={3.5} fill="rgba(255,255,255,0.25)" />
          </g>
        ))}

        <text x={420} y={100} fontSize={12} fontWeight={600} fill="#9FB6EA" fontFamily="var(--font-poppins), sans-serif" letterSpacing="0.05em">
          COST REBALANCING
        </text>
        <line x1={420} y1={108} x2={570} y2={108} stroke="#5B7BC7" strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
      </svg>
    </>
  );
}

const MVP_BARS = [
  { x: 60, h: 30, warn: false },
  { x: 116, h: 46, warn: false },
  { x: 172, h: 40, warn: false },
  { x: 228, h: 64, warn: false },
  { x: 292, h: 110, warn: true },
  { x: 350, h: 150, warn: true },
  { x: 408, h: 186, warn: true },
];
const MVP_BASE_Y = 250;

function VibeMvpScene() {
  return (
    <>
      <div
        className="pointer-events-none absolute -right-14 top-6 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(224,138,60,0.35) 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <svg viewBox="0 0 600 320" className="relative h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <line x1={40} y1={MVP_BASE_Y} x2={470} y2={MVP_BASE_Y} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />

        {MVP_BARS.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={MVP_BASE_Y - bar.h}
            width={36}
            height={bar.h}
            rx={6}
            fill={bar.warn ? "#E08A3C" : "#C7CBDC"}
            opacity={bar.warn ? 0.95 : 0.7}
          />
        ))}

        {/* crack/warning glyph over the last bar */}
        <g transform="translate(408, 60)">
          <path
            d="M18,0 L36,32 L27,32 L32,48 L10,20 L19,20 Z"
            fill="#E08A3C"
          />
        </g>

        <text x={292} y={92} fontSize={12} fontWeight={600} fill="#F0C39A" fontFamily="var(--font-poppins), sans-serif" letterSpacing="0.05em">
          REAL USERS ARRIVE
        </text>
        <line x1={292} y1={100} x2={462} y2={100} stroke="#E08A3C" strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
      </svg>
    </>
  );
}

function TwoPathsScene() {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-10 -bottom-16 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(109,92,232,0.35) 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <svg viewBox="0 0 600 320" className="relative h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* origin point */}
        <circle cx={70} cy={170} r={6} fill="#C7CBDC" />
        <text x={40} y={200} fontSize={11} fontWeight={600} fill="rgba(255,255,255,0.5)" fontFamily="var(--font-poppins), sans-serif" letterSpacing="0.05em">
          IDEA
        </text>

        {/* broken/jagged path, drooping down */}
        <path
          d="M70,170 L160,196 L214,182 L268,224 L330,214 L392,250"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={2}
          strokeDasharray="4 6"
          strokeLinecap="round"
        />
        <g transform="translate(392, 250)">
          <path d="M-9,-9 L9,9 M9,-9 L-9,9" stroke="#E0637A" strokeWidth={3.5} strokeLinecap="round" />
        </g>

        {/* smooth, rising accent path */}
        <path
          d="M70,170 L150,150 L220,140 L300,105 L380,78 L452,48"
          fill="none"
          stroke="#6D5CE8"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {[150, 220, 300, 380].map((x, i) => {
          const ys = [150, 140, 105, 78];
          return <circle key={x} cx={x} cy={ys[i]} r={4} fill="#6D5CE8" opacity={0.7} />;
        })}
        <circle cx={452} cy={48} r={7} fill="#6D5CE8" />

        <text x={462} y={52} fontSize={12} fontWeight={600} fill="#B7AEF5" fontFamily="var(--font-poppins), sans-serif" letterSpacing="0.05em">
          REAL MVP
        </text>
      </svg>
    </>
  );
}

function IconScene({ icon: Icon, color, label }: { icon: LucideIcon; color: string; label: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-10 -top-10 h-64 w-64 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${color}59 0%, transparent 70%)` }}
        aria-hidden="true"
      />
      <div className="relative flex h-full w-full items-center justify-between px-10 sm:px-14">
        <Icon className="h-16 w-16 flex-none sm:h-20 sm:w-20" style={{ color }} strokeWidth={1.5} aria-hidden="true" />
        <div className="hidden flex-1 sm:block">
          <svg viewBox="0 0 260 40" className="ml-auto h-10 w-full max-w-[260px] overflow-visible" aria-hidden="true">
            <line x1={0} y1={30} x2={260} y2={30} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <path d="M0,26 L50,20 L100,24 L150,12 L200,15 L260,4" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.85} />
            <circle cx={260} cy={4} r={4} fill={color} />
          </svg>
          <p
            className="mt-2 text-right text-xs font-semibold tracking-widest uppercase"
            style={{ color: `${color}CC` }}
          >
            {label}
          </p>
        </div>
      </div>
    </>
  );
}

export function BlogCoverArt({ className, variant = "code-debt" }: BlogCoverArtProps) {
  const iconScene = ICON_SCENES[variant];

  return (
    <div className={`relative overflow-hidden bg-foreground ${className ?? ""}`}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:20px_20px]"
        aria-hidden="true"
      />
      {iconScene && <IconScene icon={iconScene.icon} color={iconScene.color} label={iconScene.label} />}
      {variant === "cloud-cost" && <CloudCostScene />}
      {variant === "vibe-mvp" && <VibeMvpScene />}
      {variant === "two-paths" && <TwoPathsScene />}
      {variant === "code-debt" && <CodeDebtScene />}
    </div>
  );
}
