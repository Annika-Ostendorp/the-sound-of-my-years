<script>
  import ChapterMark from './ChapterMark.svelte';
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import rhythmData from '../../data/rhythm_2026_preview.json';
  import PeakCallout from '../fatfish/PeakCallout.svelte';
  import { cinematicReveal } from '../../motion/cinematicReveal.js';

  // Optional: echte Top-Songs je Stunde. Entsteht mit scripts/export_hourly_top_tracks.py aus der Spotify-Historie.
  // Fehlt die Datei, bleibt der Songtitel im Zentrum einfach aus (nichts wird erfunden).
  let topFiles = {};
  try { topFiles = import.meta.glob('../../data/hourly_top_tracks.json', { eager: true, import: 'default' }); } catch { topFiles = {}; }
  const topTracks = Object.values(topFiles)[0] ?? null;

  // WORLD 01 / RADIAL ATELIER - a 2D information design object, no WebGL.
  // The data source and the portal scene are deliberately untouched.
  const DAYS = [
    { id: 'ALL', label: 'All' }, { id: 'MON', label: 'Mon' },
    { id: 'TUE', label: 'Tue' }, { id: 'WED', label: 'Wed' },
    { id: 'THU', label: 'Thu' }, { id: 'FRI', label: 'Fri' },
    { id: 'SAT', label: 'Sat' }, { id: 'SUN', label: 'Sun' }
  ];
  const DIAL = Array.from({ length: 12 }, (_, i) => i);
  const profiles = Object.fromEntries(rhythmData.profiles.map((p) => [p.id, p]));
  const absoluteMax = Math.max(1, ...rhythmData.profiles.flatMap((p) => p.hours));
  const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
  const CENTER = 450;
  const START_R = 231;
  const MAX_LENGTH = 155;
  const BAR_WIDTH = 29;
  const COLORS = ['#7D6BE0', '#A872E0', '#D463CC', '#F660B9', '#FF7C8F'];
  const WEEK = DAYS.slice(1);
  const BASE_TILT = 8;

  let selectedDay = $state('ALL');
  let selectedPeriod = $state('PM');
  let visibleValues = $state([...profiles.ALL.hours.slice(12)]);
  let hoveredHour = $state(null);
  let pinnedHour = $state(null);
  let openMenu = $state(null);     // 'day' | 'facts' | 'guide' | null
  let leaveTimer = null;
  let toolbar;
  let revealFinished = false;
  let stage;
  let root;
  let tween;
  let live = $state(false);        // Waveform nur animieren, solange die Uhr im Bild ist
  let dialLocked = $state(false);  // Einrast-Glow, sobald die Uhr komplett scharf ist
  let rise = $state(0);            // 0 = Scheibe liegt flach, 1 = aufgerichtet (scroll-gekoppelt)
  let px = $state(0), py = $state(0); // Zeiger-Parallaxe
  let touched = $state(false);     // Hinweis ausblenden, sobald man eine Stunde berührt hat
  let noTilt = false;

  // Waveform-Balken: 7 feine Linien pro Stunde. Die mittlere Linie hat exakt die gemessene Länge,
  // die Nachbarn bilden nur die Wellenform (rein gestalterisch, deterministisch, keine Daten).
  const SHAPE = [0.6, 0.88, 0.68, 1, 0.76, 0.92, 0.56];
  const SUB_GAP = 4.8;
  const rnd = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const WAVE = DIAL.map((p) => SHAPE.map((h, k) => ({
    h: k === 3 ? 1 : h * (0.9 + rnd(p, k) * 0.2),
    x: CENTER + (k - 3) * SUB_GAP,
    t: (1.7 + rnd(p + 3, k) * 1.5).toFixed(2),
    dl: (-rnd(p, k + 9) * 3).toFixed(2),
    lo: (0.74 + rnd(p + 7, k) * 0.12).toFixed(2)
  })));

  const profile = $derived(profiles[selectedDay]);
  const offset = $derived(selectedPeriod === 'AM' ? 0 : 12);
  const selectedHours = $derived(profile.hours.slice(offset, offset + 12));
  const peakPosition = $derived(selectedHours.indexOf(Math.max(...selectedHours)));
  const activeHour = $derived(hoveredHour ?? pinnedHour ?? (offset + peakPosition));
  const activeValue = $derived(profile.hours[activeHour]);
  const hasSelection = $derived(hoveredHour !== null || pinnedHour !== null);
  const tracks = $derived(topTracks ? (topTracks[selectedDay] ?? topTracks.ALL ?? null) : null);
  const hourRow = $derived(tracks?.[activeHour] ?? null);
  const topArtists = $derived(hourRow?.artists?.length ? hourRow.artists : null);
  const topTrack = $derived(topArtists ? topArtists[0] : (hourRow?.track ? hourRow : null));
  const trimmed = (t, n = 30) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const dayLabel = $derived(selectedDay === 'ALL' ? 'Every day' : ({ MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' })[selectedDay]);
  const meanMinutes = $derived(profile.meanDailyMinutes);
  const overallPeak = $derived(profile.hours.indexOf(Math.max(...profile.hours)));
  const tiltX = $derived(42 - (42 - BASE_TILT) * rise - py * 4);
  const tiltY = $derived(px * 6);
  function tilt(e) {
    if (noTilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5;
  }
  function untilt() { px = 0; py = 0; }

  const clamp = (v) => Math.max(0, Math.min(1, v));
  function interpolateHex(start, end, t) {
    const a = [1, 3, 5].map((i) => parseInt(start.slice(i, i + 2), 16));
    const b = [1, 3, 5].map((i) => parseInt(end.slice(i, i + 2), 16));
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function hourColor(minutes) {
    // More minutes = a deeper, more saturated berry tone.
    // The global scale remains unchanged across weekdays and AM/PM.
    const t = clamp(Math.max(0, minutes) / absoluteMax) * (COLORS.length - 1);
    const i = Math.min(COLORS.length - 2, Math.floor(t));
    return interpolateHex(COLORS[i], COLORS[i + 1], t - i);
  }
  function point(r, angle) {
    return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
  }
  function lineFor(position, minutes) {
    // 12 = 00:00 or 12:00, 3 = 03:00 or 15:00, etc.
    const angle = -Math.PI / 2 + (position / 12) * Math.PI * 2;
    const amount = Math.max(0, minutes);
    // True linear length encoding with zero mapped to zero.
    const length = MAX_LENGTH * clamp(amount / absoluteMax);
    return {
      inner: point(START_R, angle),
      outer: point(START_R + length, angle),
      trackEnd: point(START_R + MAX_LENGTH, angle),
      length
    };
  }
  const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;
  const formatEnd = (hour) => formatHour((hour + 1) % 24);
  const currentInterval = $derived(`${formatHour(activeHour)}–${formatEnd(activeHour)}`);

  function pinHour(hour) {
    pinnedHour = pinnedHour === hour ? null : hour;
    hoveredHour = null;
    touched = true;
  }
  function animateValues(target, duration = 1.15) {
    tween?.kill();
    const state = Object.fromEntries(DIAL.map((p) => [p, visibleValues[p]]));
    tween = gsap.to(state, {
      ...Object.fromEntries(DIAL.map((p) => [p, target[p]])),
      duration,
      ease: 'power3.inOut',
      onUpdate: () => { visibleValues = DIAL.map((p) => state[p]); }
    });
  }
  function select(day = selectedDay, period = selectedPeriod) {
    if (!profiles[day] || !['AM', 'PM'].includes(period)) return;
    selectedDay = day;
    selectedPeriod = period;
    hoveredHour = null;
    pinnedHour = null;
    const target = profiles[day].hours.slice(period === 'AM' ? 0 : 12, period === 'AM' ? 12 : 24);
    if (revealFinished && !window.matchMedia(reducedMotionQuery).matches) animateValues(target);
    else { tween?.kill(); visibleValues = [...target]; }
  }
  const cardPos = $derived.by(() => {
    const pIdx = activeHour - offset;
    if (pIdx < 0 || pIdx > 11) return { right: true, y: 40 };
    const o = lineFor(pIdx, visibleValues[pIdx]).outer;
    return { right: o.x >= 450, y: Math.max(10, Math.min(74, (o.y / 900) * 100)) };
  });

  function hoverHour(hour) { clearTimeout(leaveTimer); hoveredHour = hour; touched = true; }
  // kurze Schonfrist, damit man vom Balken zu den Bildern wandern kann, ohne dass sie verschwinden
  function leaveHour() { clearTimeout(leaveTimer); leaveTimer = setTimeout(() => { hoveredHour = null; }, 260); }

  function toggleMenu(name) { openMenu = openMenu === name ? null : name; }
  function handleDocumentKey(event) { if (event.key === 'Escape' && openMenu) { openMenu = null; } }
  function handleOutside(event) { if (openMenu && toolbar && !toolbar.contains(event.target)) openMenu = null; }

  onMount(() => {
    document.addEventListener('keydown', handleDocumentKey);
    document.addEventListener('pointerdown', handleOutside);
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia(reducedMotionQuery).matches;
    noTilt = reduced || window.matchMedia('(pointer: coarse)').matches;
    if (reduced) rise = 1;
    const liveObserver = new IntersectionObserver(([entry]) => { live = entry.isIntersecting; });
    liveObserver.observe(stage);
    let context;
    const revealDisposers = [];
    if (!reduced) {
      const visibleAtStart = stage.getBoundingClientRect().top < window.innerHeight * .83;
      if (!visibleAtStart) visibleValues = DIAL.map(() => 0);
      context = gsap.context(() => {
        // Kinematisches Aufbauen: unscharf -> scharf, scroll-gekoppelt und reversibel.
        gsap.utils.toArray('.rhythm-appear').forEach((element) => {
          const handle = cinematicReveal(element, {
            y: 40, blur: 12, start: 'top 94%', end: 'top 62%',
            lock: false,
            onLock: element.classList.contains('dial-area') ? (v) => { dialLocked = v; } : undefined
          });
          if (handle?.destroy) revealDisposers.push(handle.destroy);
        });
        ScrollTrigger.create({ trigger: stage, start: 'top 92%', end: 'top 40%', scrub: 0.6, onUpdate: (self) => { rise = self.progress; } });
        ScrollTrigger.create({
          trigger: stage,
          start: 'top 83%',
          once: true,
          onEnter: () => {
            revealFinished = true;
            if (!visibleAtStart) animateValues(profiles[selectedDay].hours.slice(selectedPeriod === 'AM' ? 0 : 12, selectedPeriod === 'AM' ? 12 : 24), 1.55);
          }
        });
      }, root);
      if (visibleAtStart) revealFinished = true;
    } else revealFinished = true;
    return () => {
      tween?.kill();
      liveObserver.disconnect();
      context?.revert();
      revealDisposers.forEach((dispose) => dispose());
      document.removeEventListener('keydown', handleDocumentKey);
      document.removeEventListener('pointerdown', handleOutside);
    };
  });
</script>

<section id="chapter-1" class="rhythm-world clock-world" bind:this={root} aria-label="The listening clock">
  <div class="stage-light" aria-hidden="true"><i class="l1"></i><i class="l2"></i><i class="l3"></i><div class="floor"></div></div>
  <div class="instrument-stage" bind:this={stage}>
    <header class="clock-head rhythm-appear">
      <div class="chmark"><ChapterMark n={1} title="The listening clock" center /></div>
      <p class="kicker"><span>TWELVE HOURS AT A TIME</span><i></i><span>{selectedPeriod === 'AM' ? 'MIDNIGHT — NOON' : 'NOON — MIDNIGHT'}</span></p>
      <h3>Each bar is <em>one hour</em> of a day.</h3>
    </header>

    <div class="toolbar rhythm-appear" bind:this={toolbar} role="toolbar" aria-label="Clock controls">
      <div class="has-pop">
        <button type="button" class="tb-btn" aria-haspopup="true" aria-expanded={openMenu === 'day'} aria-controls="pop-day" onclick={() => toggleMenu('day')}>
          <span class="tb-k">DAY</span> {dayLabel} <i class="chev" aria-hidden="true"></i>
        </button>
        {#if openMenu === 'day'}
          <div class="pop pop-day" id="pop-day" role="group" aria-label="Select weekday">
            <button type="button" class="all" class:chosen={selectedDay === 'ALL'} aria-pressed={selectedDay === 'ALL'} onclick={() => { select('ALL', selectedPeriod); openMenu = null; }}>Every day</button>
            {#each WEEK as day}
              <button type="button" class:chosen={selectedDay === day.id} aria-pressed={selectedDay === day.id} onclick={() => { select(day.id, selectedPeriod); openMenu = null; }}>{day.label}</button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="seg" role="group" aria-label="Select morning or afternoon" data-pos={selectedPeriod}>
        <i class="thumb" aria-hidden="true"></i>
        <button type="button" aria-pressed={selectedPeriod === 'AM'} onclick={() => select(selectedDay, 'AM')}><strong>AM</strong><small>00–11</small></button>
        <button type="button" aria-pressed={selectedPeriod === 'PM'} onclick={() => select(selectedDay, 'PM')}><strong>PM</strong><small>12–23</small></button>
      </div>



      <span class="tb-gap" aria-hidden="true"></span>

      <div class="has-pop">
        <button type="button" class="tb-btn quiet" aria-haspopup="true" aria-expanded={openMenu === 'facts'} aria-controls="pop-facts" onclick={() => toggleMenu('facts')}>Key figures <i class="chev" aria-hidden="true"></i></button>
        {#if openMenu === 'facts'}
          <div class="pop pop-wide" id="pop-facts" role="region" aria-label="Key figures">
            <div class="fact"><p class="label">DAILY MUSIC TIME · {rhythmData.period}</p><p class="big"><strong>{meanMinutes.toFixed(1)}</strong><span>min</span></p><p class="cap">Average recorded listening per calendar day</p></div>
            <div class="fact"><p class="label">MOST ACTIVE HOUR</p><p class="big"><strong>{formatHour(overallPeak)}</strong></p><p class="cap">{profile.hours[overallPeak].toFixed(1)} min on average within that hour</p></div>
            <div class="fact memory"><span class="tag">WHAT I REMEMBER</span><p class="quote">A whole day has its own rhythm. <em>Which hours do I return to?</em></p></div>
          </div>
        {/if}
      </div>

      <div class="has-pop">
        <button type="button" class="tb-btn quiet" aria-haspopup="true" aria-expanded={openMenu === 'guide'} aria-controls="pop-guide" onclick={() => toggleMenu('guide')}>Guide <i class="chev" aria-hidden="true"></i></button>
        {#if openMenu === 'guide'}
          <div class="pop pop-wide" id="pop-guide" role="region" aria-label="How to read the clock">
            <ol class="steps">
              <li><b>1</b><span><strong>Longer means more music.</strong> One bar group is one hour of an average day.</span></li>
              <li><b>2</b><span><strong>Hover or tap a bar</strong> to read that hour in the centre, with my three most-played artists of that hour next to the clock.</span></li>
              <li><b>3</b><span><strong>Click a bar</strong> to hold that hour. The three artist portraits stay in view; hover one to see the name.</span></li>
            </ol>
            <div class="legend" aria-label="Colour legend"><span>LESS</span><i style={`background:linear-gradient(90deg,${COLORS.join(',')})`}></i><span>MORE</span></div>
            <p class="legend-note"><i></i> Orange = busiest hour of this selection</p>
            <p class="method-note">Lengths use one linear scale shared by all views. Averages per calendar day, durations split across clock-hour boundaries. Spotify Extended Streaming History, {rhythmData.period}, Europe/Berlin. The music-only filtering is still under review. The data describes recorded listening, not why you listened.</p>
          </div>
        {/if}
      </div>
    </div>

    <div class="dial-area rhythm-appear">
      <div class="dial-scene" role="presentation" onpointermove={tilt} onpointerleave={untilt}>
        <div class="dial-tilt" style={`transform:rotateX(${tiltX}deg) rotateY(${tiltY}deg)`}>
          <div class="dial-wrap" class:locked={dialLocked}>
            <div class="floor-shadow" aria-hidden="true"></div>
            <div class="plate" aria-hidden="true"></div>
            <svg class="glow-svg" class:live viewBox="0 0 900 900" aria-hidden="true">
              {#each DIAL as p (p)}
                {@const hv = visibleValues[p]}
                {@const ln = lineFor(p, hv)}
                {#if hv > 0.5}
                  <line x1={ln.inner.x} y1={ln.inner.y} x2={ln.outer.x} y2={ln.outer.y} stroke={p === peakPosition && !hasSelection ? '#FF945A' : hourColor(hv)} stroke-width="40" stroke-linecap="round" stroke-opacity=".55"/>
                {/if}
              {/each}
            </svg>
            <svg class="clock-svg" class:live viewBox="0 0 900 900" role="group"
            aria-label="Interactive listening clock. Twelve positions match a traditional clock face: twelve at the top, three right, six bottom and nine left. Switch AM and PM for all 24 local hours. Bar length shows average recorded listening within that hour per calendar day; deeper berry colours indicate more listening.">
            <defs>
              <radialGradient id="tsmy-p07-core" cx="47%" cy="42%" r="72%">
                <stop offset="0" stop-color="#46215c" stop-opacity=".9"/>
                <stop offset=".62" stop-color="#1b0c2c" stop-opacity=".98"/>
                <stop offset="1" stop-color="#0b0617"/>
              </radialGradient>
            </defs>

            <!-- The quiet outer instrument grid and hour marks. -->
            <circle cx="450" cy="450" r="399" fill="none" stroke="#dab4d0" stroke-opacity=".16" stroke-width="1.4"/>
            <circle cx="450" cy="450" r="213" fill="none" stroke="#e4bbd6" stroke-opacity=".25" stroke-width="1"/>
            {#each DIAL as p}
              {@const angle = -Math.PI / 2 + p * Math.PI * 2 / 12}
              {@const a = point(396, angle)}
              {@const b = point(p % 3 === 0 ? 414 : 404, angle)}
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#eed3e3" stroke-opacity={p % 3 === 0 ? .52 : .23} stroke-width={p % 3 === 0 ? 2 : 1}/>
            {/each}

            <!-- Waveform-Uhr: je Stunde ein radiales Bündel feiner Linien (Equalizer / Aufnahme-Look).
                 Mittlere Linie = gemessene Minuten; farbig nach Menge, die Spitzenstunde leuchtet warm. -->
            {#each DIAL as p (p)}
              {@const hour = offset + p}
              {@const value = visibleValues[p]}
              {@const full = MAX_LENGTH * clamp(Math.max(0, value) / absoluteMax)}
              {@const active = hoveredHour === hour || (hoveredHour === null && pinnedHour === hour)}
              {@const subdued = hasSelection && !active}
              {@const isPeak = p === peakPosition && !hasSelection}
              {@const color = isPeak ? '#FF945A' : hourColor(value)}
              <g class="hour-set" transform={`rotate(${p * 30} ${CENTER} ${CENTER})`}>
                <line x1={CENTER} y1={CENTER - START_R} x2={CENTER} y2={CENTER - START_R - MAX_LENGTH}
                  stroke={pinnedHour === hour ? "#FF945A" : "#ad88bc"} stroke-width="34" stroke-opacity={subdued ? .04 : active ? (pinnedHour === hour ? .22 : .16) : .09} stroke-linecap="round" pointer-events="none"/>
                {#each WAVE[p] as w, k (k)}
                  {@const len = full * w.h}
                  {#if len > 1.5}
                    <line class="wv" x1={w.x} y1={CENTER - START_R} x2={w.x} y2={CENTER - START_R - len}
                      stroke={color} stroke-width={active ? 4.2 : 3.4} stroke-linecap="round" stroke-opacity={subdued ? .26 : 1}
                      style={`transform-origin:${w.x}px ${CENTER - START_R}px;--t:${w.t}s;--dl:${w.dl}s;--lo:${w.lo}`} pointer-events="none"/>
                  {/if}
                {/each}
                {#if active && full > 1.5}
                  <circle cx={CENTER} cy={CENTER - START_R - full - 12} r="4.5" fill="#fff2ed" opacity=".9" pointer-events="none"/>
                {/if}
                <line class="bar-hit" x1={CENTER} y1={CENTER - START_R} x2={CENTER} y2={CENTER - START_R - MAX_LENGTH}
                  stroke="transparent" stroke-width="52" stroke-linecap="round" pointer-events="stroke"
                  role="button" tabindex="0" aria-pressed={pinnedHour === hour}
                  aria-label={`${formatHour(hour)} to ${formatEnd(hour)}: ${profile.hours[hour].toFixed(1)} average listening minutes in this hour per calendar day. ${pinnedHour === hour ? 'Unpin' : 'Pin'} hour.`}
                  onpointerenter={() => hoverHour(hour)}
                  onpointerleave={leaveHour}
                  onfocus={() => hoverHour(hour)}
                  onblur={leaveHour}
                  onclick={() => pinHour(hour)}
                  onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pinHour(hour); } }}
                  ><title>{formatHour(hour)}–{formatEnd(hour)}: {profile.hours[hour].toFixed(1)} min in this hour per average day</title></line>
              </g>
            {/each}

            <!-- Restore the subtle kinetic lines from the earlier clock prototype. -->
            <circle cx="450" cy="450" r="204" fill="url(#tsmy-p07-core)" stroke="#eac4df" stroke-width="1.4" stroke-opacity=".35"/>
            <circle class="kinetic-orbit kinetic-orbit-a" cx="450" cy="450" r="190" fill="none" stroke="#e8bdd8" stroke-opacity=".31" stroke-width="1.4" stroke-dasharray="1 9"/>
            <circle class="kinetic-orbit kinetic-orbit-b" cx="450" cy="450" r="173" fill="none" stroke="#f6c6de" stroke-opacity=".2" stroke-width="1.3" stroke-dasharray="31 45"/>
            <circle cx="450" cy="450" r="150" fill="none" stroke="#dfb6d4" stroke-opacity=".12" stroke-width="1"/>
            {#each DIAL as p}
              {@const a = -Math.PI / 2 + p * Math.PI * 2 / 12}
              {@const inner = point(148, a)}
              {@const outer = point(p % 3 === 0 ? 158 : 153, a)}
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#f3cfdf" stroke-opacity=".25" stroke-width="1"/>
            {/each}
            <circle class="kinetic-dot" cx="450" cy="261" r="3.6" fill="#f5cce2" opacity=".65"/>

            <text class="core-eyebrow" x="450" y="386" text-anchor="middle">{hasSelection ? pinnedHour === activeHour && hoveredHour === null ? 'PINNED HOUR' : 'HOUR IN FOCUS' : 'MOST ACTIVE HOUR'}</text>
            <text class="core-hour" x="450" y="472" text-anchor="middle">{formatHour(activeHour)}</text>
            <text class="core-value" x="450" y="536" text-anchor="middle">{activeValue.toFixed(1)} min</text>
            <text class="core-foot" x="450" y="568" text-anchor="middle">AVERAGE WITHIN THIS HOUR</text>
            <text class="dial-numeral" x="450" y="31" text-anchor="middle">12</text>
            <text class="dial-numeral" x="878" y="460" text-anchor="middle">3</text>
            <text class="dial-numeral" x="450" y="889" text-anchor="middle">6</text>
            <text class="dial-numeral" x="21" y="460" text-anchor="middle">9</text>
          </svg>
            <div class="callout-layer">
              <PeakCallout
                target={lineFor(peakPosition, selectedHours[peakPosition]).outer}
                label={selectedPeriod === 'PM' ? 'Afternoon peak' : 'Morning peak'}
                value={`${formatHour(offset + peakPosition)} · ${selectedHours[peakPosition].toFixed(1)} min avg.`}
                muted={hasSelection}
              />
            </div>
          </div>
        </div>

        {#if topArtists}
          {#key activeHour}
            <aside class="artist-float" onpointerenter={() => hoverHour(activeHour)} onpointerleave={leaveHour} class:left={!cardPos.right} class:pinned={pinnedHour === activeHour} style={`--y:${cardPos.y}%`} aria-label={`Top artists at ${formatHour(activeHour)}: ${topArtists.map((a) => a.artist).join(', ')}`}>
              {#each topArtists as a, i (a.artist)}
                <figure class="af" style={`--i:${i}`}>
                  <div class="pic">
                    {#if a.image}<img src={a.image} alt={a.artist} loading="lazy"/>{:else}<span aria-hidden="true">{a.artist.slice(0, 1)}</span>{/if}
                  </div>
                  <figcaption>{trimmed(a.artist, 26)}<small>#{i + 1} · {Math.round(a.minutes)} min</small></figcaption>
                </figure>
              {/each}
            </aside>
          {/key}
        {/if}
      </div>
      <p class="dial-hint" class:done={touched}><i aria-hidden="true"></i>{touched ? 'Click a bar to hold that hour' : 'Hover any bar to read that hour'}</p>
      <p class="dial-legend">Next to the clock: my <b>top 3 artists</b> in the hour you point at, ranked by minutes listened in 2026.</p>

    </div>
  </div>
</section>

<style>
  .rhythm-world{position:relative;isolation:isolate;overflow:clip;color:#f5e9f7;background:transparent;padding-bottom:clamp(3rem,7vw,6rem)}
  .stage-light{position:absolute;inset:0;z-index:-1;pointer-events:none;-webkit-mask-image:linear-gradient(180deg,transparent,#000 12%,#000 84%,transparent);mask-image:linear-gradient(180deg,transparent,#000 12%,#000 84%,transparent)}
  .stage-light i{position:absolute;border-radius:50%}
  .l1{left:50%;top:48%;width:86vw;height:64vw;transform:translate(-50%,-50%);background:radial-gradient(closest-side,rgba(110,52,175,.5),rgba(70,28,120,.22) 55%,transparent)}
  .l2{left:-12vw;bottom:-6%;width:46vw;height:46vw;background:radial-gradient(closest-side,rgba(246,96,185,.2),transparent)}
  .l3{right:-14vw;top:12%;width:44vw;height:44vw;background:radial-gradient(closest-side,rgba(255,148,90,.18),transparent)}
  .floor{position:absolute;left:12%;right:12%;bottom:-2%;height:42%;transform:perspective(700px) rotateX(72deg);transform-origin:50% 100%;
    background:repeating-linear-gradient(90deg,rgba(248,238,232,.08) 0 1px,transparent 1px 70px),repeating-linear-gradient(0deg,rgba(248,238,232,.08) 0 1px,transparent 1px 70px);
    -webkit-mask-image:radial-gradient(ellipse at 50% 100%,#000 0,transparent 68%);mask-image:radial-gradient(ellipse at 50% 100%,#000 0,transparent 68%)}

  .instrument-stage{position:relative;max-width:1400px;margin:0 auto;padding:clamp(3rem,6vw,5rem) clamp(1rem,4vw,3rem) 0;display:flex;flex-direction:column;align-items:center}
  .clock-head{text-align:center;margin-bottom:1.4rem}
  .chmark{margin-bottom:1rem}
  .kicker{display:flex;align-items:center;justify-content:center;gap:.9rem;margin:0 0 .8rem;font:700 .64rem var(--font-body,'DM Sans',sans-serif);letter-spacing:.2em;color:#F4B0D0}
  .kicker i{width:34px;height:1px;background:#FF945A;opacity:.8}
  .clock-head h3{margin:0;font:650 clamp(1.8rem,3.4vw,3rem)/1.05 var(--font-display,'Syne',sans-serif);letter-spacing:-.05em;color:#FFF3EE}
  .clock-head h3 em{font:italic 400 1.08em/1 var(--font-editorial,'Instrument Serif',serif);letter-spacing:-.02em;background:linear-gradient(90deg,#F4A9D0,#FF945A);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.08em}

  /* ---- Werkzeugleiste: alles Erklärende steckt in Dropdowns, die Uhr bleibt im Fokus ---- */
  .toolbar{position:relative;z-index:30;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.55rem;padding:.5rem;border-radius:22px;
    background:linear-gradient(145deg,rgba(255,255,255,.11),rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.15);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.24),0 24px 50px -24px rgba(0,0,0,.75);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3)}
  .tb-gap{width:1px;height:26px;background:rgba(255,255,255,.14);margin:0 .2rem}
  .has-pop{position:relative}
  .tb-btn{display:inline-flex;align-items:center;gap:.5rem;min-height:44px;padding:0 1rem;border-radius:16px;font:600 .8rem var(--font-body,'DM Sans',sans-serif);color:#F2DCEB;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);transition:background .25s,border-color .25s,transform .25s,color .25s}
  .tb-btn:hover{border-color:rgba(255,185,142,.7);color:#fff;transform:translateY(-1px)}
  .tb-btn[aria-expanded='true']{background:rgba(255,185,142,.16);border-color:rgba(255,185,142,.7)}
  .tb-btn.quiet{border-color:transparent;background:transparent;color:#D9C3DF}
  .tb-k{font-size:.56rem;letter-spacing:.16em;color:#B79BC4}
  .chev{width:7px;height:7px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:rotate(45deg) translateY(-2px);transition:transform .25s}
  [aria-expanded='true'] > .chev{transform:rotate(-135deg) translate(-2px,0)}
  .tb-btn.play{color:#1B0C2C;border-color:transparent;background:linear-gradient(135deg,#FFB98E,#F660B9);box-shadow:0 10px 26px -10px rgba(246,96,185,.8),inset 0 1px 0 rgba(255,255,255,.5);font-weight:700}
  .tb-btn.play:hover{color:#1B0C2C;transform:translateY(-2px)}
  .tb-btn.play.on{background:linear-gradient(135deg,#F660B9,#9B6BE8);color:#fff}
  .eq{display:inline-flex;align-items:flex-end;gap:2px;height:14px}.eq i{width:3px;height:5px;border-radius:2px;background:currentColor}
  .play.on .eq i{animation:eq .7s ease-in-out infinite alternate}.play.on .eq i:nth-child(2){animation-delay:-.25s}.play.on .eq i:nth-child(3){animation-delay:-.5s}
  @keyframes eq{to{height:14px}}
  .seg{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:3px;border-radius:16px;background:rgba(10,5,22,.55);border:1px solid rgba(255,255,255,.12)}
  .seg .thumb{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:13px;background:linear-gradient(135deg,#FFB98E,#F660B9);box-shadow:0 8px 22px -6px rgba(246,96,185,.7);transition:transform .45s cubic-bezier(.3,1.3,.4,1)}
  .seg[data-pos='PM'] .thumb{transform:translateX(100%)}
  .seg button{position:relative;z-index:1;display:flex;align-items:baseline;gap:.4rem;padding:.55rem 1rem;border:0;background:transparent;border-radius:13px;cursor:pointer;color:#D9C3DF;font-family:var(--font-body,'DM Sans',sans-serif)}
  .seg button strong{font:700 .85rem var(--font-display,'Syne',sans-serif)}.seg button small{font-size:.6rem;letter-spacing:.08em;opacity:.8}
  .seg button[aria-pressed='true']{color:#1B0C2C}

  .pop{position:absolute;top:calc(100% + .7rem);left:0;z-index:40;width:max-content;max-width:min(92vw,360px);padding:1rem;border-radius:20px;
    background:linear-gradient(145deg,rgba(48,28,82,.94),rgba(22,12,40,.96));border:1px solid rgba(255,255,255,.17);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 30px 70px -20px rgba(0,0,0,.85);backdrop-filter:blur(18px);animation:pop-in .28s cubic-bezier(.2,.9,.3,1) both}
  .pop-day{display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:.4rem}
  .pop-day button{min-height:40px;border-radius:12px;font:600 .78rem var(--font-body,'DM Sans',sans-serif);cursor:pointer;color:#D9C3DF;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);transition:all .2s}
  .pop-day .all{grid-column:1/-1}
  .pop-day button:hover{color:#fff;border-color:rgba(255,185,142,.7)}
  .pop-day button.chosen{color:#1B0C2C;border-color:transparent;background:linear-gradient(135deg,#FFB98E,#F660B9);font-weight:700}
  .pop-wide{width:min(92vw,360px)}
  .has-pop:nth-last-child(-n+2) .pop{left:auto;right:0}
  .fact+.fact{margin-top:.9rem;padding-top:.9rem;border-top:1px solid rgba(255,255,255,.1)}
  .label{margin:0;font:700 .58rem var(--font-body,'DM Sans',sans-serif);letter-spacing:.16em;color:#D9B4D6}
  .big{margin:.5rem 0 0;display:flex;align-items:baseline;gap:.5rem}
  .big strong{font:650 2.4rem/1 var(--font-display,'Syne',sans-serif);letter-spacing:-.06em;color:#FFF4EF;font-variant-numeric:tabular-nums}
  .big span{font:italic 400 1.3rem var(--font-editorial,'Instrument Serif',serif);color:#F4A9D0}
  .cap{margin:.5rem 0 0;font:400 .8rem/1.45 var(--font-body,'DM Sans',sans-serif);color:#B7A0C2}
  .fact.memory{padding:.9rem;border-radius:16px;border:1.5px dashed rgba(255,199,154,.45);background:linear-gradient(150deg,rgba(255,148,90,.14),rgba(246,96,185,.08))}
  .tag{display:inline-block;font:700 .54rem var(--font-body,'DM Sans',sans-serif);letter-spacing:.16em;color:#FFC79A;border:1.5px solid #FFC79A;border-radius:999px;padding:.25rem .65rem}
  .quote{margin:.7rem 0 0;font:400 1.35rem/1.2 var(--font-editorial,'Instrument Serif',serif);color:#FFE6D2}.quote em{color:#FFB98E}
  .steps{list-style:none;margin:0;padding:0;display:grid;gap:.8rem}
  .steps li{display:flex;gap:.7rem;font:400 .82rem/1.45 var(--font-body,'DM Sans',sans-serif);color:#CDB8D3}.steps strong{color:#FFE0C8;font-weight:600}
  .steps b{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;font:700 .68rem var(--font-body,'DM Sans',sans-serif);color:#1B0C2C;background:linear-gradient(135deg,#FFB98E,#F660B9)}
  .legend{display:flex;align-items:center;gap:.6rem;margin-top:1.1rem}.legend span{font:700 .54rem var(--font-body,'DM Sans',sans-serif);letter-spacing:.14em;color:#B79BC4}.legend i{flex:1;height:8px;border-radius:99px}
  .legend-note{display:flex;align-items:center;gap:.5rem;margin:.6rem 0 0;font:500 .7rem var(--font-body,'DM Sans',sans-serif);color:#B7A0C2}.legend-note i{width:12px;height:8px;border-radius:99px;background:#FF945A;box-shadow:0 0 10px #FF945A}
  .method-note{margin:.9rem 0 0;padding-top:.8rem;border-top:1px solid rgba(255,255,255,.1);font:400 .68rem/1.55 var(--font-body,'DM Sans',sans-serif);color:#9F8AB0}
  .tb-btn:focus-visible,.seg button:focus-visible,.pop button:focus-visible{outline:2px solid #FFD9B8;outline-offset:3px}

  /* ---- Uhr: groß, nur leicht geneigt ---- */
  .dial-area{display:flex;flex-direction:column;align-items:center;width:100%;margin-top:clamp(.6rem,2vh,1.4rem)}
  .dial-scene{width:min(100%,800px,calc(100svh - 130px));min-width:min(100%,360px);perspective:1800px;padding:1% 3% 0}
  .dial-tilt{transform-style:preserve-3d;transition:transform .35s cubic-bezier(.2,.8,.2,1);will-change:transform}
  .dial-wrap{position:relative;width:100%;aspect-ratio:1;transform-style:preserve-3d;border-radius:50%}
  .plate{position:absolute;inset:5.2%;border-radius:50%;transform:translateZ(-30px);
    background:radial-gradient(circle at 38% 30%,#3a1f66 0%,#1d0f38 45%,#0f0820 100%);
    box-shadow:inset 0 2px 0 rgba(255,255,255,.2),inset 0 -30px 80px rgba(246,96,185,.16),0 0 0 1px rgba(255,255,255,.12),0 0 110px rgba(246,96,185,.22)}
  .plate::after{content:'';position:absolute;inset:-2px;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 62%,rgba(255,190,140,.85) 78%,transparent 92%);
    -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));animation:sweep 14s linear infinite}
  .floor-shadow{position:absolute;left:12%;right:12%;bottom:-5%;height:10%;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.6),transparent);transform:translateZ(-80px);filter:blur(10px)}
  .glow-svg{position:absolute;inset:0;width:100%;height:100%;transform:translateZ(-14px);filter:blur(18px);opacity:.75;pointer-events:none}
  .clock-svg{position:relative;display:block;width:100%;height:100%;overflow:visible;transform:translateZ(0)}
  .callout-layer{position:absolute;inset:0;transform:translateZ(40px);pointer-events:none}
  .bar-hit{cursor:pointer;outline:none}.bar-hit:focus,.bar-hit:focus-visible{outline:none}
  .kinetic-orbit{transform-origin:450px 450px}.kinetic-orbit-a{animation:orbit 96s linear infinite}.kinetic-orbit-b{animation:orbit 125s linear infinite reverse}.kinetic-dot{transform-origin:450px 450px;animation:orbit 96s linear infinite}
  .core-eyebrow,.core-foot{font-family:var(--font-body,'DM Sans',sans-serif);font-weight:700;font-size:12px;letter-spacing:2.5px;fill:#E8B8D4}.core-hour{font-family:var(--font-display,'Syne',sans-serif);font-size:82px;font-weight:650;letter-spacing:-5px;fill:#fff6f1;font-variant-numeric:tabular-nums}.core-value{font:italic 400 41px var(--font-editorial,'Instrument Serif',Georgia,serif);fill:#FFB98E}.core-foot{font-size:10px;letter-spacing:1.3px;fill:#C9AACB}.dial-numeral{font:italic 400 32px var(--font-editorial,'Instrument Serif',Georgia,serif);fill:#F0D6E6}
  .core-track{font:italic 400 22px var(--font-editorial,'Instrument Serif',Georgia,serif);fill:#FFE0C8}.core-artist{font:600 11px var(--font-body,'DM Sans',sans-serif);letter-spacing:1.6px;fill:#C9AACB;text-transform:uppercase}
  .wv{animation:wave var(--t,2.4s) ease-in-out var(--dl,0s) infinite;animation-play-state:paused;transform-box:view-box;transition:stroke-opacity .2s ease,stroke-width .2s ease}
  .live .wv{animation-play-state:running}
  .dial-wrap::after{content:'';position:absolute;inset:-1%;border-radius:50%;border:2px solid transparent;pointer-events:none}
  .dial-wrap.locked::after{animation:dial-ring 1.2s cubic-bezier(.2,.8,.2,1)}
  .dial-hint{display:inline-flex;align-items:center;gap:.7rem;margin:.9rem 0 0;padding:.55rem 1.1rem;border-radius:999px;font:700 .6rem var(--font-body,'DM Sans',sans-serif);letter-spacing:.14em;text-transform:uppercase;color:#E8CFE6;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);text-align:center}
  .dial-hint i{flex:none;width:8px;height:8px;border-radius:50%;background:#FF945A;box-shadow:0 0 0 0 rgba(255,148,90,.7);animation:ping 1.8s ease-out infinite}
  .dial-hint.done i{animation:none;background:#F660B9}


  /* ---- Song-Karte außen an der Uhr + Mini-Player ---- */
  .dial-scene{position:relative}
  .artist-float{position:absolute;top:var(--y);left:calc(100% - 2%);display:flex;align-items:center;transform:translateY(-50%);pointer-events:auto;z-index:3;padding:34px 18px}
  .artist-float.left{left:auto;right:calc(100% - 2%);flex-direction:row-reverse}
  .af{cursor:default;margin:0;position:relative;--s:112px;--dy:0px;--rot:-2deg;z-index:calc(5 - var(--i));animation:af-in .7s cubic-bezier(.2,.9,.25,1) both;animation-delay:calc(var(--i) * .09s)}
  .af+.af{margin-left:-26px}.artist-float.left .af+.af{margin-left:0;margin-right:-26px}
  .af:nth-child(1){--s:118px;--dy:0px;--rot:-2deg}
  .af:nth-child(2){--s:98px;--dy:-26px;--rot:3deg}
  .af:nth-child(3){--s:84px;--dy:30px;--rot:-4deg}
  .pic{width:var(--s);height:var(--s);border-radius:20px;overflow:hidden;display:grid;place-items:center;transform:translateY(var(--dy)) rotate(var(--rot));
    background:linear-gradient(135deg,#6b3fa8,#F660B9 60%,#FF945A);box-shadow:0 26px 40px -18px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.14),0 0 34px -8px rgba(246,96,185,.55);animation:af-float calc(5.2s + var(--i) * .9s) ease-in-out infinite;animation-delay:calc(var(--i) * -1.4s)}
  .pinned .af:first-child .pic{box-shadow:0 26px 40px -18px rgba(0,0,0,.85),0 0 0 2px rgba(255,148,90,.85),0 0 40px -6px rgba(255,148,90,.6)}
  .pic img{width:100%;height:100%;object-fit:cover;display:block}.pic span{font:italic 400 2.4rem var(--font-editorial,'Instrument Serif',serif);color:#fff2ed}
  .af figcaption{position:absolute;left:50%;top:calc(100% + 10px);transform:translate(-50%,6px);white-space:nowrap;padding:.4rem .75rem;border-radius:999px;font:700 .68rem var(--font-body,'DM Sans',sans-serif);color:#FFF2E8;
    background:rgba(20,10,38,.82);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;text-align:center}
  .af figcaption small{display:block;margin-top:.15rem;font-weight:500;letter-spacing:.08em;color:#FFB98A}
  .af:hover{z-index:9}.af:hover .pic{filter:brightness(1.08);box-shadow:0 30px 46px -16px rgba(0,0,0,.9),0 0 0 2px rgba(255,255,255,.4),0 0 40px -6px rgba(246,96,185,.7)}
  .af:hover figcaption,.af:focus-within figcaption{opacity:1;transform:translate(-50%,0)}
  .dial-legend{margin:.7rem 0 0;max-width:520px;text-align:center;font:italic 400 1.05rem/1.35 var(--font-editorial,'Instrument Serif',serif);color:#D9BBD3}
  .dial-legend b{font-weight:400;color:#FFC79A}
  @keyframes af-in{from{opacity:0;filter:blur(10px);margin-top:26px}to{opacity:1;filter:blur(0);margin-top:0}}
  @keyframes af-float{0%,100%{transform:translateY(var(--dy)) rotate(var(--rot))}50%{transform:translateY(calc(var(--dy) - 12px)) rotate(calc(var(--rot) * -.6))}}
  @media(max-width:1300px){.artist-float,.artist-float.left{position:relative;top:auto;left:auto;right:auto;transform:none;flex-direction:row;justify-content:center;margin:1.6rem auto 0;padding:30px 0}.artist-float.left .af+.af{margin-right:0;margin-left:-26px}}
  @keyframes orbit{to{transform:rotate(360deg)}}@keyframes sweep{to{transform:rotate(360deg)}}@keyframes wave{50%{transform:scaleY(var(--lo,.84))}}
  @keyframes ping{70%{box-shadow:0 0 0 12px rgba(255,148,90,0)}100%{box-shadow:0 0 0 0 rgba(255,148,90,0)}}
  @keyframes pop-in{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes dial-ring{0%{transform:scale(.9);border-color:rgba(255,148,90,.85);box-shadow:0 0 0 0 rgba(246,96,185,.5)}100%{transform:scale(1.07);border-color:rgba(255,148,90,0);box-shadow:0 0 80px 24px rgba(246,96,185,0)}}
  @media(max-width:700px){.tb-gap{display:none}.pop{left:50%;transform:translateX(-50%);right:auto!important}.has-pop:nth-last-child(-n+2) .pop{left:50%}.tb-btn{padding:0 .8rem}}
  @media(prefers-reduced-motion:reduce){.pic,.af{animation:none!important}.kinetic-orbit,.kinetic-dot,.wv,.plate::after,.dial-hint i,.dial-wrap.locked::after,.pop,.play.on .eq i{animation:none!important}.dial-tilt,.seg .thumb,.tb-btn{transition:none!important}}
</style>
