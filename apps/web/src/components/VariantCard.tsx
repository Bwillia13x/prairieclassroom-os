import type { DifferentiatedVariant } from "../types";
import { estimateGradeLevel, describeGradeLevel } from "../utils/readingLevel";
import "./VariantCard.css";

const VARIANT_LABELS: Record<string, string> = {
  core: "Core",
  eal_supported: "EAL Supported",
  chunked: "Chunked",
  ea_small_group: "EA Small Group",
  extension: "Extension",
};

interface Props {
  variant: DifferentiatedVariant;
}

export default function VariantCard({ variant }: Props) {
  const label = VARIANT_LABELS[variant.variant_type] ?? variant.variant_type;
  const gradeLevel = estimateGradeLevel(variant.student_facing_instructions);

  return (
    <article className="variant-card">
      <header className="variant-header">
        <span className={`variant-badge variant-badge--${variant.variant_type}`}>
          {label}
        </span>
        <span className="variant-time">{variant.estimated_minutes} min</span>
      </header>

      <h3 className="variant-title">{variant.title}</h3>

      <section className="variant-section">
        <header className="variant-section__header">
          <h4>Student Instructions</h4>
          {gradeLevel !== null ? (
            <span
              className="variant-reading-level"
              title={`${describeGradeLevel(gradeLevel)} (Flesch-Kincaid estimate, heuristic)`}
            >
              ~Grade {gradeLevel}
            </span>
          ) : null}
        </header>
        <p>{variant.student_facing_instructions}</p>
      </section>

      <section className="variant-section">
        <h4>Teacher Notes</h4>
        <p>{variant.teacher_notes}</p>
      </section>

      {variant.required_materials.length > 0 && (
        <section className="variant-section">
          <h4>Materials</h4>
          <ul>
            {variant.required_materials.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
