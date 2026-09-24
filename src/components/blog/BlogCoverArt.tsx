type BlogCoverArtProps = {
  className?: string;
  variant?: "code-debt" | "cloud-cost";
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

export function BlogCoverArt({ className, variant = "code-debt" }: BlogCoverArtProps) {
  return (
    <div className={`relative overflow-hidden bg-foreground ${className ?? ""}`}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:20px_20px]"
        aria-hidden="true"
      />
      {variant === "cloud-cost" ? <CloudCostScene /> : <CodeDebtScene />}
    </div>
  );
}
