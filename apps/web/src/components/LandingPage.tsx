import BrandMark from "./BrandMark";
import "./LandingPage.css";

interface LandingPageProps {
  demoRoute: string;
}

export default function LandingPage({ demoRoute }: LandingPageProps) {
  return (
    <main className="landing-page" aria-labelledby="landing-title">
      <img
        className="landing-page__image"
        src="/brand/landing/prairieclassroom-landing-hero.png"
        alt=""
        aria-hidden="true"
        decoding="async"
        loading="eager"
      />
      <div className="landing-page__scrim" aria-hidden="true" />
      <div className="landing-page__shell">
        <header className="landing-page__header" aria-label="PrairieClassroom OS">
          <BrandMark className="landing-page__brand" />
        </header>
        <section className="landing-page__content">
          <h1 id="landing-title" className="landing-page__title">
            PrairieClassroom OS
          </h1>
          <p className="landing-page__copy">
            Teacher-controlled classroom memory and adult coordination for the
            live school day.
          </p>
          <a className="landing-page__cta" href={demoRoute}>
            Enter PrairieClassroom
          </a>
        </section>
      </div>
    </main>
  );
}
