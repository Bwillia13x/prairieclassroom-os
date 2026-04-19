import { useState } from "react";
import "./PrepSectionIntro.css";

export default function PrepSectionIntro() {
  const [open, setOpen] = useState(false);
  return (
    <section className="prep-intro" aria-label="Prep section overview">
      <div className="prep-intro__row">
        <span className="prep-intro__eyebrow">Prep</span>
        <p className="prep-intro__pitch">
          Build classroom-ready materials. Differentiate a lesson artifact, or
          prepare language supports for EAL students.
        </p>
        <button
          type="button"
          className="prep-intro__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "When to use"}
        </button>
      </div>
      {open ? (
        <dl className="prep-intro__guide">
          <div className="prep-intro__guide-row">
            <dt>Differentiate</dt>
            <dd>
              Use Differentiate when you have a lesson worksheet or passage you
              want to adapt across readiness levels.
            </dd>
          </div>
          <div className="prep-intro__guide-row">
            <dt>Language Tools</dt>
            <dd>
              Use Language Tools when you need simplified text or bilingual
              vocabulary cards for a specific EAL student or group.
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
