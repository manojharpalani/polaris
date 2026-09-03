"use client";

import SpaceBackdrop from "@/components/SpaceBackdrop";

function BrandMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  );
}

/**
 * The hero centerpiece: a small, glowing, animated C4 context diagram —
 * literally the product's output, used as the brand graphic. Ties "what
 * Polaris makes" directly to "what Polaris looks like."
 */
function HeroDiagram() {
  return (
    <svg
      viewBox="0 0 480 340"
      className="w-full h-auto hero-drift"
      role="img"
      aria-label="Illustrative C4 context diagram: a person and an external system connect to a central software system, which connects to a datastore."
    >
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#5eead4" />
        </marker>
      </defs>

      {/* orbiting boundary ring, hinting at the dashed "previous level" boundary in-app */}
      <g className="hero-spin" opacity="0.35">
        <circle cx="240" cy="170" r="148" fill="none" stroke="#22d3ee" strokeOpacity="0.25" strokeDasharray="2 10" strokeWidth="1.5" />
      </g>

      <circle cx="240" cy="170" r="90" fill="url(#coreGlow)" />

      {/* edges (drawn first, under nodes) */}
      <line x1="112" y1="205" x2="196" y2="182" className="hero-edge" stroke="#5eead4" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="290" y1="150" x2="352" y2="102" className="hero-edge" stroke="#5eead4" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <line x1="292" y1="196" x2="352" y2="242" className="hero-edge" stroke="#5eead4" strokeWidth="1.5" markerEnd="url(#arrow)" />

      {/* person */}
      <g>
        <circle cx="86" cy="196" r="26" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.5" />
        <circle cx="86" cy="188" r="7" fill="#e0e7ff" />
        <path d="M72 208 q14 -14 28 0" stroke="#e0e7ff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="86" y="234" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="9.5" letterSpacing="0.08em" fill="#94a3b8">
          RESIDENT
        </text>
      </g>

      {/* central system — the glowing core */}
      <g className="hero-core">
        <rect x="182" y="136" width="116" height="68" rx="10" fill="#0b1a2e" stroke="#22d3ee" strokeWidth="2" />
        <text x="240" y="164" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="0.1em" fill="#67e8f9" opacity="0.85">
          SOFTWARE SYSTEM
        </text>
        <text x="240" y="182" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="12.5" fontWeight="600" fill="#f0f9ff">
          Your System
        </text>
      </g>

      {/* external system */}
      <g>
        <rect x="352" y="72" width="106" height="56" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="405" y="96" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="8" letterSpacing="0.08em" fill="#94a3b8">
          EXTERNAL
        </text>
        <text x="405" y="110" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="10.5" fontWeight="600" fill="#e2e8f0">
          Payments API
        </text>
      </g>

      {/* datastore */}
      <g>
        <path
          d="M352 232 h106 v34 a53 12 0 0 1 -106 0 z"
          fill="#0c4a6e"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />
        <ellipse cx="405" cy="232" rx="53" ry="12" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
        <text x="405" y="256" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="10.5" fontWeight="600" fill="#e0f2fe">
          Order Store
        </text>
      </g>
    </svg>
  );
}

function ValuePanel({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="hud-panel px-5 py-5 flex flex-col gap-2">
      <span className="hud-label text-cyan-400/70">{n}</span>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}

function StepPanel({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="hud-label text-cyan-400/80 shrink-0 w-8 pt-0.5">{n}</div>
      <div>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="polaris-scene">
      <SpaceBackdrop />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 flex flex-col gap-24">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <BrandMark className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white tracking-tight">Polaris</span>
          </button>
          <button
            onClick={onEnter}
            className="hud-label text-slate-300 border border-slate-600/50 rounded-md px-3.5 py-2 hover:bg-slate-800/60 transition-colors"
          >
            Enter the engine ▸
          </button>
        </header>

        <section className="grid md:grid-cols-2 gap-14 items-center pt-6">
          <div className="flex flex-col gap-6">
            <span className="hud-label text-cyan-400/80">North-star architecture synthesis engine</span>
            <h1 className="text-4xl sm:text-5xl font-semibold text-white leading-[1.08] tracking-tight">
              Every engineering org needs a north star.
              <br />
              <span className="text-cyan-300">Most never draw one.</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-lg">
              The technical vision usually lives in someone&apos;s head, a stale slide, or a
              whiteboard photo — free-form, inconsistent, and out of date the moment it&apos;s
              drawn. Polaris turns your requirements into a real, standards-based{" "}
              <span className="text-slate-200">C4 architecture</span> — Context, Container,
              Component, and Code — that&apos;s interactive, editable, and traceable back to the
              requirement that drove every decision.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={onEnter}
                className="rounded-lg font-semibold py-3.5 px-6 tracking-wide bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 hover:from-cyan-400 hover:to-sky-400 shadow-[0_0_28px_-6px_rgba(34,211,238,0.65)] transition-all"
              >
                Generate your architecture ▸
              </button>
              <span className="text-xs text-slate-500">
                No sign-up. Bring your requirements, get a diagram.
              </span>
            </div>
          </div>

          <div className="hud-panel px-4 py-6">
            <HeroDiagram />
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-5">
          <ValuePanel
            n="WHY"
            title="Rationale you can defend"
            body="Every node carries the requirement that produced it — 'Event Bus (Kafka), chosen to absorb 10x traffic spikes.' Point at any box and explain why it exists, live, in front of anyone."
          />
          <ValuePanel
            n="WHAT"
            title="Real C4, not a generic AI diagram"
            body="Correct notation, sensible technology choices, clean auto-layout — full C4 depth from Context down through Container, Component, and Code, not a single flat blob of boxes."
          />
          <ValuePanel
            n="HOW"
            title="Drill down where it matters"
            body="Start at Context. Click into any container, component, or class exactly where you need the detail, with a dashed boundary always showing which level you came from."
          />
        </section>

        <section className="grid md:grid-cols-[220px_1fr] gap-10 items-start">
          <div>
            <span className="hud-label text-cyan-400/70">Process</span>
            <h2 className="text-2xl font-semibold text-white mt-2">
              From requirements to diagram in minutes
            </h2>
          </div>
          <div className="hud-panel px-6 py-6 flex flex-col gap-5">
            <StepPanel
              n="01"
              title="Brief the engine"
              body="Describe the system, its actors, and its functional and non-functional requirements — scale, availability, latency, compliance, cost, constraints."
            />
            <StepPanel
              n="02"
              title="Generate Context + Container"
              body="Polaris reasons about a sensible target architecture and returns a structured model — not prose, not a static image — laid out as a proper C4 diagram."
            />
            <StepPanel
              n="03"
              title="Explore, expand, edit"
              body="Click any container to expand it into Components, and any component into Code. Rename, delete, or add nodes; every change stays traceable."
            />
            <StepPanel
              n="04"
              title="Export and present"
              body="Pull a clean PNG or SVG straight out of the canvas — ready to drop into a deck, a doc, or an onboarding page."
            />
          </div>
        </section>

        <section className="hud-panel px-8 py-10 flex flex-col items-center text-center gap-4">
          <BrandMark className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-semibold text-white">
            Bring your requirements. Leave with a north star.
          </h2>
          <p className="text-slate-400 text-sm max-w-md">
            It takes longer to read this sentence than it does to load the intake form. Try it
            with the built-in sample if you want to see it run before typing anything.
          </p>
          <button
            onClick={onEnter}
            className="mt-2 rounded-lg font-semibold py-3.5 px-8 tracking-wide bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 hover:from-cyan-400 hover:to-sky-400 shadow-[0_0_28px_-6px_rgba(34,211,238,0.65)] transition-all"
          >
            Enter mission control ▸
          </button>
        </section>

        <footer className="text-center text-xs text-slate-600 pb-6">
          Polaris — north-star architecture, generated and explained.
        </footer>
      </div>
    </div>
  );
}
