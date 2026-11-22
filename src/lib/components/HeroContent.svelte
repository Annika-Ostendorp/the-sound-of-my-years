<div class="hero-content">
  <h1>THE SOUND OF MY YEARS</h1>

  <p class="hero-question">
    What if my music remembers more than I do?
  </p>
</div>

<style>
  .hero-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.15rem;
  }

  h1 {
  margin: 0;
  white-space: nowrap;

  font-family: 'Syne', sans-serif;
  font-size: clamp(2rem, 4.15vw, 5.2rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.055em;

  color: #fff2f7;

  text-shadow:
    0 8px 40px rgba(194, 108, 180, 0.16),
    0 2px 22px rgba(0, 0, 0, 0.35);

  animation: titleEntrance 1.25s
    cubic-bezier(.16, 1, .3, 1) both;
}

  .hero-question {
    margin: 0;

    font-family: 'Instrument Serif', Georgia, serif;
    font-size: clamp(1.2rem, 1.8vw, 1.85rem);
    font-style: italic;
    line-height: 1.3;

    color: #f5d5e9;

    text-shadow:
      0 4px 25px rgba(0, 0, 0, 0.5);

    animation: subtitleEntrance 1.1s
      cubic-bezier(.16, 1, .3, 1) .45s both;
  }

  @keyframes titleEntrance {
    from {
      opacity: 0;
      transform: translateY(22px) scale(.985);
      filter: blur(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes subtitleEntrance {
    from {
      opacity: 0;
      transform: translateY(14px);
      filter: blur(5px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }

  @media (max-width: 760px) {
    h1 {
      white-space: normal;
      font-size: clamp(2.2rem, 8.5vw, 4rem);
      text-wrap: balance;
    }

    .hero-question {
      max-width: 28ch;
      font-size: 1.25rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    h1, .hero-question {
      animation: none;
    }
  }
</style>