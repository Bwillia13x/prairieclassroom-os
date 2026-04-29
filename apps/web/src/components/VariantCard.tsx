import type { DifferentiatedVariant } from "../types";
import { estimateGradeLevel, describeGradeLevel } from "../utils/readingLevel";
import "./VariantCard.css";

const VARIANT_COPY: Record<string, { label: string; subtitle: string; confidence: string }> = {
  core: {
    label: "Core lane",
    subtitle: "Right level, right now",
    confidence: "Review ready",
  },
  eal_supported: {
    label: "EAL Supported lane",
    subtitle: "Language + meaning",
    confidence: "Language check",
  },
  chunked: {
    label: "Chunked lane",
    subtitle: "Scaffold for success",
    confidence: "Structure check",
  },
  ea_small_group: {
    label: "EA Small Group lane",
    subtitle: "Guided adult support",
    confidence: "Support check",
  },
  extension: {
    label: "Extension lane",
    subtitle: "Push thinking further",
    confidence: "Challenge check",
  },
};

interface Props {
  variant: DifferentiatedVariant;
  artifactTitle?: string;
  modelId?: string;
  preview?: boolean;
}

export default function VariantCard({ variant, artifactTitle, modelId, preview = false }: Props) {
  const copy = VARIANT_COPY[variant.variant_type] ?? {
    label: variant.title,
    subtitle: "Teacher-ready variant",
    confidence: "Review check",
  };
  const gradeLevel = estimateGradeLevel(variant.student_facing_instructions);
  const sourceLabel = artifactTitle || "Source artifact";
  const previewExcerpt = variant.student_facing_instructions
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");

  return (
    <article className={`variant-card variant-card--${variant.variant_type}`}>
      <div className="variant-card__identity">
        <span className="variant-card__dot" aria-hidden="true" />
        <div>
          <h3>{copy.label}</h3>
          <p>{copy.subtitle}</p>
        </div>
        <div className="variant-card__metrics" aria-label="Variant estimates">
          {gradeLevel !== null ? (
            <span
              className="variant-reading-level"
              title={`${describeGradeLevel(gradeLevel)} (Flesch-Kincaid estimate, heuristic)`}
            >
              ~Grade {gradeLevel}
            </span>
          ) : (
            <span>Grade band</span>
          )}
          <span>{variant.estimated_minutes} min</span>
        </div>
      </div>

      <div className="variant-card__body">
        <h4>{variant.title}</h4>
        <p>{variant.student_facing_instructions}</p>
        <div className="variant-card__tags">
          <span className="variant-card__tag variant-card__tag--confidence">{copy.confidence}</span>
          <span className="variant-card__tag">Source: {sourceLabel}</span>
          {!preview && modelId ? <span className="variant-card__tag">Model: {modelId}</span> : null}
        </div>
        {variant.teacher_notes || variant.required_materials.length > 0 ? (
          <details className="variant-card__details">
            <summary>Teacher edit notes</summary>
            {variant.teacher_notes ? <p>{variant.teacher_notes}</p> : null}
            {variant.required_materials.length > 0 ? (
              <ul>
                {variant.required_materials.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : null}
          </details>
        ) : null}
      </div>

      <div className="variant-card__preview" aria-hidden="true">
        <span className="variant-card__preview-kicker">{copy.confidence}</span>
        <strong>{copy.label.replace(" lane", "")}</strong>
        <p>{previewExcerpt}{previewExcerpt ? "..." : ""}</p>
        <div className="variant-card__preview-page">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="variant-card__actions">
        <button type="button">Preview lane</button>
        <button type="button">Edit copy</button>
        <button type="button" aria-label={`More actions for ${copy.label}`}>More</button>
      </div>
    </article>
  );
}
