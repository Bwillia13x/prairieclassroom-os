import "./DraftRestoreChip.css";

interface Props {
  show: boolean;
  onRestore: () => void;
  onDismiss: () => void;
  label?: string;
}

export default function DraftRestoreChip({ show, onRestore, onDismiss, label }: Props) {
  if (!show) return null;
  return (
    <div className="draft-restore" role="status" aria-live="polite">
      <span className="draft-restore__text">
        {label ?? "Resume your draft from earlier?"}
      </span>
      <div className="draft-restore__actions">
        <button type="button" className="draft-restore__btn draft-restore__btn--primary" onClick={onRestore}>
          Resume
        </button>
        <button type="button" className="draft-restore__btn" onClick={onDismiss}>
          Discard
        </button>
      </div>
    </div>
  );
}
