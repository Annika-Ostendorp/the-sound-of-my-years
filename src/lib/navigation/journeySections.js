/**
 * The Sound of My Years / navigation inventory.
 * Set status to 'live' or 'preview' ONLY when an actual section with this id exists.
 * Planned sections are displayed as non-clickable previews, never as broken links.
 */
export const JOURNEY_SECTIONS = Object.freeze([
  { number: '00', id: 'top', title: 'The Capsule', eyebrow: 'A MEMORY BEGINS', status: 'live' },
  { number: '01', id: 'rhythm', title: 'The Rhythm of My Day', eyebrow: 'LISTENING PATTERNS', status: 'preview' },
  { number: '02', id: 'gravity', title: 'The Gravity of Music', eyebrow: 'ARTIST RELATIONSHIPS', status: 'planned' },
  { number: '03', id: 'eras', title: 'The Eras I Never Named', eyebrow: 'A TIME LENS', status: 'planned' },
  { number: '04', id: 'rediscoveries', title: 'The Songs That Found Their Way Back', eyebrow: 'A HISTORY OF RETURNING', status: 'planned' },
  { number: '05', id: 'raye', title: 'RAYE: The Artist Who Stayed', eyebrow: 'A PERSONAL THREAD', status: 'planned' },
  { number: '06', id: 'rabbit-hole', title: 'The Listening Rabbit Hole', eyebrow: 'SESSION PATHWAYS', status: 'planned' },
  { number: '07', id: 'expectations', title: 'Expectation vs. Reality', eyebrow: 'THE FINAL REVEAL', status: 'planned' },
]);

export const isNavigable = (section) => section.status === 'live' || section.status === 'preview';
