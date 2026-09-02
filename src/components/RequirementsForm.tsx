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

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400";

function StringListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm"
        >
          <span className="text-slate-700">{item}</span>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-slate-400 hover:text-red-500 shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-md bg-slate-800 text-white text-sm hover:bg-slate-700 shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function NfrEditor({
  items,
  onChange,
}: {
  items: NonFunctionalRequirement[];
  onChange: (items: NonFunctionalRequirement[]) => void;
}) {
  const [category, setCategory] = useState<NfrCategory>("scale");
  const [detail, setDetail] = useState("");

  function add() {
    const v = detail.trim();
    if (!v) return;
    onChange([...items, { category, detail: v }]);
    setDetail("");
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm"
        >
          <span className="text-slate-700">
            <span className="font-medium text-slate-500">
              [{NFR_LABELS[item.category].split(" ")[0]}]
            </span>{" "}
            {item.detail}
          </span>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-slate-400 hover:text-red-500 shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <select
          className={`${inputCls} w-auto shrink-0`}
          value={category}
          onChange={(e) => setCategory(e.target.value as NfrCategory)}
        >
          {NFR_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {NFR_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          className={inputCls}
          placeholder="e.g. 'must handle 50k concurrent users at peak'"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-md bg-slate-800 text-white text-sm hover:bg-slate-700 shrink-0"
        >
          Add
        </button>
      </div>
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
  const [functionalRequirements, setFunctionalRequirements] = useState<string[]>(
    initial?.functionalRequirements ?? [],
  );
  const [nonFunctionalRequirements, setNonFunctionalRequirements] = useState<
    NonFunctionalRequirement[]
  >(initial?.nonFunctionalRequirements ?? []);
  const [constraints, setConstraints] = useState<string[]>(initial?.constraints ?? []);

  const canSubmit =
    systemName.trim().length > 0 &&
    description.trim().length > 0 &&
    functionalRequirements.length > 0 &&
    !submitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      systemName: systemName.trim(),
      description: description.trim(),
      actors,
      functionalRequirements,
      nonFunctionalRequirements,
      constraints,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex flex-col gap-6 py-10 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">North Star</h1>
        <p className="text-slate-500 text-sm mt-1">
          Describe what you&apos;re building. You&apos;ll get back an interactive C4
          architecture — Context and Container level — with every choice tied to a
          requirement.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">System name</label>
        <input
          className={inputCls}
          value={systemName}
          onChange={(e) => setSystemName(e.target.value)}
          placeholder="e.g. Payments Platform 2027"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          What is it, in a sentence or two?
        </label>
        <textarea
          className={inputCls}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. A platform that lets merchants accept and reconcile payments across multiple providers."
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          Actors / users <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <StringListEditor
          items={actors}
          onChange={setActors}
          placeholder="e.g. Merchant, Support agent, Finance ops"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          Functional requirements <span className="text-red-500">*</span>
        </label>
        <StringListEditor
          items={functionalRequirements}
          onChange={setFunctionalRequirements}
          placeholder="e.g. Merchants can accept card and bank payments"
        />
        {functionalRequirements.length === 0 && (
          <p className="text-xs text-slate-400">Add at least one.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          Non-functional requirements{" "}
          <span className="text-slate-400 font-normal">(optional, but this is what shapes the architecture)</span>
        </label>
        <NfrEditor items={nonFunctionalRequirements} onChange={setNonFunctionalRequirements} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          Constraints <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <StringListEditor
          items={constraints}
          onChange={setConstraints}
          placeholder="e.g. Must run on AWS, must integrate with legacy ledger system"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-slate-900 text-white font-medium py-2.5 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "Generating architecture…" : "Generate north-star architecture"}
      </button>
    </form>
  );
}
