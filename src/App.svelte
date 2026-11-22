<script>
  import SiteHeader from './lib/components/SiteHeader.svelte';
  import PortalJourney from './lib/components/PortalJourney.svelte';
  import RhythmPreview from './lib/components/RhythmPreview.svelte';
  import AboutProject from './lib/components/AboutProject.svelte';
</script>

<svelte:head>
  <title>The Sound of My Years · An Immersive Music Time Capsule</title>
  <meta name="description" content="An independent student project exploring personal Spotify listening history through memory, data and cinematic interaction." />
</svelte:head>

<SiteHeader />
<main>
  <PortalJourney />
  <RhythmPreview />
  <AboutProject />
  <footer class="site-footer">
    <span>THE SOUND OF MY YEARS</span>
    <span>AN INDEPENDENT STUDENT PROJECT · 2018—2026</span>
    <a href="#top" aria-label="Back to the beginning">BACK TO THE CAPSULE ↑</a>
  </footer>
</main>
