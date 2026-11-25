<script>
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import rhythmData from '../data/rhythm_2026_preview.json';
  import MusicalFingerprint from './MusicalFingerprint.svelte';
  import PeakCallout from './fatfish/PeakCallout.svelte';
  import DataVsMemory from './fatfish/DataVsMemory.svelte';
  import { cinematicReveal } from '../motion/cinematicReveal.js';

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
  const COLORS = ['#ead2e7', '#d5a9d6', '#c284bb', '#b160a6', '#923c85'];

  let selectedDay = $state('ALL');
  let selectedPeriod = $state('PM');
  let visibleValues = $state([...profiles.ALL.hours.slice(12)]);
  let hoveredHour = $state(null);
  let pinnedHour = $state(null);
  let helpOpen = $state(false);
  let revealFinished = false;
  let stage;
  let root;
  let helpButton;
  let helpPanel = $state(null);
  let tween;

  const profile = $derived(profiles[selectedDay]);
  const offset = $derived(selectedPeriod === 'AM' ? 0 : 12);
  const selectedHours = $derived(profile.hours.slice(offset, offset + 12));
  const peakPosition = $derived(selectedHours.indexOf(Math.max(...selectedHours)));
  const activeHour = $derived(hoveredHour ?? pinnedHour ?? (offset + peakPosition));
  const activeValue = $derived(profile.hours[activeHour]);
  const hasSelection = $derived(hoveredHour !== null || pinnedHour !== null);
  const meanMinutes = $derived(profile.meanDailyMinutes);

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
  function closeHelp(focusTrigger = false) {
    helpOpen = false;
    if (focusTrigger) requestAnimationFrame(() => helpButton?.focus());
  }
  function toggleHelp() {
    helpOpen = !helpOpen;
    if (helpOpen) requestAnimationFrame(() => helpPanel?.querySelector('button')?.focus());
  }
  function handleDocumentKey(event) {
    if (event.key === 'Escape' && helpOpen) { event.preventDefault(); closeHelp(true); }
  }
  function handleOutside(event) {
    if (helpOpen && !helpPanel?.contains(event.target) && !helpButton?.contains(event.target)) closeHelp();
  }

  onMount(() => {
    document.addEventListener('keydown', handleDocumentKey);
    document.addEventListener('pointerdown', handleOutside);
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia(reducedMotionQuery).matches;
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
            lock: element.classList.contains('chapter-intro')
          });
          if (handle?.destroy) revealDisposers.push(handle.destroy);
        });
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
      context?.revert();
      revealDisposers.forEach((dispose) => dispose());
      document.removeEventListener('keydown', handleDocumentKey);
      document.removeEventListener('pointerdown', handleOutside);
    };
  });
</script>

<section id="rhythm" class="rhythm-world" bind:this={root} aria-labelledby="rhythm-title">
  <div class="rhythm-backdrop" aria-hidden="true"></div>
  <header class="chapter-intro rhythm-appear">
    <div class="chapter-index"><span>WORLD 01</span><span class="chapter-line"></span><span>LISTENING PATTERNS</span></div>
    <h2 id="rhythm-title">The rhythm <em>of my day.</em></h2>
    <p>What does my listening history reveal about an ordinary day?</p>
    <span class="chapter-scroll">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></span>
  </header>

  <div class="instrument-stage" bind:this={stage}>
    <div class="instrument-layout">
      <div class="side left-side rhythm-appear">
        <p class="section-eyebrow">THE YEAR IN FOCUS</p>
        <div class="year-label">2026<span class="year-dot" aria-hidden="true"></span></div>
        <div class="metric-group" aria-live="polite" aria-atomic="true">
          <p class="metric-eyebrow">MY DAILY MUSIC TIME</p>
          <p class="metric-value"><strong>{meanMinutes.toFixed(1)}</strong><span>min</span></p>
          <p class="metric-caption">Average recorded listening time per calendar day</p>
        </div>
        <div class="mini-rule" aria-hidden="true"></div>
        <p class="left-thought">A whole day has its own rhythm. <em>Which hours do I return to?</em></p>
      </div>

      <div class="dial-area rhythm-appear">
        <div class="dial-heading">
          <span>THE LISTENING CLOCK</span>
          <span>{selectedPeriod === 'AM' ? 'MIDNIGHT — NOON' : 'NOON — MIDNIGHT'}</span>
        </div>
        <div class="dial-wrap">
          <div class="dial-atmosphere" aria-hidden="true"></div>
          <svg class="clock-svg" viewBox="0 0 900 900" role="group"
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

            <!-- Rounded radial data bars: one solid hue each, no SVG glow filters. -->
            {#each DIAL as p}
              {@const hour = offset + p}
              {@const bar = lineFor(p, visibleValues[p])}
              {@const active = hoveredHour === hour || (hoveredHour === null && pinnedHour === hour)}
              {@const subdued = hasSelection && !active}
              {@const color = hourColor(visibleValues[p])}
              <g class="bar-set">
                <line x1={bar.inner.x} y1={bar.inner.y} x2={bar.trackEnd.x} y2={bar.trackEnd.y}
                  stroke="#ad88bc" stroke-width={BAR_WIDTH} stroke-opacity={subdued ? .055 : .12} stroke-linecap="round" pointer-events="none"/>
                {#if bar.length > 0.02}
                  <line class="hour-bar" x1={bar.inner.x} y1={bar.inner.y} x2={bar.outer.x} y2={bar.outer.y}
                    stroke={color} stroke-width={active ? BAR_WIDTH + 4 : BAR_WIDTH} stroke-opacity={subdued ? .26 : 1}
                    stroke-linecap="round" pointer-events="none"/>
                  {#if active}
                    <circle cx={bar.outer.x} cy={bar.outer.y} r="5" fill="#fff2ed" opacity=".85" pointer-events="none"/>
                  {/if}
                {/if}
                <line class="bar-hit" x1={bar.inner.x} y1={bar.inner.y} x2={bar.trackEnd.x} y2={bar.trackEnd.y}
                  stroke="transparent" stroke-width="46" stroke-linecap="round" pointer-events="stroke"
                  role="button" tabindex="0" aria-pressed={pinnedHour === hour}
                  aria-label={`${formatHour(hour)} to ${formatEnd(hour)}: ${profile.hours[hour].toFixed(1)} average listening minutes in this hour per calendar day. ${pinnedHour === hour ? 'Unpin' : 'Pin'} hour.`}
                  onpointerenter={() => { hoveredHour = hour; }}
                  onpointerleave={() => { hoveredHour = null; }}
                  onfocus={() => { hoveredHour = hour; }}
                  onblur={() => { hoveredHour = null; }}
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
          <PeakCallout
            target={lineFor(peakPosition, selectedHours[peakPosition]).outer}
            label={selectedPeriod === 'PM' ? 'Afternoon peak' : 'Morning peak'}
            value={`${formatHour(offset + peakPosition)} · ${selectedHours[peakPosition].toFixed(1)} min avg.`}
            muted={hasSelection}
          />
        </div>
        <p class="dial-hint">HOVER TO DISCOVER <span aria-hidden="true">·</span> CLICK TO HOLD A MOMENT</p>
      </div>

      <div class="side right-side rhythm-appear">
        <div class="controls-block">
          <div class="controls-top">
            <span class="section-eyebrow">FIND YOUR RHYTHM</span>
            <button bind:this={helpButton} type="button" class="help-trigger" aria-label="How to read the listening clock" aria-expanded={helpOpen} aria-controls="rhythm-info-panel" onclick={toggleHelp}>
              <span aria-hidden="true">i</span> HOW TO READ
            </button>
          </div>
          <p class="control-label">DAY OF THE WEEK</p>
          <div class="day-selector" role="group" aria-label="Select weekday">
            {#each DAYS as day}
              <button type="button" class:chosen={selectedDay === day.id} aria-pressed={selectedDay === day.id} onclick={() => select(day.id, selectedPeriod)}>{day.label}</button>
            {/each}
          </div>
          <p class="control-label period-label">TIME OF DAY</p>
          <div class="period-selector" role="group" aria-label="Select morning or afternoon">
            <button class:chosen={selectedPeriod === 'AM'} type="button" aria-pressed={selectedPeriod === 'AM'} onclick={() => select(selectedDay, 'AM')}>AM <small>00–11</small></button>
            <button class:chosen={selectedPeriod === 'PM'} type="button" aria-pressed={selectedPeriod === 'PM'} onclick={() => select(selectedDay, 'PM')}>PM <small>12–23</small></button>
          </div>
          <p class="controls-instruction">One position, one hour. The bars change with your selection.</p>
        </div>
      </div>
    </div>

    {#if helpOpen}
      <div bind:this={helpPanel} id="rhythm-info-panel" class="info-panel" role="region" aria-label="How to read the clock">
        <div class="info-panel-heading"><h3>How to read the rhythm</h3><button type="button" onclick={() => closeHelp(true)} aria-label="Close explanation">×</button></div>
        <p>Each rounded bar shows one hour of the selected half-day. <strong>Longer means more music.</strong> Its colour moves from pale lilac to deeper berry as the average listening minutes increase.</p>
        <p>The dial uses familiar 12 / 3 / 6 / 9 positions. Switch <strong>AM / PM</strong> to explore all 24 local hours; choose a weekday to compare patterns.</p>
        <p>Hover, focus or pin a bar to see that hour's exact average. The data describes recorded listening, not the reason you listened.</p>
        <p class="method-note">Method: lengths use a linear scale shared by all day/period views. Values are averages per calendar day for the selected weekday or full 2026 period, with durations split across clock-hour boundaries. Spotify Extended Streaming History, {rhythmData.period}, Europe/Berlin. The current music-only filtering is still under review.</p>
        <div class="mini-legend" aria-label="Colour legend"><span>LESS</span><i style={`background:${COLORS[0]}`}></i><i style={`background:${COLORS[2]}`}></i><i style={`background:${COLORS[4]}`}></i><span>MORE</span></div>
      </div>
    {/if}
  </div>

  <!-- Discovery 02 / continuous World 01 journey -->
  <MusicalFingerprint />

  <DataVsMemory />
</section>

<style>
  .rhythm-world{position:relative;isolation:isolate;overflow:clip;color:#f5e9f7;background:#090511}
  .rhythm-backdrop{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 51% 56%,rgba(70,28,91,.36),transparent 43%),radial-gradient(ellipse at 8% 85%,rgba(99,39,113,.16),transparent 35%)}
  .chapter-intro{position:relative;min-height:58svh;padding:clamp(7rem,12vh,10rem) 1.5rem 3.3rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .chapter-index,.section-eyebrow,.metric-eyebrow,.reflection-label,.control-label,.dial-heading,.dial-hint,.chapter-scroll{font-family:var(--font-body,'DM Sans',sans-serif);font-size:.65rem;font-weight:700;letter-spacing:.19em}
  .chapter-index{color:#e8aeca;display:flex;align-items:center;gap:1.1rem;margin-bottom:1.6rem}.chapter-line{display:block;width:34px;height:1px;background:#ba82b8;opacity:.6}
  .chapter-intro h2{font-family:var(--font-display,'Syne',sans-serif);font-size:clamp(3.2rem,7vw,7rem);font-weight:650;letter-spacing:-.075em;line-height:1.01;max-width:1200px;margin:0;color:#fbf0f8}
  .chapter-intro h2 em{font:italic 400 1.12em/1 var(--font-editorial,'Instrument Serif',Georgia,serif);color:#efabd2;letter-spacing:-.025em}
  .chapter-intro>p{font:400 clamp(1.15rem,1.65vw,1.7rem)/1.4 var(--font-editorial,'Instrument Serif',Georgia,serif);color:#d7bdd6;margin:1.9rem 0 0}
  .chapter-scroll{color:#b394bd;font-size:.59rem;margin-top:3rem}.chapter-scroll span{padding-left:.6rem;color:#edbad8}
  .instrument-stage{position:relative;z-index:1;min-height:100svh;display:grid;align-items:center;padding:clamp(5.8rem,9vh,7rem) clamp(1rem,4vw,5rem) 3rem}
  .instrument-layout{width:min(100%,1510px);margin:0 auto;display:grid;grid-template-columns:minmax(190px,1fr) minmax(440px,min(72svh,690px)) minmax(205px,1fr);align-items:center;column-gap:clamp(.6rem,2.2vw,3rem)}
  .side{min-width:0}.left-side{display:flex;flex-direction:column;align-items:flex-start;gap:0}.section-eyebrow{color:#d7a0c5}
  .year-label{margin-top:.65rem;font:500 clamp(2.8rem,4.6vw,5rem)/1 var(--font-display,'Syne',sans-serif);letter-spacing:-.075em;color:#f7eaf5}.year-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#e5a0c5;margin-left:.45rem;vertical-align:baseline}
  .metric-group{margin-top:3rem}.metric-eyebrow{color:#c995c0;letter-spacing:.11em}.metric-value{display:flex;align-items:baseline;gap:.55rem;margin:.4rem 0 .55rem}.metric-value strong{font:600 clamp(2.8rem,4.8vw,5.3rem)/1 var(--font-display,'Syne',sans-serif);letter-spacing:-.07em;font-variant-numeric:tabular-nums;color:#fff1f8}.metric-value span{font:italic 400 clamp(1.4rem,1.8vw,2rem) var(--font-editorial,'Instrument Serif',Georgia,serif);color:#d4a5c8}.metric-caption{max-width:21ch;font:400 .9rem/1.65 var(--font-body,'DM Sans',sans-serif);color:#bfa9c9;margin:0}
  .mini-rule{width:66px;height:1px;background:#db9dbe55;margin:2.3rem 0 1.2rem}.left-thought{font:400 clamp(1.25rem,1.7vw,1.7rem)/1.37 var(--font-editorial,'Instrument Serif',Georgia,serif);color:#bfa9cb;max-width:15ch;margin:0}.left-thought em{font-weight:400;color:#e6b3d1}
  .dial-area{position:relative;min-width:0;display:flex;flex-direction:column;align-items:center}.dial-heading{display:flex;gap:1rem;justify-content:space-between;width:min(100%,540px);color:#b99bbf;font-size:.55rem;margin-bottom:.25rem}.dial-heading span:last-child{color:#e0b6d0}
  .dial-wrap{position:relative;width:100%;max-width:690px;aspect-ratio:1}.dial-atmosphere{position:absolute;inset:15%;background:radial-gradient(circle,rgba(119,54,144,.23),rgba(80,23,100,.06) 57%,transparent 75%);border-radius:50%;filter:blur(26px);animation:halo-breathe 8s ease-in-out infinite;pointer-events:none}
  .clock-svg{position:relative;display:block;width:100%;height:100%;overflow:visible}.hour-bar{transition:stroke-opacity .2s ease,stroke-width .2s ease}.bar-hit{cursor:pointer}.bar-hit:focus-visible{stroke:#aee8f5;stroke-opacity:.35;outline:none}.kinetic-orbit{transform-origin:450px 450px}.kinetic-orbit-a{animation:orbit 96s linear infinite}.kinetic-orbit-b{animation:orbit 125s linear infinite reverse}.kinetic-dot{transform-origin:450px 450px;animation:orbit 96s linear infinite}
  .core-eyebrow,.core-foot{font-family:var(--font-body,'DM Sans',sans-serif);font-weight:700;font-size:12px;letter-spacing:2.5px;fill:#d9aacc}.core-hour{font-family:var(--font-display,'Syne',sans-serif);font-size:82px;font-weight:650;letter-spacing:-5px;fill:#fff1f8;font-variant-numeric:tabular-nums}.core-value{font:italic 400 41px var(--font-editorial,'Instrument Serif',Georgia,serif);fill:#efadd0}.core-foot{font-size:10px;letter-spacing:1.3px;fill:#b99ebe}.dial-numeral{font:italic 400 32px var(--font-editorial,'Instrument Serif',Georgia,serif);fill:#ead2e3}
  .dial-hint{color:#a68daf;margin:.2rem 0 0;font-size:.56rem;text-align:center}.dial-hint span{padding:0 .45em}
  .right-side{display:flex;align-items:flex-start;justify-content:center}.controls-block{width:100%;max-width:265px}.controls-top{display:flex;align-items:center;justify-content:space-between;gap:.65rem}.control-label{color:#ae94bc;font-size:.57rem;margin:2rem 0 .75rem;letter-spacing:.14em}.day-selector{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.35rem}.day-selector button,.period-selector button{font:600 .72rem var(--font-body,'DM Sans',sans-serif);color:#c9b4d1;border:1px solid #edc2de20;background:#aa83b315;border-radius:999px;min-height:40px;padding:.55rem .48rem;cursor:pointer;transition:background .23s,border-color .23s,color .23s,transform .23s}.day-selector button:hover,.period-selector button:hover{color:#fff6fb;border-color:#e5afd269;transform:translateY(-2px)}.day-selector button.chosen,.period-selector button.chosen{background:#edb2d3;color:#200c25;border-color:#edb2d3}.period-label{margin-top:1.55rem}.period-selector{display:grid;grid-template-columns:1fr 1fr;gap:.4rem}.period-selector button small{display:block;font-weight:500;font-size:.61rem;letter-spacing:.04em;margin-top:.2rem}.controls-instruction{font:400 .8rem/1.6 var(--font-body,'DM Sans',sans-serif);color:#9f86af;max-width:25ch;margin:1.4rem 0 0}
  .help-trigger{display:flex;align-items:center;gap:.3rem;padding:.45rem .65rem;border:1px solid #edb5d55c;background:#230f32;border-radius:999px;font:700 .52rem/1.2 var(--font-body,'DM Sans',sans-serif);color:#ecd0e1;letter-spacing:.08em;cursor:pointer;white-space:nowrap}.help-trigger span{display:grid;place-items:center;width:19px;height:19px;border:1px solid #d7a2c5;border-radius:50%;font:italic 400 13px var(--font-editorial,'Instrument Serif',Georgia,serif)}.help-trigger:hover{background:#42204f}.day-selector button:focus-visible,.period-selector button:focus-visible,.help-trigger:focus-visible,.info-panel button:focus-visible{outline:2px solid #a7dfeb;outline-offset:3px}
  .info-panel{position:absolute;z-index:20;right:clamp(1rem,5vw,5rem);top:16%;width:min(390px,calc(100vw - 2rem));padding:1.6rem;border:1px solid #dfafd654;background:rgba(22,10,35,.97);box-shadow:0 20px 70px #0009;border-radius:20px;backdrop-filter:blur(18px);animation:card-arrive .3s ease-out both}.info-panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.info-panel-heading h3{margin:0 0 .9rem;font:italic 400 2rem var(--font-editorial,'Instrument Serif',Georgia,serif);color:#f6d0e6}.info-panel-heading button{background:transparent;border:1px solid #ddaacb66;border-radius:100%;color:#f8e9f5;width:32px;height:32px;font-size:1.25rem;cursor:pointer}.info-panel p{color:#d4bfd7;font:.85rem/1.6 var(--font-body,'DM Sans',sans-serif);margin:.6rem 0}.info-panel p strong{color:#f2cde5}.info-panel .method-note{font-size:.72rem;border-top:1px solid #f2cde526;padding-top:.85rem;color:#a993b8}.mini-legend{display:flex;align-items:center;gap:.5rem;margin-top:1.25rem}.mini-legend span{font:700 .58rem var(--font-body,'DM Sans',sans-serif);letter-spacing:.12em;color:#a98cb5}.mini-legend i{display:block;width:22px;height:8px;border-radius:10px}
  .reflection{position:relative;min-height:39svh;padding:clamp(5rem,10vh,8rem) clamp(2rem,7vw,8rem);display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(2rem,5vw,7rem);border-top:1px solid #e2bcd21c}.reflection-label{color:#d8a6c9}.memory-copy blockquote{margin:1.4rem 0 0;max-width:20ch;font:italic 400 clamp(2.2rem,3.8vw,4.3rem)/1.05 var(--font-editorial,'Instrument Serif',Georgia,serif);color:#f2cde7}.memory-context p{font:400 clamp(1.3rem,2vw,2rem)/1.45 var(--font-editorial,'Instrument Serif',Georgia,serif);color:#d9bed7}.memory-context small{display:block;max-width:53ch;margin-top:1.3rem;font:.77rem/1.65 var(--font-body,'DM Sans',sans-serif);color:#a58da9}.memory-context small em{color:#e5bbd6}
  @keyframes orbit{to{transform:rotate(360deg)}}@keyframes halo-breathe{50%{opacity:.7;transform:scale(1.05)}}@keyframes card-arrive{from{opacity:0;transform:translateY(-7px)}to{opacity:1;transform:translateY(0)}}
  @media(max-width:1150px){.instrument-layout{grid-template-columns:1fr minmax(390px, min(65svh,600px)) 1fr;gap:.65rem}.metric-value strong{font-size:3rem}.controls-block{max-width:235px}.left-thought{font-size:1.25rem}}
  @media(max-width:930px){.instrument-layout{grid-template-columns:1fr 1fr;gap:1rem}.dial-area{grid-column:1 / -1;grid-row:1;width:min(100%,min(68svh,680px));justify-self:center}.left-side{grid-column:1;grid-row:2}.right-side{grid-column:2;grid-row:2}.instrument-stage{padding-top:5.8rem}.controls-block{max-width:360px}.metric-group{margin-top:1rem}.year-label{font-size:3rem}.mini-rule,.left-thought{display:none}}
  @media(max-width:620px){.chapter-intro{min-height:58svh;padding-top:6.5rem}.chapter-intro h2{font-size:clamp(3.2rem,12vw,5.5rem)}.instrument-stage{min-height:0;padding:5.3rem 1rem 3rem}.instrument-layout{display:flex;flex-direction:column;align-items:stretch;gap:.9rem}.left-side{flex-direction:row;justify-content:space-between;align-items:center;gap:1rem}.left-side .section-eyebrow{font-size:.55rem}.year-label{font-size:1.8rem;margin:.3rem 0 0}.metric-group{margin:0}.metric-eyebrow{font-size:.5rem}.metric-value{margin:.2rem 0}.metric-value strong{font-size:2rem}.metric-caption{font-size:.7rem;max-width:22ch}.dial-area{order:2;width:100%}.right-side{order:1;justify-content:stretch}.controls-block{max-width:none}.controls-top{margin-bottom:.2rem}.control-label{margin:.7rem 0 .3rem}.day-selector{grid-template-columns:repeat(8,minmax(0,1fr))}.day-selector button{min-height:37px;font-size:.65rem;padding:.4rem 0}.period-selector{max-width:240px}.period-selector button{min-height:38px}.controls-instruction{display:none}.dial-heading{font-size:.5rem}.dial-wrap{width:min(100%,540px);margin:auto}.dial-hint{font-size:.49rem}.info-panel{top:33%;right:1rem}.reflection{grid-template-columns:1fr;padding:4rem 1.3rem}.memory-copy blockquote{font-size:2.7rem}}
  @media(prefers-reduced-motion:reduce){.kinetic-orbit,.kinetic-dot,.dial-atmosphere,.info-panel{animation:none!important}.hour-bar,.day-selector button,.period-selector button{transition:none!important}}
</style>
