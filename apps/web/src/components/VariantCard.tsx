import type { DifferentiatedVariant } from "../types";
import "./VariantCard.css";

const VARIANT_LABELS: Record<string, string> = {
  core: "Core",
  eal_supported: "EAL Supported",
  chunked: "Chunked",
  ea_small_group: "EA Small Group",
  extension: "Extension",
};

const VARIANT_COLORS: Record<string, string> = {
  core: "#2563eb",
  eal_supported: "#7c3aed",
  chunked: "#d97706",
  ea_small_group: "#16a34a",
  extension: "#dc2626",
};

interface Props {
  variant: DifferentiatedVariant;
}

export default function VariantCard({ variant }: Props) {
  const label = VARIANT_LABELS[variant.variant_type] ?? variant.variant_type;
  const color = VARIANT_COLORS[variant.variant_type] ?? "#6b7280";

  return (
    <article className="variant-card">
      <header className="variant-header">
        <span className="variant-badge" style={{ background: color }}>
          {label}
        </span>
        <span className="variant-time">{variant.estimated_minutes} min</span>
      </header>

      <h3 className="variant-title">{variant.title}</h3>

      <section className="variant-section">
        <h4>Student Instructions</h4>
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
