/**
 * THE SOUND OF MY YEARS / PORTAL TIMELINE
 *
 * All timestamps are fractions of the portal's scroll travel (0..1).
 * Change only these values to retime the entrance, memories and exit.
 * The working Claude GLSL shader in shaders.js is NOT changed by this file.
 */

export const PORTAL_TIMING = Object.freeze({
  // Editorial title fades almost immediately (first ~5.5% of the main scroll journey).
  // The tunnel, four memory cues and World-01 reveal timings are unchanged.
  hero: { start: 0.0, end: 0.055, fadeIn: 0.001, fadeOut: 0.049 },
  navigationEnd: 0.205,
  plunge: { start: 0.238, end: 0.247 },
  // The original 420vh journey is preserved: your MEMORY_CUES stay identical.
  // Pass 03: a shorter 70vh finale instead of 200vh. No drawn-out scroll pause.
  mainTravelVh: 420,
  holdTravelVh: 70,
  arrival: { start: 0.902, full: 0.954 },
  darken: { start: 0.886, end: 0.951 },
  // Hold the fully revealed chapter briefly, then flow into the real data world.
  handoff: { start: 0.54, end: 0.95 },
  arrivalExit: { start: 0.40, end: 0.85 },
});

/**
 * Capsule idle motion is intentionally extremely subtle in Pass 03.
 * strength: 0 disables the new idle effect; 0.12-0.22 is very restrained.
 * speed:   1 is the original tempo, 0.5 is half as fast.
 * The tunnel's own continuous movement stays unchanged.
 */
export const PORTAL_IDLE = Object.freeze({
  strength: 0.20,
  speed: 0.90,
});

export const MEMORY_CUES = Object.freeze([
  {
    id: 'listening-habits',
    eyebrow: '01 / AN ASSUMPTION',
    title: 'I thought I knew',
    emphasis: 'my listening habits.',
    start: 0.247,
    end: 0.400,
    side: 'left',
  },
  {
    id: 'returning-songs',
    eyebrow: '02 / AN ABSENCE',
    title: 'Did those songs',
    emphasis: 'ever really leave?',
    start: 0.415,
    end: 0.582,
    side: 'right',
  },
  {
    id: 'raye',
    eyebrow: '03 / A CONSTANT',
    title: 'RAYE was always there.',
    emphasis: 'Wasn’t she?',
    start: 0.597,
    end: 0.751,
    side: 'left',
  },
  {
    id: 'time-twins',
    eyebrow: '04 / A POSSIBILITY',
    title: 'Which days',
    emphasis: 'would sound the same?',
    start: 0.764,
    end: 0.895,
    side: 'right',
  },
]);

/** Smooth, reversible transition from 0 to 1. */
export function smoothstep01(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Fade up, briefly hold, then fade down (including on reverse scroll). */
export function cueOpacity(progress, cue, fadeIn = 0.020, fadeOut = 0.028) {
  if (progress <= cue.start || progress >= cue.end) return 0;
  return Math.min(
    smoothstep01((progress - cue.start) / fadeIn),
    smoothstep01((cue.end - progress) / fadeOut),
  );
}

/** An independent fade that doesn't modify the Three.js shader. */
export function rangeProgress(progress, start, end) {
  return smoothstep01((progress - start) / (end - start));
}

/**
 * Z-Achsen-Erinnerungskarten (Active-Theory-Prinzip).
 * Jede Karte fliegt von weit hinten (unscharf, transparent) durch die Fokusebene
 * (gestochen scharf, leuchtend) an der Kamera vorbei (weich unscharf, ausblendend).
 * Alles ist eine reine Funktion des Scroll-Fortschritts -> vorwärts & rückwärts reversibel.
 */
export const CARD_FLIGHT = Object.freeze({
  firstStart: 0.19,    // Start der ersten Karte (Anteil der Tunnelreise)
  lastStart: 0.64,     // Start der letzten Karte
  span: 0.27,          // Flugdauer je Karte
  focus: 0.58,         // Position der Fokusebene im Flug (0..1)
  zRange: 3200,        // px: Gesamttiefe der Reise (translateZ)
  maxBlurFar: 10,      // px Tiefenunschärfe weit hinten
  maxBlurNear: 16,     // px Unschärfe beim Vorbeiflug
});

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export function cardState(progress, index, count, f = CARD_FLIGHT) {
  const step = count > 1 ? (f.lastStart - f.firstStart) / (count - 1) : 0;
  const u = (progress - (f.firstStart + index * step)) / f.span;
  if (u <= 0 || u >= 1) return { visible: false, u, z: 0, blur: 0, opacity: 0, focus: 0 };
  const z = (u - f.focus) * f.zRange;
  let blur;
  let opacity;
  if (u < f.focus) {
    const t = (f.focus - u) / f.focus;                       // 1 = ganz hinten, 0 = Fokus
    blur = smoothstep01(t) * f.maxBlurFar;
    opacity = (0.16 + 0.84 * Math.pow(1 - t, 1.25)) * smoothstep01(u / 0.07);
  } else {
    const t = (u - f.focus) / (1 - f.focus);                 // 0 = Fokus, 1 = an der Kamera vorbei
    blur = Math.pow(t, 1.4) * f.maxBlurNear;
    opacity = 1 - smoothstep01((t - 0.5) / 0.5);
  }
  const focus = 1 - clamp01(Math.abs(u - f.focus) / 0.16);
  return { visible: opacity > 0.004, u, z, blur, opacity, focus: smoothstep01(focus) };
}


/**
 * Seitliche Erinnerungskarten: gleiten nacheinander (immer nur eine) vom äußeren Rand des Portals herein,
 * stehen scharf neben der Hypothesen-Karte (auf der gegenüberliegenden Seite) und gleiten wieder hinaus.
 * Reine Funktion des Scroll-Fortschritts, also vorwärts und rückwärts reversibel.
 */
export const SIDE_FLIGHT = Object.freeze({ start: 0.235, end: 0.885, inShare: 0.24, outShare: 0.2 });

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;

export function sideCardState(progress, index, count, f = SIDE_FLIGHT) {
  const slot = (f.end - f.start) / count;
  const u = (progress - (f.start + index * slot)) / slot;
  if (u <= 0 || u >= 1) return { visible: false, offset: 1, opacity: 0, blur: 0, focus: 0 };
  let offset = 0, opacity = 1, blur = 0;
  if (u < f.inShare) { const t = u / f.inShare; offset = 1 - easeOut(t); opacity = Math.min(1, t * 2.2); blur = (1 - t) * 6; }
  else if (u > 1 - f.outShare) { const t = (u - (1 - f.outShare)) / f.outShare; offset = easeIn(t); opacity = 1 - Math.min(1, t * 1.4); blur = t * 5; }
  const focus = Math.max(0, Math.min(1, 1 - offset * 1.4));
  return { visible: true, offset, opacity, blur, focus };
}
