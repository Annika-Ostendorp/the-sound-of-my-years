/**
 * THE SOUND OF MY YEARS / PORTAL TIMELINE
 *
 * All timestamps are fractions of the portal's scroll travel (0..1).
 * Change only these values to retime the entrance, memories and exit.
 * The working Claude GLSL shader in shaders.js is NOT changed by this file.
 */

export const PORTAL_TIMING = Object.freeze({
  hero: { start: 0.0, end: 0.238, fadeIn: 0.001, fadeOut: 0.074 },
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
  strength: 0.32,
  speed: 1,
});

export const MEMORY_CUES = Object.freeze([
  {
    id: 'listening-habits',
    eyebrow: 'FRAGMENT 01 / AN ASSUMPTION',
    title: 'I thought I knew',
    emphasis: 'my listening habits.',
    start: 0.247,
    end: 0.400,
    side: 'left',
  },
  {
    id: 'returning-songs',
    eyebrow: 'FRAGMENT 02 / AN ABSENCE',
    title: 'Did those songs',
    emphasis: 'ever really leave?',
    start: 0.415,
    end: 0.582,
    side: 'right',
  },
  {
    id: 'raye',
    eyebrow: 'FRAGMENT 03 / A CONSTANT',
    title: 'RAYE was always there.',
    emphasis: 'Wasn’t she?',
    start: 0.597,
    end: 0.751,
    side: 'left',
  },
  {
    id: 'time-twins',
    eyebrow: 'FRAGMENT 04 / A POSSIBILITY',
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
