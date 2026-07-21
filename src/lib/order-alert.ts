/** LOUD kitchen alarm for new orders via Web Audio (no asset file needed). */
let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

/**
 * Very loud, hard-to-miss alert: three rounds of an urgent two-tone
 * "kitchen klaxon" bell, at full volume through a compressor so it's
 * as loud as the device allows without distorting.
 */
export async function playOrderAlert() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const now = ctx.currentTime;

  // Compressor keeps the signal at max loudness without clipping.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 14;
  comp.attack.value = 0.002;
  comp.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = 1.0;
  comp.connect(master);
  master.connect(ctx.destination);

  /** One bell strike: fundamental + bright overtones for a piercing ring. */
  const strike = (t: number, f: number, d: number) => {
    for (const [mult, level] of [
      [1, 0.9],
      [2.0, 0.5],
      [3.01, 0.32],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = f * mult;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(level, now + t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
      osc.connect(gain);
      gain.connect(comp);
      osc.start(now + t);
      osc.stop(now + t + d + 0.02);
    }
  };

  // 3 rounds of urgent two-tone "DING-DING ... DING-DING".
  const HI = 1568; // G6
  const LO = 1175; // D6
  for (let round = 0; round < 3; round++) {
    const base = round * 0.85;
    strike(base + 0.0, HI, 0.28);
    strike(base + 0.16, LO, 0.28);
    strike(base + 0.32, HI, 0.28);
    strike(base + 0.48, LO, 0.42);
  }
}
