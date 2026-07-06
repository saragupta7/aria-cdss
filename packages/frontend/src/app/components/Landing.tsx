// import { Link } from "react-router";
// import { Activity } from "lucide-react";

// export function Landing() {
//   return (
//     <div className="min-h-screen bg-vibrant-mesh relative overflow-y-auto overflow-x-hidden">
//       {/* Navigation */}
//       <nav className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-sm">
//         <div className="max-w-[1400px] mx-auto px-12 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
//                 <Activity className="w-6 h-6 text-white" />
//               </div>
//               <span className="text-white text-xl font-medium tracking-wide">ARIA</span>
//             </div>
//             <div className="flex items-center gap-12">
//               <a href="#home" className="text-white/90 hover:text-white transition-colors text-sm font-medium tracking-wide">HOME</a>
//               <a href="#about" className="text-white/90 hover:text-white transition-colors text-sm font-medium tracking-wide">ABOUT</a>
//               <a href="#services" className="text-white/90 hover:text-white transition-colors text-sm font-medium tracking-wide">SERVICES</a>
//               <a href="#contact" className="text-white/90 hover:text-white transition-colors text-sm font-medium tracking-wide">CONTACT US</a>
//               <Link
//                 to="/login"
//                 className="border-2 border-white text-white px-6 py-1.5 rounded-full hover:bg-white hover:text-[#f07e4d] transition-all text-sm font-medium tracking-wide"
//               >
//                 LOGIN
//               </Link>
//             </div>
//           </div>
//         </div>
//       </nav>

//       {/* Hero Section */}
//       <section id="home" className="relative z-10 min-h-screen flex items-center pt-20">
//         <div className="max-w-[1400px] mx-auto px-12 w-full">
//           <div className="max-w-2xl">
//             <h1 className="text-white text-7xl font-bold mb-4 leading-tight tracking-tight">
//               ARIA
//             </h1>
//             <h2 className="text-white/90 text-2xl font-light mb-6 tracking-wide">
//               Automated Risk & Intervention Assistant
//             </h2>
//             <p className="text-white/80 text-base mb-8 leading-relaxed max-w-xl">
//               Real-time hemodynamic instability prediction powered by advanced AI. ARIA provides clinical decision support through intelligent risk assessment, predictive analytics, and actionable insights for ICU patient management.
//             </p>
//             <a
//               href="#about"
//               className="inline-block border-2 border-white text-white px-8 py-3 rounded-full hover:bg-white hover:text-[#f07e4d] transition-all text-sm font-bold tracking-wide shadow-md"
//             >
//               READ MORE
//             </a>
//           </div>
//         </div>
//       </section>

//       {/* About Section */}
//       <section id="about" className="relative z-10 min-h-screen flex items-center bg-black/5 backdrop-blur-sm border-t border-white/10">
//         <div className="max-w-[1400px] mx-auto px-12 py-24 w-full">
//           <h2 className="text-4xl font-bold text-white mb-8">About ARIA</h2>
//           <div className="grid grid-cols-2 gap-12 text-white/90">
//             <p className="leading-relaxed">
//               ICU clinicians often have to monitor dozens of patients simultaneously while detecting subtle warning signs hidden within large volumes of vital-sign data.
//             </p>
//             <p className="leading-relaxed">
//               ARIA continuously analyzes patient data and generates early risk alerts using explainable AI, allowing clinicians to intervene hours before critical events occur.
//             </p>
//           </div>
//         </div>
//       </section>

//       {/* Services Section */}
//       <section id="services" className="relative z-10 min-h-screen flex items-center border-t border-white/10">
//         <div className="max-w-[1400px] mx-auto px-12 py-24 w-full">
//           <h2 className="text-4xl font-bold text-white mb-12">Core Features</h2>
//           <div className="grid grid-cols-3 gap-8">
//             {['Real-Time Monitoring', 'AI Risk Prediction', 'Explainable AI (SHAP)'].map((service, i) => (
//               <div key={i} className="bg-white/10 p-8 rounded-3xl border border-white/20 backdrop-blur-md shadow-sm">
//                 <h3 className="text-xl font-bold text-white mb-4">{service}</h3>
//                 <p className="text-white/80 text-sm leading-relaxed">
//                   Advanced clinical decision support tailored for high-stakes intensive care environments, ensuring timely and accountable interventions.
//                 </p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Contact Section */}
//       <section id="contact" className="relative z-10 min-h-[50vh] flex items-center bg-black/5 backdrop-blur-sm border-t border-white/10">
//         <div className="max-w-[1400px] mx-auto px-12 py-24 w-full text-center">
//           <h2 className="text-4xl font-bold text-white mb-6">Ready to transform ICU care?</h2>
//           <p className="text-white/90 mb-8 max-w-xl mx-auto">
//             Get in touch with our deployment team to schedule a technical demonstration of the ARIA clinical decision support system.
//           </p>
//           <a
//             href="mailto:deploy@aria-medical.com"
//             className="inline-block bg-white text-[#f07e4d] px-10 py-4 rounded-full hover:bg-gray-50 shadow-lg transition-all text-sm font-bold tracking-wide"
//           >
//             CONTACT US
//           </a>
//         </div>
//       </section>
//     </div>
//   );
// }


import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Zap,
  ShieldCheck,
  FileText,
  FlaskConical,
  Radio,
  AlertTriangle,
} from "lucide-react";

/* ============================================================
   ARIA Landing — "the product is the hero"
   A live, interactive bedside monitor: drag the slider to
   deteriorate the simulated patient and watch ARIA predict
   instability hours ahead and fire an alert.
   Requires: src/styles/aria-theme.css imported globally.
   ============================================================ */

const INK = "#060d1a";
const PANEL = "#0e1f38";
const LINE = "#1c3252";
const TRACE = "#2dd4bf";
const CYAN = "#38bdf8";
const ALERT = "#e85d22";
const AMBER = "#f59e0b";

/* ---------- tiny hooks ---------- */

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && el.classList.add("is-visible"),
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function useCountUp(target: number, active: boolean, decimals = 0, ms = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((target * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, decimals, ms]);
  return val;
}

/* ---------- waveform paths (one 160px-wide beat, looped) ---------- */

const ECG_BEAT =
  "M0 40 L18 40 Q23 34 28 40 L44 40 L50 40 L55 12 L61 68 L67 40 L84 40 Q95 28 106 40 L160 40";
const PLETH_BEAT =
  "M0 44 C14 44 18 14 38 14 C52 14 54 30 66 33 C74 35 78 28 86 32 C102 40 116 44 160 44";

function LoopedWave({
  beatPath,
  color,
  beatSeconds,
  glow,
}: {
  beatPath: string;
  color: string;
  beatSeconds: number;
  glow?: boolean;
}) {
  const copies = [0, 160, 320, 480, 640];
  return (
    <svg viewBox="0 0 480 80" className="w-full h-full" preserveAspectRatio="none">
      <g className="aria-wave" style={{ ["--beat" as any]: `${beatSeconds}s` }}>
        {copies.map((x) => (
          <path
            key={x}
            d={beatPath}
            transform={`translate(${x},0)`}
            fill="none"
            stroke={color}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={glow ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
}

/* ---------- the interactive monitor ---------- */

function LiveMonitor() {
  const [severity, setSeverity] = useState(18);
  const [, setPulse] = useState(0);

  // gentle live jitter so the numbers feel like real telemetry
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 1600);
    return () => clearInterval(id);
  }, []);

  const jitter = (n: number) => n + Math.round(Math.random() * 2 - 1);
  const hr = jitter(Math.round(78 + severity * 0.55));
  const map = jitter(Math.round(88 - severity * 0.28));
  const spo2 = Math.min(100, jitter(Math.round(99 - severity * 0.07)));
  const risk = Math.min(96, Math.round(6 + severity * 0.92));
  const lead = (9 - severity * 0.05).toFixed(1);

  const level = risk >= 70 ? "CRITICAL" : risk >= 45 ? "MODERATE" : "STABLE";
  const levelColor = level === "CRITICAL" ? ALERT : level === "MODERATE" ? AMBER : TRACE;
  const beat = Math.max(0.42, 60 / hr);

  return (
    <div
      className="rounded-3xl border overflow-hidden shadow-2xl"
      style={{ background: PANEL, borderColor: LINE, boxShadow: "0 24px 80px rgba(2,8,23,0.6)" }}
    >
      {/* monitor header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: LINE }}
      >
        <div className="flex items-center gap-2.5 font-tele text-[11px] tracking-widest text-slate-400">
          <span className="w-2 h-2 rounded-full aria-ring" style={{ background: TRACE }} />
          BED 07 · WARD A · LIVE
        </div>
        <div className="font-tele text-[11px] tracking-widest" style={{ color: levelColor }}>
          {level}
        </div>
      </div>

      {/* traces */}
      <div className="px-5 pt-4 space-y-1 aria-grid-bg">
        <div className="flex items-center gap-4">
          <span className="font-tele text-[10px] w-10 shrink-0" style={{ color: TRACE }}>
            ECG II
          </span>
          <div className="h-16 flex-1 overflow-hidden">
            <LoopedWave beatPath={ECG_BEAT} color={TRACE} beatSeconds={beat} glow />
          </div>
        </div>
        <div className="flex items-center gap-4 pb-3">
          <span className="font-tele text-[10px] w-10 shrink-0" style={{ color: CYAN }}>
            PLETH
          </span>
          <div className="h-12 flex-1 overflow-hidden opacity-80">
            <LoopedWave beatPath={PLETH_BEAT} color={CYAN} beatSeconds={beat * 1.02} />
          </div>
        </div>
      </div>

      {/* vitals row */}
      <div className="grid grid-cols-4 border-t divide-x" style={{ borderColor: LINE }}>
        {[
          { label: "HR", value: hr, unit: "bpm", color: TRACE },
          { label: "MAP", value: map, unit: "mmHg", color: map < 68 ? ALERT : CYAN },
          { label: "SpO₂", value: spo2, unit: "%", color: spo2 < 93 ? AMBER : CYAN },
          { label: "RISK", value: `${risk}`, unit: "%", color: levelColor },
        ].map((v) => (
          <div key={v.label} className="px-4 py-3" style={{ borderColor: LINE }}>
            <p className="font-tele text-[10px] tracking-widest text-slate-500 mb-0.5">{v.label}</p>
            <p className="font-tele text-2xl font-bold leading-none" style={{ color: v.color }}>
              {v.value}
              <span className="text-[10px] text-slate-500 ml-1">{v.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* prediction / alert strip */}
      <div className="px-5 py-4 border-t" style={{ borderColor: LINE }}>
        {risk >= 70 ? (
          <div
            key="alert"
            className="aria-alarm-in flex items-center gap-3 rounded-xl px-4 py-3 border"
            style={{ background: "rgba(232,93,34,0.12)", borderColor: "rgba(232,93,34,0.4)" }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: ALERT }} />
            <p className="font-tele text-xs leading-relaxed" style={{ color: "#fca97e" }}>
              ARIA ALERT · hemodynamic instability predicted in {lead}h · pushed to Ward A team
              in 0.4s
            </p>
          </div>
        ) : (
          <p className="font-tele text-xs text-slate-500 py-2">
            <span className="aria-blink" style={{ color: TRACE }}>▮</span> ARIA watching · next
            inference in 3s · projected stability horizon {lead}h
          </p>
        )}
      </div>

      {/* the interactive part */}
      <div className="px-5 pb-5 pt-1">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Try it — deteriorate the patient
          </label>
          <span className="font-tele text-[11px] text-slate-500">{severity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={severity}
          onChange={(e) => setSeverity(parseInt(e.target.value))}
          className="aria-slider w-full"
          aria-label="Simulated patient deterioration"
        />
        <div className="flex justify-between font-tele text-[10px] text-slate-600 mt-1.5">
          <span>stable</span>
          <span>septic shock</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- page sections ---------- */

function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setActive(true), {
      threshold: 0.4,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const beds = useCountUp(50, active);
  const auc = useCountUp(0.87, active, 2);
  const lead = useCountUp(5.8, active, 1);
  const latency = useCountUp(0.9, active, 1);

  const stats = [
    { value: `${beds}+`, label: "ICU beds tracked simultaneously" },
    { value: auc.toFixed(2), label: "model AUC-ROC on external test" },
    { value: `${lead.toFixed(1)}h`, label: "median warning before instability" },
    { value: `<${latency.toFixed(1)}s`, label: "alert delivery, model to bedside" },
  ];

  return (
    <div ref={ref} className="border-y" style={{ borderColor: LINE, background: "#0a1729" }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`py-10 px-4 ${i !== 0 ? "md:border-l" : ""}`}
            style={{ borderColor: LINE }}
          >
            <p className="font-display text-4xl md:text-5xl font-bold text-white mb-2">{s.value}</p>
            <p className="font-tele text-[11px] tracking-wide text-slate-500 uppercase leading-relaxed">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const PIPELINE = [
  {
    tag: "T-0ms",
    title: "Ingest",
    body: "Vitals, labs and infusion data stream from every monitored bed into a unified time-series store.",
  },
  {
    tag: "T+120ms",
    title: "Predict",
    body: "An XGBoost + LSTM ensemble scores each patient's 6-hour instability risk on every new observation.",
  },
  {
    tag: "T+180ms",
    title: "Explain",
    body: "SHAP attribution shows exactly which trends — lactate slope, falling MAP — are driving the score.",
  },
  {
    tag: "T+400ms",
    title: "Act",
    body: "Role-routed alerts reach the right clinician in under a second, with every action written to the audit trail.",
  },
];

const FEATURES = [
  {
    icon: Radio,
    title: "Real-time ward telemetry",
    body: "Live census across three wards with per-bed acuity, vasopressor status and predicted-instability flags.",
  },
  {
    icon: BrainCircuit,
    title: "Explainable predictions",
    body: "Every alert ships with its SHAP breakdown, so clinicians see the why — not just a number.",
  },
  {
    icon: Zap,
    title: "Sub-second alerting",
    body: "WebSocket-pushed alerts with acknowledge and escalate workflows, tracked from fire to resolution.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    body: "JWT auth across three tiers — senior clinician, junior clinician, admin — gating every route and action.",
  },
  {
    icon: FileText,
    title: "Complete audit trail",
    body: "Every model output and human action is logged and exportable, built for HIPAA-style accountability.",
  },
  {
    icon: FlaskConical,
    title: "Training sandbox",
    body: "A what-if simulator where teams probe the model with synthetic vitals before trusting it at the bedside.",
  },
];

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`aria-reveal ${className}`}>
      {children}
    </div>
  );
}

/* ---------- the page ---------- */

export function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen font-body text-slate-300" style={{ background: INK }}>
      {/* ---------- nav ---------- */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          scrolled ? "backdrop-blur-xl" : ""
        }`}
        style={{
          background: scrolled ? "rgba(6,13,26,0.85)" : "transparent",
          borderColor: scrolled ? LINE : "transparent",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-white tracking-wide">ARIA</span>
            <span className="hidden md:inline font-tele text-[10px] tracking-widest text-slate-500 border-l pl-3 ml-1" style={{ borderColor: LINE }}>
              ICU DECISION SUPPORT
            </span>
          </a>
          <div className="flex items-center gap-8">
            <a href="#how" className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition-colors">
              How it works
            </a>
            <a href="#features" className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Platform
            </a>
            <a href="#contact" className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Contact
            </a>
            <Link
              to="/login"
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-500 hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/25"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* ---------- hero ---------- */}
      <section id="top" className="relative pt-36 pb-24 overflow-hidden">
        {/* ambient glow */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-25 pointer-events-none"
          style={{ background: "radial-gradient(closest-side, #1d4ed8, transparent)" }}
        />
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-16 items-center relative">
          <div>
            <p className="font-tele text-[11px] tracking-[0.25em] text-cyan-400 mb-6 uppercase">
              Complex Systems Lab · IIIT-Delhi
            </p>
            <h1 className="font-display text-5xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Hours of warning,
              <br />
              not minutes of
              <span style={{ color: TRACE }}> alarm.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-lg mb-10">
              ARIA watches every monitored ICU bed continuously, predicts hemodynamic
              instability up to six hours ahead, and explains each prediction — so clinicians
              intervene before the crash, not during it.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-400/30"
              >
                Open the dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border font-bold text-sm text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                style={{ borderColor: LINE }}
              >
                How it works
              </a>
            </div>
            <p className="font-tele text-[11px] text-slate-600 mt-8">
              ▸ The monitor on the right is live — drag the slider and watch ARIA react.
            </p>
          </div>

          <LiveMonitor />
        </div>
      </section>

      {/* ---------- stats ---------- */}
      <StatsStrip />

      {/* ---------- pipeline ---------- */}
      <section id="how" className="py-28">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <Section className="mb-16 max-w-2xl">
            <p className="font-tele text-[11px] tracking-[0.25em] text-cyan-400 uppercase mb-4">
              One observation, four stages
            </p>
            <h2 className="font-display text-4xl font-bold text-white tracking-tight">
              From bedside signal to clinical action in under a second
            </h2>
          </Section>

          <div className="grid md:grid-cols-4 gap-px rounded-2xl overflow-hidden border" style={{ borderColor: LINE }}>
            {PIPELINE.map((step, i) => (
              <Section key={step.title}>
                <div className="h-full p-7 transition-colors hover:bg-white/[0.03]" style={{ background: PANEL }}>
                  <p className="font-tele text-[11px] tracking-widest mb-5" style={{ color: TRACE }}>
                    {step.tag}
                  </p>
                  <h3 className="font-display text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-600 mt-6 hidden md:block" />
                  )}
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className="py-28 border-t" style={{ borderColor: LINE, background: "#0a1729" }}>
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <Section className="mb-16 max-w-2xl">
            <p className="font-tele text-[11px] tracking-[0.25em] text-cyan-400 uppercase mb-4">
              The platform
            </p>
            <h2 className="font-display text-4xl font-bold text-white tracking-tight">
              Built for the realities of an ICU shift
            </h2>
          </Section>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Section key={f.title}>
                <div
                  className="h-full rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 group"
                  style={{ background: PANEL, borderColor: LINE }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-6 border transition-colors group-hover:border-cyan-400/40"
                    style={{ background: "rgba(56,189,248,0.08)", borderColor: LINE }}
                  >
                    <f.icon className="w-5 h-5" style={{ color: CYAN }} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mb-2.5">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section id="contact" className="py-28 border-t" style={{ borderColor: LINE }}>
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <Section>
            <div
              className="rounded-3xl border p-12 md:p-16 text-center relative overflow-hidden aria-grid-bg"
              style={{ background: PANEL, borderColor: LINE }}
            >
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-5">
                See ARIA on your ward's data
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
                We run technical demonstrations against retrospective data before any live
                deployment — including model validation on your own patient population.
              </p>
              <a
                href="mailto:deploy@aria-medical.com"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/25"
              >
                Schedule a demonstration <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </Section>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t py-10" style={{ borderColor: LINE }}>
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-tele text-[11px] tracking-widest text-slate-500">
              ARIA · AUTOMATED RISK & INTERVENTION ASSISTANT
            </span>
          </div>
          <p className="font-tele text-[11px] text-slate-600">
            Research prototype · not a certified medical device
          </p>
        </div>
      </footer>
    </div>
  );
}
