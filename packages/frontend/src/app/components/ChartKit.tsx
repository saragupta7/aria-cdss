// Shared chart styling — keeps Dashboard and Analytics visually in step with
// the landing/login aesthetic (dark telemetry panels, mono micro-labels,
// thin marks, recessive grid).

// Chart palette. AMBER #e2a80d is the app-wide warning color — validated
// against critical orange #e85d22 for adjacent marks (ΔE 17.2 normal,
// 11.3 CVD); the old #f59e0b failed both.
export const CHART = {
  blue: "#3b82f6",
  amber: "#e2a80d",
  orange: "#e85d22",
  grid: "#f1f5f9",
  tick: "#94a3b8",
};

// Recharts tick style — JetBrains Mono matches the app's telemetry font.
export const AXIS_TICK = {
  fill: CHART.tick,
  fontSize: 10,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
};

// Dark tooltip panel, styled like the landing page's monitor chrome.
export function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-xl"
      style={{ background: "#0e1f38", borderColor: "#1c3252" }}
    >
      {label != null && label !== "" && (
        <p className="font-tele text-[10px] tracking-widest uppercase text-slate-400 mb-1">
          {label}
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: p.color || p.payload?.fill || p.fill || CHART.blue }}
          />
          <span className="font-tele text-xs text-slate-300">
            {p.name}: <span className="font-bold text-white">{p.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// Stat tile — font-tele micro label, big display-face value, tinted icon chip.
// `valueColor` is for status counts only (critical/alerts), never plain metrics.
export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  accent = CHART.blue,
  valueColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: any;
  accent?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="font-tele text-[10px] tracking-widest uppercase text-slate-500 leading-relaxed">
          {label}
        </p>
        {Icon && (
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${accent}14` }}
          >
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </span>
        )}
      </div>
      <p
        className="font-display text-4xl font-bold leading-none tracking-tight"
        style={{ color: valueColor || "#0f172a" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 font-medium mt-2">{sub}</p>}
    </div>
  );
}

// Card shell for chart panels.
export function ChartCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

// Small legend chip (colored dot + text-token label).
export function LegendChip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-tele text-[10px] tracking-wider uppercase text-slate-500">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {children}
    </span>
  );
}
