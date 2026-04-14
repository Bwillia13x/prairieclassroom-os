import type { DrillDownContext } from "../types";

type StudentTagGroupContext = Extract<DrillDownContext, { type: "student-tag-group" }>;

interface Props {
  context: StudentTagGroupContext;
  onStudentSelect: (alias: string) => void;
}

export default function StudentTagGroupView({ context, onStudentSelect }: Props) {
  return (
    <div className="drill-down-section">
      <h3>
        {context.label} · {context.students.length} students
      </h3>
      {context.students.length > 0 ? (
        <ul className="drill-down-list">
          {context.students.map((student) => (
            <li key={student.alias}>
              <button type="button" onClick={() => onStudentSelect(student.alias)}>
                {student.alias}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="drill-down-empty">No students in this group.</p>
      )}
    </div>
  );
}
