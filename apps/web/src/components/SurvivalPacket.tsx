// apps/web/src/components/SurvivalPacket.tsx

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

const LEVEL_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function SurvivalPacket({ packet }: { packet: SurvivalPacketData }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Substitute Survival Packet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {packet.classroom_id} &middot; {packet.generated_for_date}
          </p>
        </div>
        <button
          className="btn btn--ghost print:hidden"
          onClick={() => window.print()}
          aria-label="Print survival packet"
        >
          Print Packet
        </button>
      </div>

      {/* Heads Up */}
      {packet.heads_up.length > 0 && (
        <section aria-labelledby="heads-up-heading">
          <div className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950 rounded-r-lg p-4">
            <h3
              id="heads-up-heading"
              className="text-base font-semibold text-amber-800 dark:text-amber-200 mb-2"
            >
              Heads Up
            </h3>
            <ul className="space-y-1">
              {packet.heads_up.map((item, i) => (
                <li key={i} className="text-sm text-amber-900 dark:text-amber-100 flex gap-2">
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
          <h3
            id="routines-heading"
            className="text-lg font-semibold mb-3"
          >
            Classroom Routines
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {packet.routines.map((routine, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  {routine.time_or_label}
                </div>
                <p className="text-sm">{routine.description}</p>
                {routine.recent_changes && (
                  <p className="text-sm italic text-amber-700 dark:text-amber-300 mt-2">
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
          <h3
            id="student-support-heading"
            className="text-lg font-semibold mb-3"
          >
            Student Support
          </h3>
          <div className="space-y-3">
            {packet.student_support.map((entry, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="font-semibold text-sm mb-2">{entry.student_ref}</div>
                {entry.current_scaffolds.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Scaffolds:{" "}
                    </span>
                    <span className="text-sm">
                      {entry.current_scaffolds.join(", ")}
                    </span>
                  </div>
                )}
                <p className="text-sm mb-2">
                  <span className="font-medium">Key strategy: </span>
                  {entry.key_strategies}
                </p>
                {entry.things_to_avoid && (
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <span className="font-medium">Avoid: </span>
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
        <h3
          id="ea-coordination-heading"
          className="text-lg font-semibold mb-3"
        >
          EA Coordination
        </h3>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          {packet.ea_coordination.ea_name && (
            <div className="text-sm">
              <span className="font-medium">EA: </span>
              {packet.ea_coordination.ea_name}
            </div>
          )}
          <div className="text-sm">
            <span className="font-medium">Schedule: </span>
            {packet.ea_coordination.schedule_summary}
          </div>
          {packet.ea_coordination.primary_students.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Primary students: </span>
              {packet.ea_coordination.primary_students.join(", ")}
            </div>
          )}
          <div className="text-sm">
            <span className="font-medium">If EA is absent: </span>
            {packet.ea_coordination.if_ea_absent}
          </div>
        </div>
      </section>

      {/* Simplified Day Plan */}
      {packet.simplified_day_plan.length > 0 && (
        <section aria-labelledby="day-plan-heading">
          <h3
            id="day-plan-heading"
            className="text-lg font-semibold mb-3"
          >
            Day Plan
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                  <th className="px-3 py-2 font-semibold border border-gray-200 dark:border-gray-600 w-28">
                    Time
                  </th>
                  <th className="px-3 py-2 font-semibold border border-gray-200 dark:border-gray-600 w-40">
                    Activity
                  </th>
                  <th className="px-3 py-2 font-semibold border border-gray-200 dark:border-gray-600">
                    Instructions for Sub
                  </th>
                  <th className="px-3 py-2 font-semibold border border-gray-200 dark:border-gray-600 w-36">
                    Materials
                  </th>
                </tr>
              </thead>
              <tbody>
                {packet.simplified_day_plan.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-750"
                    }
                  >
                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 align-top">
                      {row.time_slot}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 align-top font-medium">
                      {row.activity}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 align-top">
                      {row.sub_instructions}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 dark:border-gray-600 align-top text-gray-600 dark:text-gray-400">
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
          <h3
            id="complexity-peaks-heading"
            className="text-lg font-semibold mb-3"
          >
            Complexity Peaks
          </h3>
          <div className="space-y-3">
            {packet.complexity_peaks.map((peak, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium">{peak.time_slot}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${LEVEL_COLORS[peak.level] ?? LEVEL_COLORS.medium}`}
                  >
                    {peak.level.charAt(0).toUpperCase() + peak.level.slice(1)}
                  </span>
                </div>
                <p className="text-sm mb-1">
                  <span className="font-medium">Why: </span>
                  {peak.reason}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Mitigation: </span>
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
          <h3
            id="family-comms-heading"
            className="text-lg font-semibold mb-3"
          >
            Family Communications
          </h3>
          <div className="space-y-3">
            {packet.family_comms.map((entry, i) => {
              const statusClass =
                entry.status === "do_not_contact"
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : entry.status === "expecting_message"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

              return (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                >
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="font-semibold text-sm">{entry.student_ref}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${statusClass}`}
                    >
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                    {entry.language_preference && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.language_preference}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{entry.notes}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
