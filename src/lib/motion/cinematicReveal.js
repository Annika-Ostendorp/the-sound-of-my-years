// Svelte-Action: Inhalte bauen sich beim Scrollen kinematisch auf
// (Opazität, Y-Weg, Maßstab, Unschärfe -> scharf) und "rasten" am Ende mit einem Glow ein.
// Rein von der Scrollposition abhängig, daher vorwärts und rückwärts reversibel.
// Optionen: y, blur, scale, start, end, lock (Glow-Klasse am Element), onLock(bool) (Callback beim Einrasten)
// Verwendung: <div use:cinematicReveal={{ y: 40 }}>…</div>
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './cinematic.css';

export function cinematicReveal(node, options = {}) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return {};
  gsap.registerPlugin(ScrollTrigger);

  let opts;
  let trigger;
  let locked = false;

  const apply = (p) => {
    const e = p * p * (3 - 2 * p);
    node.style.opacity = e.toFixed(3);
    node.style.transform = e >= 0.995 ? 'none' : `translate3d(0, ${((1 - e) * opts.y).toFixed(1)}px, 0) scale(${(opts.scale + (1 - opts.scale) * e).toFixed(4)})`;
    node.style.filter = e >= 0.995 ? 'none' : `blur(${((1 - e) * opts.blur).toFixed(1)}px)`;
    if (p >= 0.985 && !locked) { locked = true; if (opts.lock) node.classList.add('cr-locked'); opts.onLock?.(true); }
    else if (p < 0.95 && locked) { locked = false; node.classList.remove('cr-locked'); opts.onLock?.(false); }
  };

  const build = (next) => {
    opts = { y: 46, blur: 14, scale: 0.965, start: 'top 94%', end: 'top 60%', lock: true, ...next };
    trigger?.kill();
    node.classList.add('cr');
    trigger = ScrollTrigger.create({
      trigger: node, start: opts.start, end: opts.end,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress)
    });
    apply(trigger.progress);
  };
  build(options);

  return {
    update: build,
    destroy() {
      trigger?.kill();
      node.classList.remove('cr', 'cr-locked');
      node.style.opacity = node.style.transform = node.style.filter = '';
    }
  };
}
