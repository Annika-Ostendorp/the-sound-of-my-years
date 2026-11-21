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
  // Timing positions still refer to the ORIGINAL 420vh main-journey scroll travel.
  // The extra 200vh hold comes AFTER it, so existing MEMORY_CUES do not shift.
  mainTravelVh: 420,
  holdTravelVh: 200,
  arrival: { start: 0.902, full: 0.952 },
  darken: { start: 0.872, end: 0.951 },
  handoff: { start: 0.64, end: 1.0 },
  arrivalExit: { start: 0.85, end: 0.99 },
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
