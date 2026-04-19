import "./LanguageToolsEmptyState.css";

interface Props {
  mode: "simplify" | "vocab";
  ealStudents: number;
  topLanguages: string[];
}

export default function LanguageToolsEmptyState({ mode, ealStudents, topLanguages }: Props) {
  return (
    <section className="lt-empty" aria-label="Language tools preview">
      <header className="lt-empty__header">
        <span className="lt-empty__eyebrow">
          {mode === "simplify" ? "Simplify preview" : "Vocab card preview"}
        </span>
        <h3 className="lt-empty__title">
          {mode === "simplify"
            ? "What a simplified passage looks like"
            : "What a bilingual card looks like"}
        </h3>
        <dl className="lt-empty__summary">
          <div>
            <dt>EAL</dt>
            <dd>{ealStudents} EAL</dd>
          </div>
          <div>
            <dt>Top languages</dt>
            <dd>{topLanguages.slice(0, 3).join(" · ") || "—"}</dd>
          </div>
        </dl>
      </header>

      {mode === "simplify" ? (
        <div className="lt-empty__simplify">
          <article className="lt-empty__block">
            <span className="lt-empty__block-label">Before</span>
            <p>
              Firefighters protect the community by extinguishing fires and performing rescues.
            </p>
          </article>
          <article className="lt-empty__block lt-empty__block--after">
            <span className="lt-empty__block-label">After</span>
            <p>Firefighters help people. They stop fires. They help people get out.</p>
          </article>
        </div>
      ) : (
        <article className="lt-empty__card">
          <div className="lt-empty__card-term">community</div>
          <div className="lt-empty__card-trans">
            <span>{topLanguages[0] ?? "Arabic"}</span>
            <span className="lt-empty__card-foreign">مجتمع</span>
          </div>
          <p className="lt-empty__card-def">
            A group of people who live, work, or learn together.
          </p>
          <p className="lt-empty__card-example">
            The community helped plant the garden.
          </p>
        </article>
      )}
    </section>
  );
}
