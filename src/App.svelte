<script>
  import SiteHeader from "./lib/components/SiteHeader.svelte";
  import PortalJourney from "./lib/components/PortalJourney.svelte";
  import RhythmWorld from "./lib/components/RhythmWorld.svelte";
  import AboutProject from "./lib/components/AboutProject.svelte";
  import PillNavbar from './lib/components/PillNavbar.svelte';
  import TimelinePath from './lib/components/TimelinePath.svelte';
  import ZMemoryStack from './lib/components/activetheory/ZMemoryStack.svelte';
</script>

<svelte:head>
  <title>The Sound of My Years · An Immersive Music Time Capsule</title>
  <meta
    name="description"
    content="An independent student project exploring personal Spotify listening history through memory, data and cinematic interaction."
  />
</svelte:head>

<PillNavbar />
<PortalJourney />
<main id="data-journey" class="data-journey">
  <TimelinePath />
  <RhythmWorld />
  <ZMemoryStack />
  <!-- weitere Welten folgen später, jeweils mit ihrem festen ID-Anchor -->
  <AboutProject />
</main>

<style>.data-journey { position: relative; isolation: isolate; background:#100B1E; }</style>