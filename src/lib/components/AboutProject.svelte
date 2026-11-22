
<section
  id="about"
  class="about"
  aria-labelledby="about-heading"
>
  <div class="about-grid">
    <div class="about-intro">
      <p class="about-eyebrow">
        BEHIND THE TIME CAPSULE
      </p>

      <h2 id="about-heading">
        What the data knows.
        <em>What I remember.</em>
      </h2>
    </div>

    <div class="about-story">
      <p class="lead">
        The Sound of My Years is an independent
        student project exploring the relationship
        between personal memory and recorded
        listening history.
      </p>

      <p>
        Based on my Spotify Extended Streaming
        History, this interactive time capsule
        explores listening habits, forgotten songs,
        changing artist relationships and the
        music that has accompanied me through
        different periods of my life.
      </p>

      <p>
        The main focus is 2026, while listening
        records from 2018 onwards provide
        historical context.
      </p>

      <p>
        The visualisations distinguish recorded
        listening behaviour from personal memories.
        Only reviewed, privacy-conscious data
        summaries are intended for publication.
      </p>

      <p class="disclaimer">
        Independent Information Design student project.
        Not affiliated with or endorsed by Spotify.
      </p>
    </div>
  </div>
</section>

<style>
  .about {
    background: #0a0512;
    padding:
      clamp(6rem, 11vh, 10rem)
      clamp(1.5rem, 6vw, 7rem);

    border: none;
  }

  .about-grid {
    max-width: 1380px;
    margin: 0 auto;

    display: grid;
    grid-template-columns:
      minmax(0, 1.15fr)
      minmax(300px, 0.85fr);

    gap: clamp(3rem, 7vw, 8rem);
    align-items: start;
  }

  .about-eyebrow {
    margin: 0 0 2rem;
    color: #f0b392;

    font-family: var(--font-body);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.2em;

    text-decoration: none;
    border: none;
  }

  h2 {
    margin: 0;
    max-width: 14ch;

    font-family: var(--font-display);
    font-size: clamp(2.7rem, 4.6vw, 5.4rem);
    font-weight: 600;
    line-height: 1.08;
    letter-spacing: -0.055em;

    color: #fff0f7;
  }

  h2 em {
    display: block;
    margin-top: 0.3em;

    font-family: var(--font-editorial);
    font-weight: 400;
    letter-spacing: -0.035em;

    color: #e9acd2;
  }

  .about-story {
    padding-top: clamp(1.5rem, 4vw, 4rem);
    max-width: 54ch;
  }

  .about-story p {
    margin: 0 0 1.6rem;
    color: #c8b8d2;
    font-size: clamp(0.95rem, 1.1vw, 1.1rem);
    line-height: 1.8;
  }

  .about-story .lead {
    color: #f2ddea;
    font-size: clamp(1.1rem, 1.4vw, 1.35rem);
    line-height: 1.65;
  }

  .about-story .disclaimer {
    margin-top: 3rem;

    color: #a38ead;
    font-size: 0.75rem;
    line-height: 1.6;
  }

  @media (max-width: 800px) {
    .about-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .about-story {
      padding-top: 0;
    }

    h2 {
      max-width: 16ch;
    }
  }
</style>
