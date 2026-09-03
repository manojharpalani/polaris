/**
 * A fixed, jaw-dropping deep-space scene used behind the pre-app screens
 * (landing + requirements intake): nebula wash, two layered starfields, a
 * handful of individually-twinkling bright stars, occasional shooting
 * stars, and — the point of it — Polaris itself, glowing at the top with
 * photographic diffraction spikes, the literal brand mark rendered as sky.
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

function buildShadow(rng: () => number, count: number, sizePx: number, colors: string[]) {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rng() * 100).toFixed(2);
    const y = (rng() * 100).toFixed(2);
    const color = colors[Math.floor(rng() * colors.length)];
    parts.push(`${x}vw ${y}vh 0 ${sizePx}px ${color}`);
  }
  return parts.join(", ");
}

const rngA = mulberry32(1337);
const rngB = mulberry32(9001);
const DUST_SHADOW = buildShadow(rngA, 220, 0, ["#ffffff", "#dbeeff", "#eaf6ff"]);
const MID_SHADOW = buildShadow(rngB, 90, 0.6, ["#ffffff", "#cfe8ff"]);

const rngBright = mulberry32(4242);
const BRIGHT_STARS = Array.from({ length: 12 }, () => ({
  left: `${(rngBright() * 100).toFixed(2)}vw`,
  top: `${(rngBright() * 92).toFixed(2)}vh`,
  size: 1.5 + rngBright() * 1.8,
  duration: 3 + rngBright() * 4,
  delay: rngBright() * 5,
}));

export default function SpaceBackdrop() {
  return (
    <div className="space-backdrop" aria-hidden="true">
      <div
        className="star-field layer-a"
        style={{ boxShadow: DUST_SHADOW }}
      />
      <div
        className="star-field layer-b"
        style={{ boxShadow: MID_SHADOW }}
      />

      {BRIGHT_STARS.map((s, i) => (
        <span
          key={i}
          className="bright-star"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animation: `bright-star-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      <span className="shooting-star" style={{ top: "18vh", left: "6vw", animationDelay: "1.5s" }} />
      <span className="shooting-star" style={{ top: "38vh", left: "52vw", animationDelay: "6.5s" }} />

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
