<script>
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { line, curveCatmullRomClosed } from 'd3';
  import rhythmData from '../data/rhythm_2026_preview.json';

  // WORLD 01 / DISCOVERY 02 — same verified structure as the listening clock.
  // This is an exploratory visual encoding, not a reconstruction of audio.
  const DAY_CHOICES = [
    { id: 'ALL', label: 'All days' },
    { id: 'MON', label: 'Mon' }, { id: 'TUE', label: 'Tue' },
    { id: 'WED', label: 'Wed' }, { id: 'THU', label: 'Thu' },
    { id: 'FRI', label: 'Fri' }, { id: 'SAT', label: 'Sat' },
    { id: 'SUN', label: 'Sun' }
  ];
  const PROFILES = Object.fromEntries(rhythmData.profiles.map((profile) => [profile.id, profile]));
  const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
  const MAX_HOUR = Math.max(1, ...rhythmData.profiles.flatMap((profile) => profile.hours));
  const PALETTE = ['#E4CDE2', '#D6A4D4', '#BE77BE', '#9A4D9F', '#7D347F'];

  let root;
  let scene;
  let selectedDay = $state('MON');
  let focusedHour = $state(null);
  let pinnedHour = $state(null);
  let progress = $state(0);
  let illustratedHours = $state([...PROFILES.MON.hours]);
  let currentTween;
  let scrollTrigger;
  let reducedMotion = false;

  const activeProfile = $derived(PROFILES[selectedDay]);
  const viewHours = $derived(illustratedHours);
  const mostActiveHour = $derived(activeProfile.hours.indexOf(Math.max(...activeProfile.hours)));
  const activeHour = $derived(focusedHour ?? pinnedHour ?? mostActiveHour);
  const activeMinutes = $derived(activeProfile.hours[activeHour]);
  const delta = $derived(activeProfile.meanDailyMinutes - PROFILES.ALL.meanDailyMinutes);
  const shownHour = (hour) => `${String(hour).padStart(2, '0')}:00`;
  const endingHour = (hour) => `${String((hour + 1) % 24).padStart(2, '0')}:00`;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  function colorFor(value) {
    const i = clamp(value / MAX_HOUR) * (PALETTE.length - 1);
    const low = Math.floor(i);
    const high = Math.min(low + 1, PALETTE.length - 1);
    const fraction = i - low;
    const one = PALETTE[low].replace('#', '');
    const two = PALETTE[high].replace('#', '');
    const channels = [0, 2, 4].map((n) => {
      const a = parseInt(one.slice(n, n + 2), 16);
      const b = parseInt(two.slice(n, n + 2), 16);
      return Math.round(lerp(a, b, fraction)).toString(16).padStart(2, '0');
    });
    return `#${channels.join('')}`;
  }

  function point(hour, value, side, morph) {
    // One continuous 24-hour ring transforms into a horizontal symmetric sound ribbon.
    // Day and time remain fixed; only the geometry is choreographed by scroll.
    const angle = -Math.PI / 2 + (hour / 24) * Math.PI * 2;
    const ratio = clamp(value / MAX_HOUR);
    const radius = side === 'outer' ? 156 + ratio * 65 : 128 - ratio * 12;
    const ringX = 600 + Math.cos(angle) * radius;
    const ringY = 322 + Math.sin(angle) * radius;
    const waveX = 100 + (hour / 23) * 1000;
    const amplitude = 7 + ratio * 128;
    const waveY = 322 + (side === 'outer' ? -1 : 1) * amplitude;
    return [lerp(ringX, waveX, morph), lerp(ringY, waveY, morph)];
  }

  function waveform(hours, morph) {
    const t = smooth(clamp(morph));
    const contour = HOURS.map((hour) => point(hour, hours[hour] || 0, 'outer', t));
    contour.push(...[...HOURS].reverse().map((hour) => point(hour, hours[hour] || 0, 'inner', t)));
    return line().curve(curveCatmullRomClosed.alpha(0.5))(contour) || '';
  }

  function axisX(hour) { return 100 + (hour / 23) * 1000; }
  function amplitudeFor(hour) { return 7 + clamp((viewHours[hour] || 0) / MAX_HOUR) * 128; }
  const actualShape = $derived(waveform(viewHours, progress));
  const referenceShape = $derived(waveform(PROFILES.ALL.hours, 1));

  function chooseDay(id) {
    if (!PROFILES[id] || id === selectedDay) return;
    selectedDay = id;
    pinnedHour = null;
    focusedHour = null;
    currentTween?.kill();
    const target = PROFILES[id].hours;
    if (reducedMotion) {
      illustratedHours = [...target];
      return;
    }
    const state = { values: [...illustratedHours] };
    // GSAP tween values are numeric fields to keep intermediate chart values smooth.
    const current = Object.fromEntries(HOURS.map((h) => [`h${h}`, state.values[h]]));
    const destination = Object.fromEntries(HOURS.map((h) => [`h${h}`, target[h]]));
    currentTween = gsap.to(current, {
      ...destination, duration: 1.15, ease: 'power3.inOut',
      onUpdate: () => { illustratedHours = HOURS.map((h) => current[`h${h}`]); }
    });
  }

  function pin(hour) {
    pinnedHour = pinnedHour === hour ? null : hour;
    focusedHour = null;
  }

  onMount(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.registerPlugin(ScrollTrigger);
    if (reducedMotion) {
      progress = 1;
    } else {
      scrollTrigger = ScrollTrigger.create({
        trigger: scene,
        start: 'top 85%',
        end: 'top 12%',
        scrub: 0.75,
        onUpdate: (self) => { progress = clamp(self.progress); }
      });
    }
    return () => { currentTween?.kill(); scrollTrigger?.kill(); };
  });
</script>

<section id="musical-fingerprint" class="fingerprint-world" bind:this={root} aria-labelledby="fingerprint-title">
  <div class="fingerprint-atmosphere" aria-hidden="true"></div>
  <div class="fingerprint-heading">
    <div class="fingerprint-index"><span>WORLD 01</span><span class="index-rule"></span><span>DISCOVERY 02 / MY MUSICAL FINGERPRINT</span></div>
    <h3 id="fingerprint-title">Every day leaves <em>a signature.</em></h3>
    <p>The listening clock opens into a different view of the same 24 hours. Which weekdays sound alike — and which don’t?</p>
  </div>

  <div class="fingerprint-scene" bind:this={scene}>
    <div class="fingerprint-stage">
      <div class="scene-top">
        <div class="scene-wordmark"><span class="small-dot" aria-hidden="true"></span>24 HOURS / 2026</div>
        <div class="scene-help">{progress < .8 ? 'SCROLL TO UNFOLD THE DAY' : 'SELECT A DAY · EXPLORE THE HOURS'}</div>
      </div>

      <div class="wave-presentation">
        <div class="ambient-ring" aria-hidden="true" style={`opacity:${(1-progress)*.3}`}></div>
        <svg class="wave-svg" viewBox="0 0 1200 650" role="group" aria-label="Interactive 24-hour listening fingerprint. The shape encodes average music minutes within each local clock hour for the selected day. The curve is interpolated for presentation, while exact values are available on focus or click.">
          <defs>
            <linearGradient id="fingerprint-surface" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#E9B0D5" stop-opacity=".5" />
              <stop offset=".48" stop-color="#C182C3" stop-opacity=".19" />
              <stop offset="1" stop-color="#774783" stop-opacity=".27" />
            </linearGradient>
          </defs>

          {#if progress > 0.72}
            <g class="wave-grid" opacity={clamp((progress - .72) / .24)} aria-hidden="true">
              <line x1="100" y1="322" x2="1100" y2="322" stroke="#F3C7DE" stroke-opacity=".18" />
              {#each [0, 3, 6, 9, 12, 15, 18, 21, 23] as hour}
                <line x1={axisX(hour)} y1="155" x2={axisX(hour)} y2="490" stroke="#F3C7DE" stroke-opacity={hour % 6 === 0 ? .17 : .08} stroke-dasharray="2 8" />
                <text x={axisX(hour)} y="531" text-anchor="middle" class="hour-label">{shownHour(hour)}</text>
              {/each}
            </g>
          {/if}

          {#if selectedDay !== 'ALL' && progress > .84}
            <path d={referenceShape} fill="none" stroke="#B9A0C4" stroke-width="1.8" stroke-opacity={clamp((progress-.84)/.12)*.4} stroke-dasharray="4 10" />
          {/if}
          <path class="fingerprint-fill" d={actualShape} fill="url(#fingerprint-surface)" stroke="none" />
          <path class="fingerprint-edge" d={actualShape} fill="none" stroke="#F5C8E3" stroke-opacity=".75" stroke-width="2.3" />

          {#if progress > .9}
            <g opacity={clamp((progress-.9)/.1)}>
              {#each HOURS as hour}
                {@const x = axisX(hour)}
                {@const y = 322 - amplitudeFor(hour)}
                {@const chosen = (focusedHour ?? pinnedHour ?? mostActiveHour) === hour}
                {#if chosen}
                  <line x1={x} y1={y} x2={x} y2="322" stroke={colorFor(activeProfile.hours[hour])} stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="2 5" />
                  <circle cx={x} cy={y} r="7.5" fill="#16091D" stroke="#F9D5E8" stroke-width="2.5" />
                  <circle cx={x} cy={y} r="3" fill="#F4BEDB" />
                {/if}
                <rect x={x-19} y="140" width="38" height="365" fill="transparent" role="button" tabindex="0"
                  aria-pressed={pinnedHour === hour}
                  aria-label={`${shownHour(hour)} to ${endingHour(hour)}: ${activeProfile.hours[hour].toFixed(1)} average listening minutes. ${pinnedHour === hour ? 'Unpin' : 'Pin'} this hour.`}
                  onpointerenter={() => { focusedHour = hour; }}
                  onpointerleave={() => { focusedHour = null; }}
                  onfocus={() => { focusedHour = hour; }}
                  onblur={() => { focusedHour = null; }}
                  onclick={() => pin(hour)}
                  onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pin(hour); } }}
                >
                  <title>{shownHour(hour)} — {activeProfile.hours[hour].toFixed(1)} minutes</title>
                </rect>
              {/each}
            </g>
          {/if}
        </svg>
      </div>

      <div class="scene-bottom">
        <div class="day-controls" role="group" aria-label="Compare 2026 weekday fingerprints">
          {#each DAY_CHOICES as day}
            <button type="button" class:chosen={selectedDay === day.id} aria-pressed={selectedDay === day.id} onclick={() => chooseDay(day.id)}>{day.label}</button>
          {/each}
        </div>
        <div class="readout" aria-live="polite" aria-atomic="true">
          <span class="readout-label">{focusedHour !== null || pinnedHour !== null ? 'HOUR IN FOCUS' : 'MOST ACTIVE HOUR'}</span>
          <strong>{shownHour(activeHour)}</strong>
          <em>{activeMinutes.toFixed(1)} min</em>
          <span class="readout-detail">average within this hour</span>
        </div>
      </div>
      <div class="scene-footnote">
        <span>DAY AVERAGE <strong>{activeProfile.meanDailyMinutes.toFixed(1)} MIN</strong></span>
        {#if selectedDay !== 'ALL'}
          <span class="delta">{Math.abs(delta) < .05 ? 'Similar to all-day average' : `${Math.abs(delta).toFixed(1)} min ${delta > 0 ? 'above' : 'below'} the overall daily average`}</span>
        {/if}
        <span class="source">2026 · LOCAL TIME / EUROPE–BERLIN</span>
      </div>
    </div>
  </div>
  <div class="fingerprint-exit">
    <p class="exit-kicker">WHAT THE DATA KNOWS</p>
    <p class="exit-thought">One day is never <em>quite like another.</em></p>
    <p class="exit-copy">These shapes come from recorded listening time, not audio recordings. They reveal when music appeared — but not why.</p>
    <span class="exit-mark" aria-hidden="true"></span>
  </div>
</section>

<style>
  .fingerprint-world{position:relative;isolation:isolate;overflow:clip;background:#090511;color:#f7eafa}
  .fingerprint-atmosphere{pointer-events:none;position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 56% 38%,#4e1a6544 0,transparent 39%),radial-gradient(ellipse at 13% 80%,#773e6b22 0,transparent 42%)}
  .fingerprint-heading{position:relative;text-align:center;padding:clamp(6.5rem,12vh,10rem) 1.5rem clamp(2.8rem,5vh,4.5rem);margin:auto;max-width:1200px}
  .fingerprint-index,.scene-wordmark,.scene-help,.readout-label,.readout-detail,.scene-footnote,.exit-kicker{font:700 .62rem/1.5 var(--font-body,'DM Sans',sans-serif);letter-spacing:.17em}
  .fingerprint-index{display:flex;justify-content:center;align-items:center;gap:1rem;color:#d6a5c8}.index-rule{width:38px;height:1px;background:#d6a5c8;opacity:.5}
  .fingerprint-heading h3{font:600 clamp(2.7rem,6.5vw,7rem)/.99 var(--font-display,'Syne',sans-serif);letter-spacing:-.075em;margin:1.5rem 0 1.25rem}
  .fingerprint-heading h3 em{font:italic 400 1.15em/.9 var(--font-editorial,'Instrument Serif',Georgia,serif);color:#e9a9cf;white-space:nowrap}
  .fingerprint-heading>p{font:400 clamp(1.15rem,1.6vw,1.65rem)/1.45 var(--font-editorial,'Instrument Serif',Georgia,serif);color:#cbb8d2;margin:0 auto;max-width:46ch}
  .fingerprint-scene{position:relative;height:155svh}
  .fingerprint-stage{position:sticky;top:0;height:100svh;min-height:520px;display:flex;flex-direction:column;justify-content:space-between;max-width:1520px;margin:0 auto;padding:clamp(5rem,9vh,7rem) clamp(1.1rem,5vw,5rem) 2.2rem}
  .scene-top{display:flex;justify-content:space-between;gap:1rem;align-items:center}.scene-wordmark{color:#f0aecf}.small-dot{width:6px;height:6px;border-radius:50%;display:inline-block;background:#f4bfdc;margin-right:.8rem;box-shadow:0 0 12px #ed8dce88}.scene-help{color:#a78cb5;text-align:right;font-size:.55rem}
  .wave-presentation{position:relative;min-height:0;flex:1;display:flex;align-items:center;justify-content:center}.wave-svg{width:100%;max-width:1300px;height:min(57svh,610px);min-height:300px;overflow:visible;display:block}.ambient-ring{position:absolute;width:min(38vw,420px);aspect-ratio:1;border:1px solid #e9b3d51c;border-radius:50%;box-shadow:0 0 100px 15px #bf75be11;pointer-events:none;top:50%;left:50%;transform:translate(-50%,-50%)}
  .fingerprint-fill{filter:drop-shadow(0 12px 35px #f1a4d01e)}.hour-label{font:700 15px var(--font-body,'DM Sans',sans-serif);fill:#bda4c3;letter-spacing:1px}.wave-svg rect[role=button]{cursor:crosshair}.wave-svg rect[role=button]:focus-visible{stroke:#a2e7fa;stroke-width:2;outline:none}
  .scene-bottom{display:flex;gap:2rem;align-items:end;justify-content:space-between;margin-top:-.5rem}.day-controls{display:flex;flex-wrap:wrap;gap:.4rem;max-width:75%}.day-controls button{font:600 .78rem var(--font-body,'DM Sans',sans-serif);background:#c59ab41e;border:1px solid #d2afc52b;border-radius:999px;color:#ddc7e0;padding:.77rem 1rem;min-width:3.8rem;cursor:pointer;transition:background .22s,border-color .22s,color .22s}.day-controls button.chosen{background:#edb4d5;color:#210e27;border-color:#edb4d5}.day-controls button:hover{border-color:#ebb6dc8f;color:#fff9fc}.day-controls button.chosen:hover{color:#210e27}.day-controls button:focus-visible{outline:2px solid #b7e3ef;outline-offset:3px}
  .readout{display:grid;grid-template-columns:auto auto;column-gap:.5rem;align-items:baseline;text-align:right;justify-content:end;white-space:nowrap}.readout-label,.readout-detail{grid-column:1/-1;color:#ad8fb6}.readout strong{font:650 clamp(1.6rem,3.8vw,3rem) var(--font-display,'Syne',sans-serif);letter-spacing:-.065em;color:#fff0f8;font-variant-numeric:tabular-nums}.readout em{font:italic 400 clamp(1.25rem,2.3vw,2.1rem) var(--font-editorial,'Instrument Serif',Georgia,serif);color:#e6a7ce}.readout-detail{font-size:.51rem;letter-spacing:.09em}
  .scene-footnote{display:flex;gap:1rem;justify-content:space-between;align-items:center;padding-top:1.1rem;margin-top:1.1rem;border-top:1px solid #edc7e01b;color:#ae94b9;font-size:.58rem}.scene-footnote strong{color:#f1c6df;font-size:.75rem}.scene-footnote .delta{color:#d6acce;letter-spacing:.035em;font-weight:500}.scene-footnote .source{white-space:nowrap}
  .fingerprint-exit{min-height:50svh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:4rem 1.3rem 6rem;border-top:1px solid #efc8e015}.exit-kicker{color:#efa9cd}.exit-thought{font:600 clamp(2.4rem,5.7vw,5.8rem)/1 var(--font-display,'Syne',sans-serif);letter-spacing:-.06em;max-width:1200px;margin:1.25rem 0}.exit-thought em{font:italic 400 1.08em var(--font-editorial,'Instrument Serif',Georgia,serif);color:#eab2d5}.exit-copy{font:400 clamp(.85rem,1.2vw,1.1rem)/1.7 var(--font-body,'DM Sans',sans-serif);color:#b6a2bf;max-width:48ch}.exit-mark{width:90px;height:1px;background:linear-gradient(90deg,transparent,#de9fca,transparent);margin-top:2.5rem}
  @media(max-width:800px){.fingerprint-heading h3 em{white-space:normal}.fingerprint-stage{padding:5.2rem 1.1rem 1.4rem}.scene-bottom{gap:1rem;align-items:start}.day-controls{max-width:65%}.scene-footnote{flex-wrap:wrap}.scene-help{max-width:27ch}.wave-svg{min-height:250px}}
  @media(max-width:600px){.fingerprint-heading{padding-top:5rem}.fingerprint-scene{height:auto}.fingerprint-stage{position:relative;height:auto;min-height:660px;padding-top:3rem;gap:1.25rem}.wave-presentation{min-height:280px;flex:0 0 auto}.wave-svg{width:100%;height:auto;min-height:0}.scene-bottom{display:flex;flex-direction:column-reverse;align-items:stretch;margin-top:0}.day-controls{max-width:100%;justify-content:center}.day-controls button{padding:.62rem .7rem;min-width:auto}.readout{justify-content:center;text-align:center}.scene-footnote{justify-content:center;text-align:center;font-size:.52rem}.scene-help{font-size:.48rem}.fingerprint-exit{min-height:39svh}}
  @media(prefers-reduced-motion:reduce){.day-controls button{transition:none}.fingerprint-fill{filter:none}}
</style>
