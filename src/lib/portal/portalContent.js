// Inhalte der Portal-Karten: verbindet portal_cards.json (Redaktion) mit portal_data.json (echte Daten)
// und rhythm_2026_preview.json (Stundenprofile). Reine Funktionen, kein Netzwerk.
import cfg from '../data/portal_cards.json';
import data from '../data/portal_data.json';
import rhythm from '../data/rhythm_2026_preview.json';

export const initials = (s = '') =>
  s.replace(/\(.*?\)|\[.*?\]/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
export const shortTitle = (s = '', n = 26) => {
  const t = s.replace(/\s[-–]\s.*$/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
export const fmtNum = (n) => n.toLocaleString('en-US');

const resolve = (ref) => {
  if (ref === 'first') return { song: data.first, date: fmtDate(data.first.date) };
  if (ref === 'song2022') return { song: data.song2022, minutes: data.song2022.minutes };
  if (ref === 'habit') return { habit: data.habit };
  if (ref === 'raye-first') return { artist: { name: 'RAYE', image: data.raye.image }, covers: data.raye.top.slice(0, 3), song: data.raye.first, date: fmtDate(data.raye.first.date) };
  if (ref === 'raye-now') return { artist: { name: 'RAYE', image: data.raye.image }, covers: data.raye.top.slice(0, 3), hours: data.raye.hours['2026'] };
  const [kind, idx] = ref.split(':');
  if (kind === 'comeback') return { comeback: data.comebacks[Number(idx)] };
  if (kind === 'loved') return { comeback: data._loved_again[Number(idx)] };
  return {};
};
export const cards = cfg.cards.map((c) => ({ ...c, ...resolve(c.ref) }));

// --- Hypothesen-Karten --------------------------------------------------------------------------
const profile = (id) => rhythm.profiles.find((p) => p.id === id)?.hours ?? [];
const norm = (a) => { const m = Math.max(...a, 1); return a.map((v) => v / m); };

export const habitArt = { bars: norm(profile('ALL')) };

export const rayeArt = { name: 'RAYE', image: data.raye.image, covers: data.raye.top, hours: data.raye.hours };

export const returningArt = {
  tiles: data.comebacks.slice(0, 3),
  years: (c) => Math.round((c.gapDays / 365) * 10) / 10
};

// Welche zwei Wochentage klingen am ähnlichsten? (Pearson-Korrelation der 24 Stundenwerte)
const corr = (a, b) => {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db || 1);
};
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
let best = { r: -2 };
for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) {
  const r = corr(profile(DAYS[i]), profile(DAYS[j]));
  if (r > best.r) best = { r, a: DAYS[i], b: DAYS[j] };
}
export const twinsArt = { a: best.a, b: best.b, r: best.r, pa: norm(profile(best.a)), pb: norm(profile(best.b)) };

// Deterministische Mini-Waveform (dekorativ), je Karte ein anderer Seed.
export const waveBars = (seed) => Array.from({ length: 28 }, (_, k) => {
  const n = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
  const r = n - Math.floor(n);
  return 0.18 + 0.82 * Math.pow(r, 0.8) * (0.55 + 0.45 * Math.sin(k / 27 * Math.PI));
});
