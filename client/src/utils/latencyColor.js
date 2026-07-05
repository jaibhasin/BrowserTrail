/**
 * Map cumulative RTT (ms) to heat-edge color: blue → orange → red.
 */
export function latencyColor(cumulativeMs) {
  const ms = Math.max(0, cumulativeMs ?? 0);

  if (ms <= 50) {
    return '#44c8ff';
  }

  if (ms <= 150) {
    const t = (ms - 50) / 100;
    return lerpColor('#44c8ff', '#ffb86b', t);
  }

  const t = Math.min(1, (ms - 150) / 200);
  return lerpColor('#ffb86b', '#ff5c7a', t);
}

function lerpColor(a, b, t) {
  const parse = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}

export function cumulativeRtts(hops) {
  let sum = 0;
  return hops.map((hop) => {
    if (!hop.timedOut && typeof hop.rtt === 'number') {
      sum += hop.rtt;
    }
    return sum;
  });
}
