import "./ToolSwitcherStepper.css";

interface Props {
  total: number;
  activeIndex: number;
  label?: string;
}

export default function ToolSwitcherStepper({
  total,
  activeIndex,
  label = "Tool progress",
}: Props) {
  return (
    <div
      className="tool-switcher-stepper"
      role="progressbar"
      aria-label={label}
      aria-valuenow={activeIndex + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <span className="tool-switcher-stepper__rail" aria-hidden="true" />
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-index={i}
          className={`tool-switcher-stepper__dot${i === activeIndex ? " tool-switcher-stepper__dot--active" : ""}${i < activeIndex ? " tool-switcher-stepper__dot--complete" : ""}`}
        />
      ))}
    </div>
  );
}
