// apps/web/src/components/SurvivalPacket.tsx
import PrintButton from "./PrintButton";
import OutputMetaRow from "./OutputMetaRow";
import "./SurvivalPacket.css";

interface RoutineEntry {
  time_or_label: string;
  description: string;
  recent_changes?: string;
}

interface StudentSupportEntry {
  student_ref: string;
  current_scaffolds: string[];
  key_strategies: string;
  things_to_avoid?: string;
}

interface EACoordination {
  ea_name?: string;
  schedule_summary: string;
  primary_students: string[];
  if_ea_absent: string;
}

interface SimplifiedDayPlan {
  time_slot: string;
  activity: string;
  sub_instructions: string;
  materials_location?: string;
}

interface FamilyCommsEntry {
  student_ref: string;
  status: "do_not_contact" | "defer_to_teacher" | "routine_ok" | "expecting_message";
  language_preference?: string;
  notes: string;
}

interface ComplexityPeak {
  time_slot: string;
  level: "low" | "medium" | "high";
  reason: string;
  mitigation: string;
}

interface SurvivalPacketData {
  packet_id: string;
  classroom_id: string;
  generated_for_date: string;
  routines: RoutineEntry[];
  student_support: StudentSupportEntry[];
  ea_coordination: EACoordination;
  simplified_day_plan: SimplifiedDayPlan[];
  family_comms: FamilyCommsEntry[];
  complexity_peaks: ComplexityPeak[];
  heads_up: string[];
}

const STATUS_LABELS: Record<string, string> = {
  do_not_contact: "DO NOT CONTACT",
  defer_to_teacher: "Defer to teacher",
  routine_ok: "Routine OK",
  expecting_message: "Expecting message",
};

const LEVEL_CLASS: Record<string, string> = {
  low: "survival-packet-badge--low",
  medium: "survival-packet-badge--medium",
  high: "survival-packet-badge--high",
};

export default function SurvivalPacket({ packet }: { packet: SurvivalPacketData }) {
  return (
    <div className="survival-packet">
      {/* Header */}
      <div className="survival-packet-header">
        <div>
          <h2 className="survival-packet-title">Substitute Survival Packet</h2>
          <p className="survival-packet-meta">
            {packet.classroom_id} &middot; {packet.generated_for_date}
          </p>
          <OutputMetaRow
            items={[
              { label: "Print-ready packet", tone: "accent" },
              { label: "Retrieval-backed", tone: "provenance" },
              { label: "Substitute coordination", tone: "analysis" },
            ]}
            compact
          />
        </div>
        <PrintButton label="Print Packet" />
      </div>

      {/* Heads Up */}
      {packet.heads_up.length > 0 && (
        <section aria-labelledby="heads-up-heading">
          <div className="survival-packet-heads-up">
            <h3
              id="heads-up-heading"
              className="survival-packet-heads-up-title"
            >
              Heads Up
            </h3>
            <ul className="survival-packet-heads-up-list">
              {packet.heads_up.map((item, i) => (
                <li key={i} className="survival-packet-heads-up-item">
                  <span aria-hidden="true">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Routines */}
      {packet.routines.length > 0 && (
        <section aria-labelledby="routines-heading">
          <h3 id="routines-heading" className="survival-packet-heading">
            Classroom Routines
          </h3>
          <div className="survival-packet-grid">
            {packet.routines.map((routine, i) => (
              <div key={i} className="survival-packet-card">
                <div className="survival-packet-label">
                  {routine.time_or_label}
                </div>
                <p className="survival-packet-text">{routine.description}</p>
                {routine.recent_changes && (
                  <p className="survival-packet-text--italic">
                    Recent change: {routine.recent_changes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Student Support */}
      {packet.student_support.length > 0 && (
        <section aria-labelledby="student-support-heading">
          <h3 id="student-support-heading" className="survival-packet-heading">
            Student Support
          </h3>
          <div className="survival-packet-stack">
            {packet.student_support.map((entry, i) => (
              <div key={i} className="survival-packet-card">
                <div className="survival-packet-student-name">{entry.student_ref}</div>
                {entry.current_scaffolds.length > 0 && (
                  <div className="survival-packet-scaffolds">
                    <span className="survival-packet-label">
                      Scaffolds:{" "}
                    </span>
                    <span className="survival-packet-text">
                      {entry.current_scaffolds.join(", ")}
                    </span>
                  </div>
                )}
                <p className="survival-packet-text" style={{ marginBottom: "var(--space-2)" }}>
                  <span className="survival-packet-text--bold">Key strategy: </span>
                  {entry.key_strategies}
                </p>
                {entry.things_to_avoid && (
                  <p className="survival-packet-avoid">
                    <span className="survival-packet-text--bold">Avoid: </span>
                    {entry.things_to_avoid}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EA Coordination */}
      <section aria-labelledby="ea-coordination-heading">
        <h3 id="ea-coordination-heading" className="survival-packet-heading">
          EA Coordination
        </h3>
        <div className="survival-packet-card survival-packet-ea-card">
          {packet.ea_coordination.ea_name && (
            <div className="survival-packet-inline-field">
              <strong>EA: </strong>
              {packet.ea_coordination.ea_name}
            </div>
          )}
          <div className="survival-packet-inline-field">
            <strong>Schedule: </strong>
            {packet.ea_coordination.schedule_summary}
          </div>
          {packet.ea_coordination.primary_students.length > 0 && (
            <div className="survival-packet-inline-field">
              <strong>Primary students: </strong>
              {packet.ea_coordination.primary_students.join(", ")}
            </div>
          )}
          <div className="survival-packet-inline-field">
            <strong>If EA is absent: </strong>
            {packet.ea_coordination.if_ea_absent}
          </div>
        </div>
      </section>

      {/* Simplified Day Plan */}
      {packet.simplified_day_plan.length > 0 && (
        <section aria-labelledby="day-plan-heading">
          <h3 id="day-plan-heading" className="survival-packet-heading">
            Day Plan
          </h3>
          <div className="survival-packet-table-wrap">
            <table className="survival-packet-table">
              <thead>
                <tr>
                  <th className="col-time">Time</th>
                  <th className="col-activity">Activity</th>
                  <th>Instructions for Sub</th>
                  <th className="col-materials">Materials</th>
                </tr>
              </thead>
              <tbody>
                {packet.simplified_day_plan.map((row, i) => (
                  <tr key={i}>
                    <td>{row.time_slot}</td>
                    <td className="cell-bold">{row.activity}</td>
                    <td>{row.sub_instructions}</td>
                    <td className="cell-muted">
                      {row.materials_location ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Complexity Peaks */}
      {packet.complexity_peaks.length > 0 && (
        <section aria-labelledby="complexity-peaks-heading">
          <h3 id="complexity-peaks-heading" className="survival-packet-heading">
            Complexity Peaks
          </h3>
          <div className="survival-packet-stack">
            {packet.complexity_peaks.map((peak, i) => (
              <div key={i} className="survival-packet-card">
                <div className="survival-packet-peak-header">
                  <span className="survival-packet-peak-time">{peak.time_slot}</span>
                  <span
                    className={`survival-packet-badge ${LEVEL_CLASS[peak.level] ?? LEVEL_CLASS.medium}`}
                  >
                    {peak.level.charAt(0).toUpperCase() + peak.level.slice(1)}
                  </span>
                </div>
                <p className="survival-packet-peak-detail">
                  <strong>Why: </strong>
                  {peak.reason}
                </p>
                <p className="survival-packet-peak-mitigation">
                  <strong>Mitigation: </strong>
                  {peak.mitigation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Family Comms */}
      {packet.family_comms.length > 0 && (
        <section aria-labelledby="family-comms-heading">
          <h3 id="family-comms-heading" className="survival-packet-heading">
            Family Communications
          </h3>
          <div className="survival-packet-stack">
            {packet.family_comms.map((entry, i) => {
              const badgeClass =
                entry.status === "do_not_contact"
                  ? "survival-packet-badge--danger"
                  : entry.status === "expecting_message"
                  ? "survival-packet-badge--info"
                  : "survival-packet-badge--muted";

              return (
                <div key={i} className="survival-packet-card">
                  <div className="survival-packet-comms-header">
                    <span className="survival-packet-comms-name">{entry.student_ref}</span>
                    <span className={`survival-packet-badge ${badgeClass}`}>
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                    {entry.language_preference && (
                      <span className="survival-packet-comms-lang">
                        {entry.language_preference}
                      </span>
                    )}
                  </div>
                  <p className="survival-packet-text">{entry.notes}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
