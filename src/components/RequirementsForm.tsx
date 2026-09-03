"use client";

import { useState } from "react";
import {
  NFR_CATEGORIES,
  type NfrCategory,
  type NonFunctionalRequirement,
  type RequirementInput,
} from "@/lib/c4-schema";

const NFR_LABELS: Record<NfrCategory, string> = {
  scale: "Scale (users / RPS / data volume)",
  availability: "Availability / reliability",
  latency: "Latency / performance",
  security_compliance: "Security / compliance",
  cost: "Cost sensitivity",
  team_constraints: "Team / org constraints",
  other: "Other",
};

const SAMPLE_MISSION: RequirementInput = {
  systemName: "Nearloop",
  description:
    "A mobile and web commerce platform that connects neighbors to buy, sell, and share goods and services close to home — helping neighborhoods build resilient, self-sustaining local economies.",
  actors: [
    "Resident (buyer)",
    "Local seller / maker",
    "Neighborhood moderator",
    "Delivery volunteer",
  ],
  functionalRequirements: [
    "Residents can list goods, produce, or services for sale within their neighborhood",
    "Buyers can discover and search listings within a configurable radius of home",
    "Buyers and sellers can message each other to arrange pickup, delivery, or exchange",
    "Sellers can accept in-app payments or mark a listing as barter / trade",
    "Moderators can review and approve new neighborhood groups before they go live",
    "Residents can rate and review a seller after a completed transaction",
  ],
  nonFunctionalRequirements: [
    {
      category: "scale",
      detail: "Support 500 active neighborhoods at launch, scaling to 10,000 within two years",
    },
    {
      category: "availability",
      detail:
        "99.9% uptime for browsing and messaging; a payment-provider outage should degrade gracefully, not take down the app",
    },
    {
      category: "latency",
      detail: "Nearby-listings search should return results in under 300ms for a 2-mile radius",
    },
    {
      category: "security_compliance",
      detail:
        "PCI-DSS compliant payment handling; only approximate location is shown until a deal is confirmed",
    },
    {
      category: "cost",
      detail:
        "Infrastructure cost should scale sub-linearly with neighborhoods so the platform stays free for community sellers",
    },
  ],
  constraints: [
    "Ship native iOS and Android apps plus a responsive web app from one shared backend",
    "Integrate with a third-party payments processor rather than building custom payment rails",
    "Initial launch limited to a single country for regulatory simplicity",
  ],
};

const inputCls = "hud-input";

function StringListEditor({
  items,
  onChange,
  draft,
  onDraftChange,
  placeholder,
  invalid,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  draft: string;
  onDraftChange: (v: string) => void;
  placeholder: string;
  invalid?: boolean;
}) {
  function commit() {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    onDraftChange("");
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="hud-chip">
          <span className="text-slate-200">{item}</span>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-slate-500 hover:text-rose-400 shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className={`${inputCls} ${invalid ? "!border-rose-500/60" : ""}`}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <button
          type="button"
          onClick={commit}
          className="px-3.5 py-2 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-sm hover:bg-cyan-500/20 shrink-0 transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function NfrEditor({
  items,
  onChange,
  category,
  onCategoryChange,
  detail,
  onDetailChange,
}: {
  items: NonFunctionalRequirement[];
  onChange: (items: NonFunctionalRequirement[]) => void;
  category: NfrCategory;
  onCategoryChange: (c: NfrCategory) => void;
  detail: string;
  onDetailChange: (v: string) => void;
}) {
  function commit() {
    const v = detail.trim();
    if (!v) return;
    onChange([...items, { category, detail: v }]);
    onDetailChange("");
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="hud-chip">
          <span className="text-slate-200">
            <span className="hud-label text-cyan-400/80 mr-1.5">
              {NFR_LABELS[item.category].split(" ")[0]}
            </span>
            {item.detail}
          </span>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-slate-500 hover:text-rose-400 shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <select
          className={`${inputCls} w-auto shrink-0`}
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as NfrCategory)}
        >
          {NFR_CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-slate-900">
              {NFR_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          className={inputCls}
          placeholder="e.g. 'must handle 50k concurrent users at peak'"
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <button
          type="button"
          onClick={commit}
          className="px-3.5 py-2 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-sm hover:bg-cyan-500/20 shrink-0 transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="hud-label text-cyan-400/70">{n}</span>
      <span className="text-sm font-medium text-slate-200">{title}</span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}

export default function RequirementsForm({
  onSubmit,
  submitting,
  error,
  initial,
}: {
  onSubmit: (input: RequirementInput) => void;
  submitting: boolean;
  error?: string | null;
  initial?: RequirementInput;
}) {
  const [systemName, setSystemName] = useState(initial?.systemName ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [actors, setActors] = useState<string[]>(initial?.actors ?? []);
  const [actorsDraft, setActorsDraft] = useState("");
  const [functionalRequirements, setFunctionalRequirements] = useState<string[]>(
    initial?.functionalRequirements ?? [],
  );
  const [frDraft, setFrDraft] = useState("");
  const [nonFunctionalRequirements, setNonFunctionalRequirements] = useState<
    NonFunctionalRequirement[]
  >(initial?.nonFunctionalRequirements ?? []);
  const [nfrCategory, setNfrCategory] = useState<NfrCategory>("scale");
  const [nfrDetail, setNfrDetail] = useState("");
  const [constraints, setConstraints] = useState<string[]>(initial?.constraints ?? []);
  const [constraintsDraft, setConstraintsDraft] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const hasFunctionalReq = functionalRequirements.length > 0 || frDraft.trim().length > 0;
  const looksReady =
    systemName.trim().length > 0 && description.trim().length > 0 && hasFunctionalReq;

  function loadSample() {
    setSystemName(SAMPLE_MISSION.systemName);
    setDescription(SAMPLE_MISSION.description);
    setActors(SAMPLE_MISSION.actors);
    setActorsDraft("");
    setFunctionalRequirements(SAMPLE_MISSION.functionalRequirements);
    setFrDraft("");
    setNonFunctionalRequirements(SAMPLE_MISSION.nonFunctionalRequirements);
    setNfrDetail("");
    setConstraints(SAMPLE_MISSION.constraints);
    setConstraintsDraft("");
    setFormErrors([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Fold in anything the operator typed but didn't explicitly commit with
    // "+ Add" or Enter — the button should never be a dead end just because
    // someone forgot that extra click.
    const finalActors = actorsDraft.trim() ? [...actors, actorsDraft.trim()] : actors;
    const finalFunctionalRequirements = frDraft.trim()
      ? [...functionalRequirements, frDraft.trim()]
      : functionalRequirements;
    const finalNfr = nfrDetail.trim()
      ? [...nonFunctionalRequirements, { category: nfrCategory, detail: nfrDetail.trim() }]
      : nonFunctionalRequirements;
    const finalConstraints = constraintsDraft.trim()
      ? [...constraints, constraintsDraft.trim()]
      : constraints;

    const errors: string[] = [];
    if (!systemName.trim()) errors.push("System name is required.");
    if (!description.trim()) errors.push("Give a one- or two-sentence description.");
    if (finalFunctionalRequirements.length === 0)
      errors.push("Add at least one functional requirement.");

    setActors(finalActors);
    setActorsDraft("");
    setFunctionalRequirements(finalFunctionalRequirements);
    setFrDraft("");
    setNonFunctionalRequirements(finalNfr);
    setNfrDetail("");
    setConstraints(finalConstraints);
    setConstraintsDraft("");

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);

    onSubmit({
      systemName: systemName.trim(),
      description: description.trim(),
      actors: finalActors,
      functionalRequirements: finalFunctionalRequirements,
      nonFunctionalRequirements: finalNfr,
      constraints: finalConstraints,
    });
  }

  return (
    <div className="polaris-scene">
      <form
        onSubmit={handleSubmit}
        className="relative max-w-3xl mx-auto flex flex-col gap-6 py-14 px-4"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-cyan-400" fill="none">
                <path
                  d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z"
                  fill="currentColor"
                  fillOpacity="0.9"
                />
              </svg>
              <h1 className="text-3xl font-semibold text-white tracking-tight">Polaris</h1>
            </div>
            <p className="hud-label text-slate-500 mt-2">
              North-star architecture synthesis engine
            </p>
          </div>

          <div className="flex items-center gap-2 hud-label text-emerald-400/90 pt-1">
            <span className="status-dot inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            engine ready
          </div>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
          Brief the engine on what you&apos;re building — functional and non-functional
          requirements — and get back an interactive, editable C4 architecture: Context and
          Container level to start, with every decision traceable to a requirement.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadSample}
            className="hud-label text-cyan-300/90 border border-cyan-400/25 rounded-md px-3 py-2 hover:bg-cyan-500/10 hover:border-cyan-400/40 transition-colors"
          >
            ⟡ Load sample mission
          </button>
          <span className="text-xs text-slate-600">
            Prefills a hyperlocal-commerce example so you can see the engine run end to end.
          </span>
        </div>

        <div className="hud-panel px-5 py-5">
          <SectionLabel n="01" title="System identity" />
          <div className="flex flex-col gap-1.5">
            <input
              className={inputCls}
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="e.g. Payments Platform 2027"
            />
          </div>
        </div>

        <div className="hud-panel px-5 py-5">
          <SectionLabel n="02" title="Mission brief" hint="what is it, in a sentence or two?" />
          <textarea
            className={inputCls}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. A platform that lets merchants accept and reconcile payments across multiple providers."
          />
        </div>

        <div className="hud-panel px-5 py-5">
          <SectionLabel n="03" title="Operators" hint="actors / users — optional" />
          <StringListEditor
            items={actors}
            onChange={setActors}
            draft={actorsDraft}
            onDraftChange={setActorsDraft}
            placeholder="e.g. Merchant, Support agent, Finance ops"
          />
        </div>

        <div className="hud-panel px-5 py-5">
          <SectionLabel n="04" title="Functional requirements" hint="required — add at least one" />
          <StringListEditor
            items={functionalRequirements}
            onChange={setFunctionalRequirements}
            draft={frDraft}
            onDraftChange={setFrDraft}
            placeholder="e.g. Merchants can accept card and bank payments"
            invalid={formErrors.length > 0 && !hasFunctionalReq}
          />
        </div>

        <div className="hud-panel px-5 py-5">
          <SectionLabel
            n="05"
            title="Non-functional parameters"
            hint="optional — this is what shapes the architecture"
          />
          <NfrEditor
            items={nonFunctionalRequirements}
            onChange={setNonFunctionalRequirements}
            category={nfrCategory}
            onCategoryChange={setNfrCategory}
            detail={nfrDetail}
            onDetailChange={setNfrDetail}
          />
        </div>

        <div className="hud-panel px-5 py-5">
          <SectionLabel n="06" title="Constraints" hint="optional" />
          <StringListEditor
            items={constraints}
            onChange={setConstraints}
            draft={constraintsDraft}
            onDraftChange={setConstraintsDraft}
            placeholder="e.g. Must run on AWS, must integrate with legacy ledger system"
          />
        </div>

        {formErrors.length > 0 && (
          <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-3.5 py-2.5 flex flex-col gap-1">
            {formErrors.map((msg, i) => (
              <span key={i}>{msg}</span>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-3.5 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`relative rounded-lg font-semibold py-3.5 tracking-wide transition-all ${
            submitting
              ? "bg-slate-800 text-slate-400 cursor-wait"
              : looksReady
                ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 hover:from-cyan-400 hover:to-sky-400 shadow-[0_0_28px_-6px_rgba(34,211,238,0.65)]"
                : "bg-slate-800/80 text-slate-300 border border-cyan-400/20 hover:bg-slate-800"
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-500 border-t-slate-200 animate-spin" />
              Synthesizing architecture…
            </span>
          ) : (
            "Generate north-star architecture ▸"
          )}
        </button>
      </form>
    </div>
  );
}
