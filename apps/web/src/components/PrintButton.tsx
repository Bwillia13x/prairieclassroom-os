interface Props {
  label?: string;
  "data-testid"?: string;
}

export default function PrintButton({ label = "Print", "data-testid": dataTestId }: Props) {
  return (
    <button
      className="btn btn--ghost print-btn"
      aria-label={label}
      onClick={() => window.print()}
      type="button"
      data-testid={dataTestId}
    >
      {label}
    </button>
  );
}
