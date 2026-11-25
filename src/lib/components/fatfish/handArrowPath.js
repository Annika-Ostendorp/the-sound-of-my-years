/**
 * Fatfish-Stil: ein einziger, eleganter Schwung (Catmull-Rom durch wenige Punkte) mit kleiner,
 * leicht asymmetrischer Pfeilspitze. bend: Krümmung (Vorzeichen = Richtung).
 */
export function arrowPath(from, to, { bend = 0.3, curl = false, seed = 3, head = true, s = false } = {}) {
  const rnd = (i) => { const x = Math.sin(seed * 91.17 + i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1;
  const u = { x: dx / L, y: dy / L }, n = { x: -u.y, y: u.x };
  const sgn = bend >= 0 ? 1 : -1, b = Math.abs(bend);
  const P = (a, o) => ({ x: from.x + u.x * a * L + n.x * o * L * sgn, y: from.y + u.y * a * L + n.y * o * L * sgn });
  if (s) {
    const P2 = (a, o) => ({ x: from.x + u.x * a * L + n.x * o * L * sgn, y: from.y + u.y * a * L + n.y * o * L * sgn });
    const c1 = P2(0.30, b * 0.75), c2 = P2(0.70, -b * 0.55);
    let d = `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
    if (head) {
      const tl = Math.hypot(to.x - c2.x, to.y - c2.y) || 1, ux = (to.x - c2.x) / tl, uy = (to.y - c2.y) / tl;
      const rot = (ang) => ({ x: ux * Math.cos(ang) - uy * Math.sin(ang), y: ux * Math.sin(ang) + uy * Math.cos(ang) });
      const r1 = rot(0.50), r2 = rot(-0.58);
      d += ` M ${(to.x - r1.x * 20).toFixed(1)} ${(to.y - r1.y * 20).toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)} L ${(to.x - r2.x * 16).toFixed(1)} ${(to.y - r2.y * 16).toFixed(1)}`;
    }
    return d;
  }
  const pts = [];
  if (curl) {
    const r = Math.max(9, Math.min(17, L * 0.07));
    // Mini-Schleife am Start (wie ein Stift, der kurz ansetzt)
    const c = { x: from.x - n.x * r * sgn * 1.0, y: from.y - n.y * r * sgn * 1.0 };
    const ang0 = Math.atan2(from.y - c.y, from.x - c.x);
    const dir = -sgn;
    for (let k = 0; k <= 5; k++) {
      const a = ang0 + dir * (k / 5) * Math.PI * 1.55;
      const rr = r * (1 + k * 0.09);
      pts.push({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr });
    }
  } else pts.push({ ...from });
  if (s) {
    // lässiger S-Schwung: erst weit ausholen, dann zurückschwingen und weich auf das Ziel zulaufen
    pts.push(P(0.28, b * 0.95));
    pts.push(P(0.64, -b * 0.38));
    pts.push(P(0.90, b * 0.07));
  } else {
    pts.push(P(0.34, b * 0.80 + rnd(1) * 0.02));
    pts.push(P(0.72, b * 0.42 + rnd(2) * 0.02));
  }
  pts.push({ ...to });
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  if (head) {
    const a = pts[pts.length - 2], t = pts[pts.length - 1];
    const tl = Math.hypot(t.x - a.x, t.y - a.y) || 1, ux = (t.x - a.x) / tl, uy = (t.y - a.y) / tl;
    const rot = (ang) => ({ x: ux * Math.cos(ang) - uy * Math.sin(ang), y: ux * Math.sin(ang) + uy * Math.cos(ang) });
    const s1 = 19 + rnd(7) * 3, s2 = 15 + rnd(8) * 3, r1 = rot(0.50), r2 = rot(-0.58);
    d += ` M ${(t.x - r1.x * s1).toFixed(1)} ${(t.y - r1.y * s1).toFixed(1)} L ${t.x.toFixed(1)} ${t.y.toFixed(1)} L ${(t.x - r2.x * s2).toFixed(1)} ${(t.y - r2.y * s2).toFixed(1)}`;
  }
  return d;
}
