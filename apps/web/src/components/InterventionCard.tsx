import type { InterventionRecord } from "../types";
import PrintButton from "./PrintButton";
import OutputMetaRow from "./OutputMetaRow";
import { buildModelMetaItems, type ModelMetaInput } from "./buildModelMetaItems";
import "./InterventionCard.css";

interface Props {
  record: InterventionRecord;
  meta?: ModelMetaInput;
}

export default function InterventionCard({ record, meta }: Props) {
  return (
    <div className="intervention-card">
      <header className="intervention-header">
        <h2>Intervention Record</h2>
        <p className="intervention-meta">
          {record.student_refs.join(", ")} · {record.classroom_id}
        </p>
        <OutputMetaRow
          items={[
            { label: "Saved to memory", tone: "provenance" },
            {
              label: record.follow_up_needed ? "Follow-up needed" : "Resolved for now",
              tone: record.follow_up_needed ? "warning" : "success",
            },
            ...buildModelMetaItems(meta ?? {}),
          ]}
          compact
        />
      </header>

      <div className="intervention-field">
        <div className="intervention-field-label">Observation</div>
        <div className="intervention-field-value">{record.observation}</div>
      </div>

      <div className="intervention-field">
        <div className="intervention-field-label">Action Taken</div>
        <div className="intervention-field-value">{record.action_taken}</div>
      </div>

      {record.outcome && (
        <div className="intervention-field intervention-field--outcome">
          <div className="intervention-field-label">Outcome</div>
          <div className="intervention-field-value">{record.outcome}</div>
        </div>
      )}

      <div className="intervention-field">
        <div className="intervention-field-label">Follow-up Needed</div>
        <span className={`followup-badge followup-badge--${record.follow_up_needed ? "yes" : "no"}`}>
          {record.follow_up_needed ? "Yes — needs continued attention" : "No — resolved for now"}
        </span>
      </div>

      <div className="intervention-saved">
        Saved to classroom memory
      </div>

      <PrintButton label="Print Record" />
    </div>
  );
}
