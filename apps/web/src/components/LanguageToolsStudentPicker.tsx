import { useState } from "react";
import "./LanguageToolsStudentPicker.css";

export interface StudentLike {
  alias: string;
  eal_flag?: boolean;
  family_language?: string;
}

interface Props {
  students: StudentLike[];
  value: StudentLike | null;
  onChange: (s: StudentLike | null) => void;
}

export default function LanguageToolsStudentPicker({ students, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ealStudents = students.filter((s) => s.eal_flag);

  if (ealStudents.length === 0) return null;

  return (
    <div className="lt-student-picker">
      <button
        type="button"
        className="lt-student-picker__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lt-student-picker__label">For student</span>
        <span className="lt-student-picker__value">
          {value ? value.alias : "Optional — any EAL student"}
        </span>
      </button>
      {open ? (
        <ul className="lt-student-picker__list" role="listbox">
          <li
            role="option"
            aria-selected={value === null}
            tabIndex={0}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onChange(null);
                setOpen(false);
              }
            }}
          >
            Any EAL student
          </li>
          {ealStudents.map((s) => (
            <li
              key={s.alias}
              role="option"
              aria-selected={value?.alias === s.alias}
              tabIndex={0}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange(s);
                  setOpen(false);
                }
              }}
            >
              <span className="lt-student-picker__alias">{s.alias}</span>
              {s.family_language ? (
                <span className="lt-student-picker__lang">{s.family_language}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
