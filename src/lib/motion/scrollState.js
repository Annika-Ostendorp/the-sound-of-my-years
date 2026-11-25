import { writable } from 'svelte/store';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS, isChapterAvailable } from '../navigation/chapters.js';

const START = Object.freeze({
  progress: 0,
  scrollY: 0,
  velocity: 0,           // signed / smoothed pixels per second
  intensity: 0,          // |velocity|, normalized 0..1
  direction: 1,
  activeChapter: 'capsule',
  reducedMotion: false
});

export const scrollState = writable({ ...START });

let owners = 0;
let disposeShared = null;

/**
 * One globally shared, non-pinning ScrollTrigger. Does NOT alter any
 * existing PortalJourney trigger or progress/cues. Call from onMount.
 * Returns a cleanup function. Multiple mounts share one controller.
 */
export function startScrollState() {
  if (typeof window === 'undefined') return () => {};
  owners += 1;
  if (disposeShared) return releaseOwner;

  gsap.registerPlugin(ScrollTrigger);
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let rawVelocity = 0;
  let smoothVelocity = 0;
  let currentProgress = 0;
  let lastDirection = 1;
  let currentChapter = 'capsule';
  let lastEmit = 0;
  let isDisposed = false;

  const guessChapter = () => {
    const focusLine = window.innerHeight * 0.45;
    let found = 'capsule';
    for (const chapter of CHAPTERS) {
      if (!isChapterAvailable(chapter)) continue;
      const node = document.getElementById(chapter.anchor);
      if (node && node.getBoundingClientRect().top <= focusLine) found = chapter.id;
    }
    return found;
  };

  const rootTrigger = ScrollTrigger.create({
    id: 'tsmy-global-velocity',
    trigger: document.documentElement,
    start: 0,
    end: () => Math.max(1, ScrollTrigger.maxScroll(window)),
    invalidateOnRefresh: true,
    onUpdate(self) {
      rawVelocity = self.getVelocity();
      currentProgress = self.progress;
      lastDirection = self.direction;
      currentChapter = guessChapter();
    }
  });

  function tick(_time, deltaTime) {
    if (isDisposed) return;
    const dt = Math.min(0.06, Math.max(0, deltaTime / 1000));
    const response = 1 - Math.exp(-dt * 7);
    smoothVelocity += (rawVelocity - smoothVelocity) * response;
    // Velocity should return to zero even if the user has stopped scrolling.
    rawVelocity *= Math.exp(-dt * 10);
    const now = performance.now();
    if (now - lastEmit < 33) return; // ~30 store updates/s
    lastEmit = now;
    scrollState.set({
      progress: currentProgress,
      scrollY: window.scrollY,
      velocity: motionQuery.matches ? 0 : smoothVelocity,
      intensity: motionQuery.matches ? 0 : Math.min(1, Math.abs(smoothVelocity) / 1800),
      direction: lastDirection,
      activeChapter: currentChapter,
      reducedMotion: motionQuery.matches
    });
  }

  function onMotionChange() {
    if (motionQuery.matches) { rawVelocity = 0; smoothVelocity = 0; }
  }
  motionQuery.addEventListener('change', onMotionChange);
  gsap.ticker.add(tick);
  currentChapter = guessChapter();
  rootTrigger.refresh();

  disposeShared = () => {
    isDisposed = true;
    gsap.ticker.remove(tick);
    rootTrigger.kill();
    motionQuery.removeEventListener('change', onMotionChange);
    disposeShared = null;
    scrollState.set({ ...START });
  };
  return releaseOwner;
}

function releaseOwner() {
  owners = Math.max(0, owners - 1);
  if (owners === 0) disposeShared?.();
}
