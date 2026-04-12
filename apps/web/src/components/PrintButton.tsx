interface Props {
  label?: string;
}

export default function PrintButton({ label = "Print" }: Props) {
  return (
    <button
      className="btn btn--ghost print-btn"
      aria-label={label}
      onClick={() => window.print()}
      type="button"
    >
      {label}
    </button>
  );
}
