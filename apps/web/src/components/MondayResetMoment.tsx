import { useEffect, useMemo, useState } from "react";
import "./MondayResetMoment.css";

interface Props {
  classroomId: string;
}

function getIsoWeek(date: Date): string {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function storageKey(classroomId: string, weekKey: string): string {
  return `prairie:monday-reset:${classroomId}:${weekKey}`;
}

function readDismissed(classroomId: string, weekKey: string): boolean {
  if (typeof window === "undefined" || !classroomId) return false;
  try {
    return window.localStorage.getItem(storageKey(classroomId, weekKey)) === "dismissed";
  } catch {
    return false;
  }
}

export default function MondayResetMoment({ classroomId }: Props) {
  const today = useMemo(() => new Date(), []);
  const weekKey = useMemo(() => getIsoWeek(today), [today]);
  const isMonday = today.getDay() === 1;
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(classroomId, weekKey));

  useEffect(() => {
    setDismissed(readDismissed(classroomId, weekKey));
  }, [classroomId, weekKey]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey(classroomId, weekKey), "dismissed");
    } catch {
      /* ignore localStorage write failures */
    }
  };

  if (!isMonday || dismissed || !classroomId) return null;

  return (
    <section className="monday-reset-moment" role="status" aria-label="Fresh week">
      <div className="monday-reset-moment__band" aria-hidden="true" />
      <div className="monday-reset-moment__body">
        <span className="monday-reset-moment__eyebrow">Monday</span>
        <p className="monday-reset-moment__title">A fresh week. One calm move opens it.</p>
      </div>
      <button
        type="button"
        className="monday-reset-moment__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss fresh week banner"
      >
        x
      </button>
    </section>
  );
}