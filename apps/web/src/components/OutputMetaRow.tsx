import StatusChip from "./StatusChip";

interface MetaItem {
  label: string;
  tone?: "accent" | "analysis" | "provenance" | "pending" | "success" | "warning" | "danger" | "muted" | "sun" | "sage" | "slate" | "forest";
  icon?: string;
}

interface Props {
  items: MetaItem[];
  compact?: boolean;
}

export default function OutputMetaRow({ items, compact = false }: Props) {
  if (items.length === 0) return null;

  return (
    <div className={`output-meta-row${compact ? " output-meta-row--compact" : ""}`}>
      {items.map((item) => (
        <StatusChip
          key={`${item.tone ?? "muted"}-${item.label}`}
          label={item.label}
          tone={item.tone}
          icon={item.icon}
        />
      ))}
    </div>
  );
}
