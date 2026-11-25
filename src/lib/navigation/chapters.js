/**
 * The Sound of My Years – canonical navigation map.
 * Scene numbers follow the NEW 01–08 narrative. Old internal names remain
 * stable: #top (capsule), #rhythm (first data world).
 * Do not mark a chapter as live before its destination exists.
 */
export const CHAPTERS = Object.freeze([
  { id: 'capsule', number: '01', anchor: 'top', title: 'Fragments of My Memory', shortTitle: 'The Capsule', status: 'live', period: '2018–2026' },
  { id: 'rhythm', number: '02', anchor: 'rhythm', title: 'The Rhythm of My Day', shortTitle: 'Listening Patterns', status: 'preview', period: '2026' },
  { id: 'gravity', number: '03', anchor: 'gravity', title: 'The Gravity of Music', shortTitle: 'Artist Universe', status: 'planned', period: '2026' },
  { id: 'eras', number: '04', anchor: 'eras', title: 'The Eras I Never Named', shortTitle: 'The Time Lens', status: 'planned', period: '2018–2026' },
  { id: 'returning', number: '05', anchor: 'returning', title: 'The Songs That Found Their Way Back', shortTitle: 'Returning Songs', status: 'planned', period: '2018–2026' },
  { id: 'raye', number: '06', anchor: 'raye', title: 'RAYE: The Artist Who Stayed', shortTitle: 'A Personal Thread', status: 'planned', period: '2018–2026' },
  { id: 'rabbit-hole', number: '07', anchor: 'rabbit-hole', title: 'The Listening Rabbit Hole', shortTitle: 'Listening Sessions', status: 'planned', period: '2026' },
  { id: 'expectation', number: '08', anchor: 'expectation', title: 'Expectation vs. Reality', shortTitle: 'The Final Reveal', status: 'planned', period: '2026' }
]);

export const isChapterAvailable = (chapter) => chapter.status !== 'planned';
export const getChapter = (id) => CHAPTERS.find((chapter) => chapter.id === id) ?? null;

/** Only navigate to an actual, released DOM destination. */
export function navigateToChapter(chapter, reducedMotion = false) {
  if (typeof document === 'undefined' || !chapter || !isChapterAvailable(chapter)) return false;
  const target = document.getElementById(chapter.anchor);
  if (!target) return false;
  target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  return true;
}
