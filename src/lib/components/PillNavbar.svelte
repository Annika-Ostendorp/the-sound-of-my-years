<script>
  import { onMount, tick } from 'svelte';
  import { CHAPTERS, navigateToChapter } from '../navigation/chapters.js';
  import { scrollState, startScrollState } from '../motion/scrollState.js';

  let drawerOpen = $state(false);
  let activeChapter = $state('capsule');
  let reducedMotion = $state(false);
  let compact = $state(false); // Mini-Pille: weicht beim Runterscrollen zurück, kommt beim Hochscrollen/Hover wieder
  const currentChapter = $derived(CHAPTERS.find((c) => c.id === activeChapter) ?? CHAPTERS[0]);
  let selectedInfo = $state(null);
  let drawer;
  let closeButton;
  let exploreButton;
  let priorOverflow = '';


  function showChapter(chapter) {
    if (chapter.status === 'planned') {
      selectedInfo = chapter;
      return;
    }
    selectedInfo = null;
    if (navigateToChapter(chapter, reducedMotion)) closeDrawer();
    else selectedInfo = { ...chapter, title: 'This chapter is not mounted yet.', status: 'planned' };
  }

  async function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    selectedInfo = null;
    priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    await tick();
    closeButton?.focus();
  }

  async function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    document.body.style.overflow = priorOverflow;
    await tick();
    exploreButton?.focus();
  }

  function handleKeyDown(event) {
    if (!drawerOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab' || !drawer) return;
    const interactive = Array.from(drawer.querySelectorAll('button:not([disabled]), a[href]'));
    if (!interactive.length) return;
    const first = interactive[0];
    const last = interactive[interactive.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    const stopScroll = startScrollState();
    const unsubscribeScroll = scrollState.subscribe((current) => {
      activeChapter = current.activeChapter;
      // Nur ganz oben (Startseite) ist die volle Pille zu sehen. Danach bleibt sie klein, auch beim Hochscrollen,
      // und wird erst beim Drüberfahren groß (Punkte = die Welten, mit Namen beim Hover).
      if (current.scrollY > 420) compact = true;
      else if (current.scrollY < 160) compact = false;
      reducedMotion = current.reducedMotion;
    });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      stopScroll();
      unsubscribeScroll();
      document.removeEventListener('keydown', handleKeyDown);
      if (drawerOpen) document.body.style.overflow = priorOverflow;
    };
  });
</script>

<nav class="pill-nav" class:compact aria-label="Main journey navigation">
  <button class="brand" type="button" onclick={() => showChapter(CHAPTERS[0])} aria-label="The Sound of My Years – back to the time capsule">
    <svg class="memory-signal" viewBox="0 0 54 30" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tsmy-pill-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#80dae9"/><stop offset=".38" stop-color="#aa8be5"/>
          <stop offset=".73" stop-color="#f083c5"/><stop offset="1" stop-color="#ffad88"/>
        </linearGradient>
      </defs>
      <path d="M2 15h7c3 0 3-8 7-8s4 16 8 16 4-20 8-20 4 17 8 17 4-5 7-5h5" fill="none" stroke="url(#tsmy-pill-wave)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="brand-name">The Sound <span>of My Years</span></span>
  </button>

  <div class="chapter-nav" role="group" aria-label="Eight story chapters">
    <span class="chapter-label">THE JOURNEY</span>
    <span class="current-label" aria-hidden="true"><b>{currentChapter.number}</b> {currentChapter.shortTitle}</span>
    {#each CHAPTERS as chapter (chapter.id)}
      <button
        type="button"
        class="chapter-dot"
        class:current={activeChapter === chapter.id}
        class:unreleased={chapter.status === 'planned'}
        aria-current={activeChapter === chapter.id ? 'location' : undefined}
        aria-label={`Scene ${chapter.number}: ${chapter.title}${chapter.status === 'planned' ? ', coming soon' : ''}`}
        data-label={`${chapter.number} · ${chapter.shortTitle}${chapter.status === 'planned' ? ' · soon' : ''}`}
        onclick={() => showChapter(chapter)}
      ><span class="dot"></span></button>
    {/each}
  </div>

  <div class="nav-actions">
    <button type="button" class="explore-button" bind:this={exploreButton} onclick={openDrawer} aria-haspopup="dialog" aria-expanded={drawerOpen}>
      <span class="explore-text">EXPLORE</span> <span class="arrow" aria-hidden="true">↗</span>
    </button>
  </div>
</nav>

{#if selectedInfo && !drawerOpen}
  <div class="chapter-toast" role="status">
    <span>{selectedInfo.number} / {selectedInfo.title} · In development</span>
    <button type="button" aria-label="Dismiss chapter information" onclick={() => selectedInfo = null}>×</button>
  </div>
{/if}

{#if drawerOpen}
  <button type="button" class="nav-scrim" aria-label="Close the journey menu" onclick={closeDrawer}></button>
  <aside class="journey-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" bind:this={drawer}>
    <div class="drawer-head">
      <span>THE SOUND OF MY YEARS / ARCHIVE</span>
      <button type="button" class="drawer-close" bind:this={closeButton} aria-label="Close navigation" onclick={closeDrawer}>×</button>
    </div>
    <div class="drawer-body">
      <p class="drawer-eyebrow">THE JOURNEY / 2018—2026</p>
      <h2 id="drawer-title">Every memory <em>has a rhythm.</em></h2>
      <div class="drawer-chapters">
        {#each CHAPTERS as chapter (chapter.id)}
          <button type="button" class="drawer-chapter" class:muted={chapter.status === 'planned'} onclick={() => showChapter(chapter)}>
            <span class="chapter-number">{chapter.number}</span>
            <span class="chapter-title">{chapter.title}</span>
            <span class="chapter-status">{chapter.status === 'planned' ? 'COMING SOON' : 'EXPLORE'}</span>
          </button>
        {/each}
      </div>
      {#if selectedInfo && selectedInfo.status === 'planned'}
        <p class="drawer-hint" role="status">Scene {selectedInfo.number}, “{selectedInfo.title}”, is part of the planned journey.</p>
      {/if}
    </div>
    <div class="drawer-footer">AN INDEPENDENT STUDENT PROJECT · NOT AFFILIATED WITH SPOTIFY</div>
  </aside>
{/if}

<style>
  .pill-nav{position:fixed;top:clamp(12px,2.7vh,28px);left:50%;transform:translateX(-50%);z-index:1000;display:grid;grid-template-columns:minmax(175px,1fr) auto minmax(170px,1fr);align-items:center;gap:clamp(.4rem,1.2vw,1.4rem);width:min(960px,calc(100vw - 30px));min-height:66px;padding:8px 12px 8px 17px;border:1px solid rgba(254,217,242,.2);border-radius:999px;background:rgba(29,12,39,.72);color:#fcebf7;box-shadow:0 15px 50px rgba(9,3,15,.32),inset 0 1px 0 rgba(255,255,255,.12);backdrop-filter:blur(22px) saturate(135%);-webkit-backdrop-filter:blur(22px) saturate(135%);font-family:'DM Sans',sans-serif}
  .pill-nav button{font:inherit;color:inherit;cursor:pointer}
  .brand{display:flex;align-items:center;min-width:0;gap:10px;border:0;background:none;text-align:left;padding:4px 0}
  .memory-signal{width:42px;min-width:42px;height:26px;filter:drop-shadow(0 0 7px rgba(236,133,209,.27))}
  .brand-name{font-weight:700;line-height:1.08;letter-spacing:-.03em;font-size:.91rem;white-space:nowrap}
  .brand-name span{font-weight:500;color:#eab8d9}
  .chapter-nav{display:flex;align-items:center;justify-content:center;gap:8px}
  .chapter-label{margin-right:3px;font-weight:700;letter-spacing:.16em;font-size:.55rem;color:#d9bfde;white-space:nowrap}
  .chapter-dot{position:relative;display:grid;place-items:center;width:25px;height:30px;border:0;background:transparent;border-radius:50%;transition:transform .24s ease}
  .dot{width:6px;height:6px;border-radius:50%;background:#d8a9d3;opacity:.65;transition:transform .28s ease,background .28s ease,box-shadow .28s ease,opacity .28s ease}
  .chapter-dot:hover .dot,.chapter-dot:focus-visible .dot{transform:scale(1.5);opacity:1;background:#ffbc91}
  .chapter-dot.current .dot{transform:scale(1.6);opacity:1;background:#f9c4de;box-shadow:0 0 0 4px rgba(255,170,218,.12),0 0 13px rgba(250,160,216,.5)}
  .chapter-dot::after{content:attr(data-label);position:absolute;top:calc(100% + 12px);left:50%;transform:translate(-50%,-4px);white-space:nowrap;padding:.38rem .8rem;border-radius:999px;background:rgba(20,10,38,.94);border:1px solid rgba(255,230,242,.28);font:600 .62rem var(--font-body,'DM Sans',sans-serif);letter-spacing:.06em;color:#f3d7ea;opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease}
  .chapter-dot:hover::after,.chapter-dot:focus-visible::after{opacity:1;transform:translate(-50%,0)}
  .chapter-dot.unreleased .dot{background:#96779f;opacity:.5}
  .chapter-dot:focus-visible,.brand:focus-visible,.sound-toggle:focus-visible,.explore-button:focus-visible,.drawer-close:focus-visible,.drawer-chapter:focus-visible{outline:2px solid #ffe5b7;outline-offset:3px}
  .nav-actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;white-space:nowrap}
  .sound-toggle{display:flex;gap:2px;align-items:center;border:0;background:transparent;padding:2px 5px;border-radius:20px}
  .sound-wave{width:46px;height:25px;opacity:.85}
  .sound-label{font-size:.55rem;font-weight:700;letter-spacing:.13em;color:#e4beda}
  .explore-button{display:flex;align-items:center;gap:11px;padding:11px 17px;border:1px solid rgba(252,192,223,.23);border-radius:99px;background:rgba(104,49,106,.36);letter-spacing:.13em;font-size:.67rem!important;font-weight:700!important;transition:background .24s ease,border-color .24s ease}
  .explore-button:hover{background:rgba(155,75,141,.43);border-color:rgba(252,192,223,.55)}
  .explore-button span{color:#ffb891;font-size:1rem}
  .chapter-toast,.audio-toast{position:fixed;top:104px;left:50%;transform:translateX(-50%);z-index:1002;padding:10px 14px;background:#24112f;border:1px solid #6e4670;border-radius:14px;color:#f6d4e8;font-size:.79rem;box-shadow:0 15px 40px #0006}
  .chapter-toast{display:flex;align-items:center;gap:15px}
  .chapter-toast button{background:transparent;border:0;color:#f6d4e8;font-size:1.1rem;cursor:pointer}
  .audio-toast{top:155px;color:#ffd4bd}
  .nav-scrim{position:fixed;inset:0;width:100%;height:100%;background:rgba(4,2,9,.7);backdrop-filter:blur(8px);border:0;z-index:1001;cursor:pointer}
  .journey-drawer{position:fixed;inset:0 0 0 auto;z-index:1002;width:min(540px,100vw);height:100dvh;display:flex;flex-direction:column;background:radial-gradient(circle at 90% 12%,#3b173e 0,transparent 43%),#10091b;color:#f7e6f3;border-left:1px solid rgba(255,190,224,.22);box-shadow:-20px 0 60px rgba(0,0,0,.36);animation:drawer-enter .42s cubic-bezier(.16,1,.3,1) both;font-family:'DM Sans',sans-serif;overflow:auto}
  .drawer-head{display:flex;align-items:center;justify-content:space-between;padding:23px clamp(22px,4vw,44px);font-size:.65rem;letter-spacing:.18em;color:#d9b4d7;font-weight:700}
  .drawer-close{display:grid;place-items:center;width:42px;height:42px;border:1px solid #825a81;border-radius:50%;background:transparent;color:#e9c5da;font-size:1.8rem;cursor:pointer}
  .drawer-body{flex:1;padding:clamp(34px,8vh,90px) clamp(22px,5vw,54px) 42px}
  .drawer-eyebrow{color:#f7ba95;font-size:.64rem;letter-spacing:.19em;font-weight:700}
  .drawer-body h2{font-family:'Syne',sans-serif;font-size:clamp(2.1rem,4vw,3.3rem);letter-spacing:-.065em;font-weight:650;line-height:1.06;margin:20px 0 35px;max-width:12ch}
  .drawer-body em{font-family:'Instrument Serif',Georgia,serif;font-weight:400;color:#efabd4}
  .drawer-chapters{display:grid;gap:1px}
  .drawer-chapter{display:grid;grid-template-columns:32px 1fr auto;align-items:baseline;gap:13px;width:100%;padding:13px 0;border:0;border-bottom:1px solid rgba(249,210,245,.08);background:transparent;text-align:left;color:inherit;cursor:pointer}
  .drawer-chapter:hover .chapter-title{color:#ffcaa9}
  .chapter-number{font-size:.68rem;color:#d6a9cb}
  .chapter-title{font-size:clamp(.82rem,1.3vw,1rem);line-height:1.45;transition:color .2s ease}
  .chapter-status{font-size:.54rem;letter-spacing:.13em;color:#f5b996;white-space:nowrap}
  .drawer-chapter.muted .chapter-title,.drawer-chapter.muted .chapter-status{opacity:.48}
  .drawer-hint{font-family:'Instrument Serif',Georgia,serif;font-size:1.05rem;color:#f4bdcc;font-style:italic;margin-top:20px}
  .drawer-footer{padding:18px clamp(22px,5vw,54px);font-size:.52rem;letter-spacing:.13em;color:#b69aba;border-top:1px solid #ffffff15}
  @keyframes drawer-enter{from{opacity:.8;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
  @media(max-width:820px){.pill-nav{grid-template-columns:auto 1fr auto;gap:1px;padding:6px 8px 6px 10px;min-height:58px}.brand-name{display:none}.memory-signal{width:35px;min-width:35px}.chapter-label{display:none}.chapter-nav{gap:0}.chapter-dot{width:22px}.nav-actions{gap:2px}.sound-wave{width:32px}.explore-button{padding:9px 11px;font-size:.55rem!important}.explore-button span{display:none}}
  @media(max-width:420px){.pill-nav{width:calc(100vw - 12px);border-radius:22px}.chapter-dot{width:17px}.dot{width:5px;height:5px}.sound-wave{width:25px}.explore-button{padding:8px 9px}}
  @media(prefers-reduced-motion:reduce){.journey-drawer{animation:none}.chapter-dot,.dot,.explore-button{transition:none}}

  /* ---- Mini-Pille: Fokus auf die Daten, Navigation bleibt einen Hover entfernt ---- */
  .pill-nav{transition:width .45s cubic-bezier(.2,.8,.2,1),min-height .35s ease,opacity .35s ease,padding .35s ease}
  .current-label{display:none;font-size:.7rem;font-weight:600;letter-spacing:.04em;color:#f3d7ea;white-space:nowrap}
  .current-label b{display:inline-grid;place-items:center;min-width:24px;height:22px;margin-right:.45rem;border-radius:99px;background:linear-gradient(135deg,#FFB98E,#F660B9);color:#1B0C2C;font-size:.62rem}
  .pill-nav.compact:not(:hover):not(:focus-within){width:min(470px,calc(100vw - 30px));min-height:46px;padding:4px 8px 4px 12px;grid-template-columns:auto 1fr auto;opacity:.82}
  .pill-nav.compact:not(:hover):not(:focus-within) .brand-name,
  .pill-nav.compact:not(:hover):not(:focus-within) .chapter-label,
  .pill-nav.compact:not(:hover):not(:focus-within) .chapter-dot,
  .pill-nav.compact:not(:hover):not(:focus-within) .explore-text{display:none}
  .pill-nav.compact:not(:hover):not(:focus-within) .current-label{display:block}
  .pill-nav.compact:not(:hover):not(:focus-within) .explore-button{padding:8px 11px}
  .pill-nav.compact:not(:hover):not(:focus-within) .sound-wave{width:34px}
  @media(prefers-reduced-motion:reduce){.pill-nav{transition:none}}
</style>
