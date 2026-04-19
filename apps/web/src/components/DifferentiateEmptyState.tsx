import "./DifferentiateEmptyState.css";

interface ClassroomSummary {
  totalStudents: number;
  ealStudents: number;
  gradeBand: string;
}

interface Props {
  onStart: () => void;
  classroomSummary?: ClassroomSummary;
}

const SAMPLE_VARIANTS = [
  {
    lane: "core",
    label: "Sample — Core",
    title: "Community Helpers — grade-level reading",
    body: "Firefighters protect the community by putting out fires and rescuing people. They train often so they are ready to help.",
  },
  {
    lane: "chunked",
    label: "Sample — Chunked",
    title: "Community Helpers — three short steps",
    body: "1. Firefighters help the community.\n2. They put out fires.\n3. They rescue people who need help.",
  },
  {
    lane: "language",
    label: "Sample — Language",
    title: "Community Helpers — EAL supports",
    body: "Firefighters help people. They stop fires. Pre-teach: community, rescue, train. Visual cue: firefighter with hose.",
  },
] as const;

export default function DifferentiateEmptyState({ onStart, classroomSummary }: Props) {
  return (
    <section className="differentiate-empty-state surface-panel" aria-label="Differentiate onboarding">
      <header className="differentiate-empty-state__header">
        <span className="differentiate-empty-state__eyebrow">Variant canvas preview</span>
        <h3 className="differentiate-empty-state__title">What a run produces</h3>
        <p className="differentiate-empty-state__description">
          Drop in one lesson artifact; the canvas fills with a CORE version, a
          CHUNKED version for scaffolded readers, and a LANGUAGE-support version
          for EAL students.
        </p>
        {classroomSummary ? (
          <dl className="differentiate-empty-state__summary">
            <div>
              <dt>Grade band</dt>
              <dd>Grade {classroomSummary.gradeBand}</dd>
            </div>
            <div>
              <dt>Students</dt>
              <dd>{classroomSummary.totalStudents} students</dd>
            </div>
            <div>
              <dt>EAL</dt>
              <dd>{classroomSummary.ealStudents} EAL</dd>
            </div>
          </dl>
        ) : null}
      </header>

      <div className="differentiate-empty-state__samples" aria-hidden="true">
        {SAMPLE_VARIANTS.map((v) => (
          <article
            key={v.lane}
            className={`differentiate-empty-state__sample differentiate-empty-state__sample--${v.lane}`}
          >
            <span className="differentiate-empty-state__sample-label">{v.label}</span>
            <h4 className="differentiate-empty-state__sample-title">{v.title}</h4>
            <p className="differentiate-empty-state__sample-body">{v.body}</p>
          </article>
        ))}
      </div>

      <button className="btn btn--soft" type="button" onClick={onStart}>
        Start with the intake form
      </button>
    </section>
  );
}
