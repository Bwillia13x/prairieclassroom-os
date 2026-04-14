import SectionIcon from "../SectionIcon";
import type { InterventionChipDef, InterventionChipKey } from "./interventionChipDefs";

interface Props {
  def: InterventionChipDef;
  selected: boolean;
  onSelect: (key: InterventionChipKey) => void;
}

export default function InterventionChip({ def, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`intervention-chip${selected ? " intervention-chip--selected" : ""}`}
      aria-pressed={selected}
      aria-label={def.label}
      onClick={() => onSelect(def.key)}
    >
      <SectionIcon name={def.icon} className="intervention-chip__icon" />
      <span className="intervention-chip__label">{def.label}</span>
    </button>
  );
}
