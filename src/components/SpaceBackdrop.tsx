/**
 * A deep-space scene that scrolls WITH the page (absolute, not fixed):
 * nebula wash, two layered starfields, a handful of individually-
 * twinkling bright stars, occasional shooting stars, and — the point of
 * it — Polaris itself, glowing near the true top of the page with
 * photographic diffraction spikes, the literal brand mark rendered as sky.
 *
 * Positions are percentages of the backdrop's own box (which is sized to
 * the full scrollable page, not the viewport), so the field covers the
 * whole page exactly once — it doesn't stay parked over whatever content
 * happens to be on screen as the user scrolls, and it doesn't leave a
 * starless gap below the first screenful on a long page.
 *
 * Star positions are generated once at module load from a fixed seed, so
 * server and client render the exact same markup (no hydration mismatch,
 * no need for a mount-gated useEffect).
 */

function mulberry32(seed: number) {
  let s = seed;
  return function rng() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Star = { left: number; top: number; size: number; color: string };

function buildStars(rng: () => number, count: number, size: number, colors: string[]): Star[] {
  return Array.from({ length: count }, () => ({
    left: rng() * 100,
    top: rng() * 100,
    size,
    color: colors[Math.floor(rng() * colors.length)],
  }));
}

const rngA = mulberry32(1337);
const rngB = mulberry32(9001);
// Keep the top ~14% (where Polaris and the header live) a little emptier
// so the dense dust field doesn't compete with the hero star.
const DUST_STARS = buildStars(rngA, 130, 1, ["#ffffff", "#dbeeff", "#eaf6ff"]).filter(
  (s) => s.top > 8,
);
const MID_STARS = buildStars(rngB, 55, 1.6, ["#ffffff", "#cfe8ff"]).filter((s) => s.top > 8);

const rngBright = mulberry32(4242);
const BRIGHT_STARS = Array.from({ length: 10 }, () => ({
  left: rngBright() * 100,
  top: 10 + rngBright() * 85,
  size: 1.5 + rngBright() * 1.8,
  duration: 3 + rngBright() * 4,
  delay: rngBright() * 5,
}));

function StarLayer({ stars, className }: { stars: Star[]; className: string }) {
  return (
    <div className={className}>
      {stars.map((s, i) => (
        <span
          key={i}
          className="star-dot"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: s.color,
          }}
        />
      ))}
    </div>
  );
}

export default function SpaceBackdrop() {
  return (
    <div className="space-backdrop" aria-hidden="true">
      <StarLayer stars={DUST_STARS} className="star-layer layer-a" />
      <StarLayer stars={MID_STARS} className="star-layer layer-b" />

      {BRIGHT_STARS.map((s, i) => (
        <span
          key={i}
          className="bright-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `bright-star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      <span className="shooting-star" style={{ top: "16%", left: "6%", animationDelay: "1.5s" }} />
      <span className="shooting-star" style={{ top: "34%", left: "52%", animationDelay: "6.5s" }} />

      <div className="polaris-hero-star">
        <div className="bloom" />
        <div className="spikes">
          <div className="spike h" />
          <div className="spike v" />
          <div className="spike d1" />
          <div className="spike d2" />
        </div>
        <div className="core" />
        <div className="label">POLARIS · THE NORTH STAR</div>
      </div>
    </div>
  );
}
