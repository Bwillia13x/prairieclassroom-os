import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const CLASSROOM_FULL_VIDEO_WIDTH = 1920;
export const CLASSROOM_FULL_VIDEO_HEIGHT = 1080;
export const CLASSROOM_FULL_VIDEO_FPS = 30;
export const classroomFullDurationInFrames = 168 * CLASSROOM_FULL_VIDEO_FPS;

const stillBase = "generated/the-classroom-is-already-full-2026-05-16/stills";
const captureBase = "browser-captures/the-classroom-is-already-full-2026-05-16";
const audioPath = "audio/the-classroom-is-already-full-2026-05-16/voiceover.mp3";
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const colors = {
  ink: "#10233b",
  navy: "#14325a",
  gold: "#c59a4b",
  paper: "#f8f3e8",
  soft: "#fffaf1",
  line: "rgba(16,35,59,0.18)",
};

function sec(value: number) {
  return Math.round(value * CLASSROOM_FULL_VIDEO_FPS);
}

type Window = {
  from: number;
  duration: number;
  element: React.ReactNode;
};

const windows: Window[] = [
  {
    from: 0,
    duration: 8,
    element: (
      <StillScene
        image="01-cold-open-classroom-already-full.png"
        title="The classroom is already full."
        kicker="8:12 AM"
        align="left"
      />
    ),
  },
  {
    from: 8,
    duration: 14,
    element: (
      <StillScene image="02-coordination-overload-planning-desk.png" title="Not just full of students." dim>
        <FloatingLabels
          labels={["Reading levels", "Home languages", "EA schedule", "Family message", "Tomorrow's plan", "Intervention notes"]}
        />
      </StillScene>
    ),
  },
  {
    from: 22,
    duration: 14,
    element: (
      <StillScene image="09-alberta-classroom-network-map.png" title="Alberta classrooms are scaling in complexity." align="right">
        <StatCards />
      </StillScene>
    ),
  },
  {
    from: 36,
    duration: 11,
    element: (
      <StillScene
        image="10-synthetic-grade-34-teacher-okafor.png"
        title="The crisis is coordination."
        kicker="Synthetic Grade 3/4 classroom"
        align="left"
      />
    ),
  },
  {
    from: 47,
    duration: 9,
    element: (
      <StillScene image="08-closing-prairie-classroom-horizon.png" title="PrairieClassroom OS" kicker="A teacher operating layer" align="center" />
    ),
  },
  {
    from: 56,
    duration: 18,
    element: <AppClip clip="01-today-view.mp4" title="Today view" subtitle="What changed. Who needs attention. Where the morning could break down." />,
  },
  {
    from: 74,
    duration: 6,
    element: <StillScene image="05-worksheet-structured-intelligence.png" title="A worksheet becomes structured classroom readiness." align="left" />,
  },
  {
    from: 80,
    duration: 18,
    element: (
      <AppClip
        clip="02-differentiate-workflow.mp4"
        startFrom={sec(8)}
        title="Differentiate workflow"
        subtitle="Artifact input and readiness-aligned output variants."
      />
    ),
  },
  {
    from: 98,
    duration: 13,
    element: <AppClip clip="03-tomorrow-plan-forecast.mp4" startFrom={sec(2)} title="Tomorrow Plan" subtitle="Classroom memory feeds the next day." />,
  },
  {
    from: 111,
    duration: 7,
    element: <AppClip clip="04-ea-briefing.mp4" startFrom={sec(2)} title="EA briefing" subtitle="Tomorrow's plan becomes adult coordination." />,
  },
  {
    from: 118,
    duration: 12,
    element: (
      <StillScene image="06-classroom-memory-loop.png" title="Signal → Synthesis → Action → Memory" align="center">
        <LoopLabels />
      </StillScene>
    ),
  },
  {
    from: 130,
    duration: 9,
    element: (
      <StillScene image="12-gemma4-dual-tier-architecture.png" title="Two Gemma 4 lanes" align="left">
        <TechTierOverlay />
      </StillScene>
    ),
  },
  {
    from: 139,
    duration: 7,
    element: <AppClip clip="06-support-patterns.mp4" title="Support Patterns" subtitle="Synthesis across records, still teacher-controlled." />,
  },
  {
    from: 146,
    duration: 9,
    element: (
      <AppClip
        clip="05-family-message-approval.mp4"
        startFrom={sec(3)}
        title="Draft only"
        subtitle="Teacher approval required."
        accent="trust"
      />
    ),
  },
  {
    from: 155,
    duration: 7,
    element: (
      <StillScene image="13-roster-checked-tool-safety.png" title="Bounded tools. Roster checked. Teacher approved." align="right">
        <SafetyChips />
      </StillScene>
    ),
  },
  {
    from: 162,
    duration: 6,
    element: (
      <StillScene image="08-closing-prairie-classroom-horizon.png" title="PrairieClassroom OS" align="center">
        <ClosingLockup />
      </StillScene>
    ),
  },
];

export const ClassroomFullVideo = () => {
  return (
    <AbsoluteFill style={{ background: colors.paper, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <Audio src={staticFile(audioPath)} />
      {windows.map((window) => (
        <Sequence key={`${window.from}-${window.duration}`} from={sec(window.from)} durationInFrames={sec(window.duration)}>
          <SceneFade duration={sec(window.duration)} isFirst={window.from === 0}>
            {window.element}
          </SceneFade>
        </Sequence>
      ))}
      <ProductionFooter />
    </AbsoluteFill>
  );
};

const SceneFade = ({ children, duration, isFirst = false }: { children: React.ReactNode; duration: number; isFirst?: boolean }) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    isFirst ? 1 : interpolate(frame, [0, 18], [0, 1], clamp),
    interpolate(frame, [duration - 18, duration], [1, 0], clamp),
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

function StillScene({
  image,
  title,
  kicker,
  align = "left",
  dim = false,
  children,
}: {
  image: string;
  title: string;
  kicker?: string;
  align?: "left" | "right" | "center";
  dim?: boolean;
  children?: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 360], [1.015, 1.08], clamp);
  const x = align === "right" ? -18 : align === "left" ? 18 : 0;
  const textStyle: React.CSSProperties =
    align === "center"
      ? { left: 0, right: 0, textAlign: "center", alignItems: "center" }
      : align === "right"
        ? { right: 96, textAlign: "right", alignItems: "flex-end" }
        : { left: 96, textAlign: "left", alignItems: "flex-start" };

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#0d1724" }}>
      <Img
        src={staticFile(`${stillBase}/${image}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${x}px) scale(${scale})`,
          filter: dim ? "brightness(0.74) saturate(0.92)" : "brightness(0.88) saturate(0.96)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            align === "right"
              ? "linear-gradient(90deg, rgba(9,20,34,0.10), rgba(9,20,34,0.72))"
              : align === "center"
                ? "linear-gradient(180deg, rgba(9,20,34,0.12), rgba(9,20,34,0.58))"
                : "linear-gradient(90deg, rgba(9,20,34,0.72), rgba(9,20,34,0.06))",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 112,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: align === "center" ? 1180 : 760,
          ...textStyle,
        }}
      >
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <h1
          style={{
            margin: 0,
            color: "#fffaf0",
            fontSize: align === "center" ? 82 : 64,
            lineHeight: 1.02,
            fontWeight: 760,
            letterSpacing: 0,
            textShadow: "0 18px 42px rgba(0,0,0,0.36)",
          }}
        >
          {title}
        </h1>
      </div>
      {children}
    </AbsoluteFill>
  );
}

function AppClip({
  clip,
  title,
  subtitle,
  startFrom = 0,
  accent = "default",
}: {
  clip: string;
  title: string;
  subtitle: string;
  startFrom?: number;
  accent?: "default" | "trust";
}) {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 22], [18, 0], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ background: "#f7f4ed" }}>
      <Video
        src={staticFile(`${captureBase}/${clip}`)}
        startFrom={startFrom}
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "saturate(0.94) contrast(1.02)",
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(9,20,34,0.02), rgba(9,20,34,0.22))" }} />
      <div
        style={{
          position: "absolute",
          left: 96,
          bottom: 72,
          transform: `translateY(${y}px)`,
          background: "rgba(10, 24, 40, 0.82)",
          color: "#fffaf1",
          border: `1px solid ${accent === "trust" ? "rgba(197,154,75,0.70)" : "rgba(255,250,241,0.22)"}`,
          borderRadius: 8,
          padding: "24px 28px",
          maxWidth: 760,
          boxShadow: "0 18px 46px rgba(0,0,0,0.22)",
        }}
      >
        <Kicker>{title}</Kicker>
        <div style={{ marginTop: 8, fontSize: 34, lineHeight: 1.16, fontWeight: 720, letterSpacing: 0 }}>{subtitle}</div>
      </div>
    </AbsoluteFill>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
  <div
    style={{
      color: "#f1c978",
      fontSize: 19,
      lineHeight: 1,
      fontWeight: 720,
      textTransform: "uppercase",
      letterSpacing: 0,
    }}
  >
    {children}
  </div>
  );
}

function FloatingLabels({ labels }: { labels: string[] }) {
  const frame = useCurrentFrame();
  const positions = [
    [118, 300],
    [420, 210],
    [760, 330],
    [1040, 230],
    [1240, 430],
    [1500, 300],
  ];
  return (
    <>
      {labels.map((label, index) => {
        const local = frame - index * 10;
        const opacity = Math.min(interpolate(local, [0, 12], [0, 1], clamp), interpolate(local, [88, 104], [1, 0.66], clamp));
        return (
          <div
            key={label}
            style={{
              position: "absolute",
              left: positions[index][0],
              top: positions[index][1],
              opacity,
              color: colors.ink,
              background: "rgba(255,250,241,0.88)",
              border: `1px solid ${colors.line}`,
              borderRadius: 8,
              padding: "14px 18px",
              fontSize: 26,
              fontWeight: 720,
              boxShadow: "0 14px 38px rgba(15,34,54,0.18)",
            }}
          >
            {label}
          </div>
        );
      })}
    </>
  );
}

function StatCards() {
  const stats = ["835,089 Alberta students", "44,000+ EAL students in CBE", "26,000 specialized learning needs in CBE"];
  return (
    <div style={{ position: "absolute", left: 116, top: 390, display: "flex", gap: 22 }}>
      {stats.map((stat) => (
        <div
          key={stat}
          style={{
            width: 360,
            minHeight: 120,
            background: "rgba(255,250,241,0.90)",
            border: `1px solid ${colors.line}`,
            borderRadius: 8,
            padding: "24px 26px",
            color: colors.ink,
            fontSize: 31,
            lineHeight: 1.12,
            fontWeight: 760,
            boxShadow: "0 18px 42px rgba(16,35,59,0.16)",
          }}
        >
          {stat}
        </div>
      ))}
    </div>
  );
}

function LoopLabels() {
  const items = ["Classroom signal", "Gemma 4 synthesis", "Teacher judgment", "Classroom memory"];
  const positions = [
    [790, 240],
    [1110, 500],
    [790, 745],
    [470, 500],
  ];
  return (
    <>
      {items.map((item, index) => (
        <div
          key={item}
          style={{
            position: "absolute",
            left: positions[index][0],
            top: positions[index][1],
            width: 300,
            textAlign: "center",
            color: colors.ink,
            background: "rgba(255,250,241,0.94)",
            border: `1px solid ${colors.line}`,
            borderRadius: 8,
            padding: "18px 20px",
            fontSize: 25,
            fontWeight: 760,
          }}
        >
          {item}
        </div>
      ))}
    </>
  );
}

function TechTierOverlay() {
  return (
  <div style={{ position: "absolute", right: 100, top: 310, width: 660, display: "grid", gap: 18 }}>
    <Tier title="Gemma 4 live tier" body="Differentiation · worksheet extraction · EA briefing" />
    <Tier title="Gemma 4 planning tier" body="Tomorrow plan · support patterns · forecast" />
  </div>
  );
}

function Tier({ title, body }: { title: string; body: string }) {
  return (
  <div
    style={{
      background: "rgba(255,250,241,0.92)",
      border: `1px solid ${colors.line}`,
      borderRadius: 8,
      padding: "22px 26px",
      color: colors.ink,
      boxShadow: "0 16px 36px rgba(16,35,59,0.14)",
    }}
  >
    <div style={{ color: colors.gold, fontSize: 18, fontWeight: 760, textTransform: "uppercase", letterSpacing: 0 }}>{title}</div>
    <div style={{ marginTop: 8, fontSize: 27, lineHeight: 1.18, fontWeight: 680 }}>{body}</div>
  </div>
  );
}

function SafetyChips() {
  return (
  <div style={{ position: "absolute", left: 120, bottom: 140, display: "flex", gap: 18 }}>
    {["Bounded tools", "Roster checked", "Teacher approved"].map((chip) => (
      <div
        key={chip}
        style={{
          color: colors.ink,
          background: "rgba(255,250,241,0.92)",
          border: `1px solid ${colors.line}`,
          borderRadius: 8,
          padding: "18px 24px",
          fontSize: 28,
          fontWeight: 760,
          boxShadow: "0 14px 34px rgba(16,35,59,0.14)",
        }}
      >
        {chip}
      </div>
    ))}
  </div>
  );
}

function ClosingLockup() {
  return (
  <div style={{ position: "absolute", left: 0, right: 0, top: 540, display: "flex", justifyContent: "center", gap: 18 }}>
    {["Built with Gemma 4", "Synthetic Alberta classroom demo"].map((item) => (
      <div
        key={item}
        style={{
          color: "#fffaf1",
          background: "rgba(10,24,40,0.68)",
          border: "1px solid rgba(255,250,241,0.22)",
          borderRadius: 8,
          padding: "16px 22px",
          fontSize: 25,
          fontWeight: 720,
        }}
      >
        {item}
      </div>
    ))}
  </div>
  );
}

function ProductionFooter() {
  return (
  <div
    style={{
      position: "absolute",
      right: 46,
      bottom: 30,
      color: "rgba(255,250,241,0.74)",
      fontSize: 16,
      fontWeight: 620,
      textShadow: "0 8px 22px rgba(0,0,0,0.30)",
    }}
  >
    Working prototype · Synthetic/demo data
  </div>
  );
}
