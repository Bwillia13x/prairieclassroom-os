import {
  ClassroomCompositionRings,
  ComplexityDebtGauge,
  InterventionRecencyTimeline,
  StudentPriorityMatrix,
} from "./DataVisualizations";
import type { ClassroomProfile, DebtItem, DrillDownContext, StudentSummary } from "../types";

interface Props {
  debtItems: DebtItem[];
  previousDebtTotal?: number;
  debtTrendData?: number[];
  students: StudentSummary[];
  profileStudents: ClassroomProfile["students"];
  onOpenContext: (context: DrillDownContext) => void;
}

export default function ClassroomIntelligenceGrid({
  debtItems,
  previousDebtTotal,
  debtTrendData,
  students,
  profileStudents,
  onOpenContext,
}: Props) {
  return (
    <div className="classroom-intelligence__grid">
      {debtItems.length > 0 ? (
        <ComplexityDebtGauge
          debtItems={debtItems}
          previousTotal={previousDebtTotal}
          onSegmentClick={(payload) =>
            onOpenContext({
              type: "trend",
              trendKey: payload.trendKey,
              data: debtTrendData ?? payload.data,
              label: payload.label,
            })
          }
        />
      ) : null}

      {students.length > 0 ? (
        <StudentPriorityMatrix
          students={students}
          onStudentClick={(alias) => onOpenContext({ type: "student", alias })}
        />
      ) : null}

      {students.length > 0 ? (
        <InterventionRecencyTimeline
          students={students}
          onStudentClick={(alias) => onOpenContext({ type: "student", alias })}
        />
      ) : null}

      {profileStudents.length > 0 ? (
        <ClassroomCompositionRings
          students={profileStudents}
          onSegmentClick={(payload) =>
            onOpenContext({
              type: "student-tag-group",
              groupKind: payload.groupKind,
              tag: payload.tag,
              label: payload.label,
              students: payload.students,
            })
          }
        />
      ) : null}
    </div>
  );
}
