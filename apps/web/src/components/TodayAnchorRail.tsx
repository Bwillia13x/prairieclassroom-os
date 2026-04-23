import PageAnchorRail, {
  type PageAnchor,
  type PageAnchorRailProps,
} from "./PageAnchorRail";

export type Anchor = PageAnchor;

type TodayAnchorRailProps = Omit<PageAnchorRailProps, "label" | "topAnchorId"> &
  Partial<Pick<PageAnchorRailProps, "label" | "topAnchorId">>;

export default function TodayAnchorRail({
  label = "Today sections",
  topAnchorId = "today-top",
  ...props
}: TodayAnchorRailProps) {
  return (
    <PageAnchorRail
      {...props}
      label={label}
      topAnchorId={topAnchorId}
    />
  );
}
