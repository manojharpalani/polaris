"use client";

/**
 * A placeholder leaf card shown inside a group that's currently generating
 * its first real children (see composite-layout.ts's skeleton-injection).
 * Purely decorative — not selectable, not draggable, carries no data — it
 * exists only so the boundary box the user just expanded shows visible
 * "something is happening in here" content immediately, instead of sitting
 * empty until the LLM call resolves.
 */
export default function SkeletonNode() {
  return (
    <div className="w-[240px] h-[110px] rounded-md border border-cyan-400/15 bg-slate-900/50 px-3 py-2.5 flex flex-col justify-center gap-2">
      <div className="h-2.5 w-3/5 rounded-full bg-cyan-400/15 animate-pulse" />
      <div className="h-2 w-full rounded-full bg-slate-500/15 animate-pulse [animation-delay:120ms]" />
      <div className="h-2 w-4/5 rounded-full bg-slate-500/15 animate-pulse [animation-delay:240ms]" />
    </div>
  );
}
