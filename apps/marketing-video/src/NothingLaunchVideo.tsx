import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const NOTHING_VIDEO_WIDTH = 1920;
export const NOTHING_VIDEO_HEIGHT = 1080;
export const NOTHING_VIDEO_FPS = 30;

const sceneSeconds = [10, 11, 13, 12, 13, 12, 11, 12] as const;
const sceneStarts = sceneSeconds.reduce<number[]>((starts, seconds, index) => {
  starts.push(index === 0 ? 0 : starts[index - 1] + sceneSeconds[index - 1] * NOTHING_VIDEO_FPS);
  return starts;
}, []);

export const nothingDurationInFrames = sceneSeconds.reduce(
  (total, seconds) => total + seconds * NOTHING_VIDEO_FPS,
  0,
);

type Scene = {
  code: string;
  label: string;
  title: string;
  body: string;
  metric: string;
  image: string;
  imageMode: "desktop" | "device";
  signal: "white" | "red" | "green" | "amber";
  bullets: string[];
};

const scenes: Scene[] = [
  {
    code: "01",
    label: "command center",
    title: "The day stops hiding.",
    body: "PrairieClassroom OS opens on the operational truth of a complex classroom: the fragile block, the open loops, and the next useful move.",
    metric: "35 open threads / 7 students watching / 1 teacher in control",
    image: "screenshots/nothing-fixed/02-today-debt.png",
    imageMode: "desktop",
    signal: "white",
    bullets: ["not a chatbot", "not admin analytics", "a teacher command surface"],
  },
  {
    code: "02",
    label: "complexity debt",
    title: "Coordination work becomes visible.",
    body: "Follow-ups, unaddressed patterns, pending reviews, and student check-ins become an instrument panel instead of a private mental burden.",
    metric: "debt down 2 / check first / close loops",
    image: "screenshots/nothing-fixed/02-today-debt.png",
    imageMode: "desktop",
    signal: "amber",
    bullets: ["workload without blame", "attention before urgency", "operational memory"],
  },
  {
    code: "03",
    label: "differentiate",
    title: "One lesson. Five access routes.",
    body: "A single source artifact becomes classroom-ready variants for readiness, language support, chunking, extension, and small-group delivery.",
    metric: "5 variants generated / same learning goal",
    image: "screenshots/nothing-fixed/03b-differentiate-generated.png",
    imageMode: "desktop",
    signal: "green",
    bullets: ["core path", "language support", "EA-ready small group"],
  },
  {
    code: "04",
    label: "approval gate",
    title: "The copilot drafts. The teacher decides.",
    body: "Family communication and language supports stay human-approved. Nothing leaves the classroom automatically.",
    metric: "draft only / review required / school channel",
    image: "screenshots/nothing-fixed/04-family-message.png",
    imageMode: "desktop",
    signal: "red",
    bullets: ["teacher voice", "plain language", "no autonomous sends"],
  },
  {
    code: "05",
    label: "adult routing",
    title: "Scarce support gets a route.",
    body: "EA briefings convert classroom memory into concrete support blocks, watch points, and handoffs before the morning starts to move.",
    metric: "watch list / time blocks / handoff cues",
    image: "screenshots/nothing-fixed/05b-ea-briefing-generated.png",
    imageMode: "desktop",
    signal: "white",
    bullets: ["pre-correction", "shared context", "less hallway briefing"],
  },
  {
    code: "06",
    label: "forecast",
    title: "Catch the pressure before it spikes.",
    body: "The forecast frames classroom support complexity as stable, watch, or high-pressure blocks so teachers can prepare while there is still time.",
    metric: "green / amber / red / plan ahead",
    image: "screenshots/nothing-fixed/07b-forecast-generated.png",
    imageMode: "desktop",
    signal: "red",
    bullets: ["not behavior prediction", "pattern-informed planning", "early warning"],
  },
  {
    code: "07",
    label: "evidence loop",
    title: "Usage evidence stays local.",
    body: "Teacher feedback, sessions, generated artifacts, and request logs become a local evidence loop for pilot review and product learning.",
    metric: "feedback / sessions / reliability / pilot evidence",
    image: "screenshots/nothing-fixed/07-usage-insights.png",
    imageMode: "desktop",
    signal: "green",
    bullets: ["teacher-facing", "classroom-scoped", "no external warehouse"],
  },
  {
    code: "08",
    label: "local first",
    title: "Built for the adults carrying the room.",
    body: "The system keeps professional judgment at the center: local-first memory, bounded model routing, safety rules, and practical next actions.",
    metric: "Gemma 4 / local memory / human approval",
    image: "screenshots/nothing-fixed/08-mobile-today.png",
    imageMode: "device",
    signal: "white",
    bullets: ["no diagnosis", "no surveillance", "less coordination drag"],
  },
];

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const ease = Easing.bezier(0.25, 0.1, 0.25, 1);
const black = "#000000";
const surface = "#101114";
const raised = "#17191d";
const border = "#2b2f36";
const borderBright = "#4b5563";
const text = "#f4f4f5";
const secondary = "#a1a1aa";
const tertiary = "#71717a";
const red = "#d71921";
const green = "#4a9e5c";
const amber = "#d4a843";

const signalColor = (signal: Scene["signal"]) => {
  if (signal === "red") return red;
  if (signal === "green") return green;
  if (signal === "amber") return amber;
  return text;
};

const fadeForScene = (frame: number, start: number, duration: number, isFirst: boolean, isLast: boolean) => {
  const fade = 18;
  const end = start + duration;
  const fadeIn = isFirst
    ? 1
    : interpolate(frame, [start, start + fade], [0, 1], { ...clamp, easing: ease });
  const fadeOut = isLast
    ? 1
    : interpolate(frame, [end - fade, end], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) });
  return Math.min(fadeIn, fadeOut);
};

export const NothingLaunchVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: black, color: text, fontFamily: "Instrument Sans, system-ui, sans-serif" }}>
      <FontFaces />
      <GridBackground frame={frame} />
      {scenes.map((scene, index) => {
        const start = sceneStarts[index];
        const duration = sceneSeconds[index] * fps;
        const opacity = fadeForScene(frame, start, duration, index === 0, index === scenes.length - 1);
        return (
          <AbsoluteFill key={scene.code} style={{ opacity }}>
            <SceneFrame scene={scene} frame={frame - start} duration={duration} index={index} />
          </AbsoluteFill>
        );
      })}
      <Timeline frame={frame} />
    </AbsoluteFill>
  );
};

const FontFaces = () => (
  <style>
    {`
      @font-face {
        font-family: "Instrument Sans";
        src: url("${staticFile("fonts/instrument-sans-500.woff2")}") format("woff2");
        font-weight: 500;
      }
      @font-face {
        font-family: "Instrument Sans";
        src: url("${staticFile("fonts/instrument-sans-700.woff2")}") format("woff2");
        font-weight: 700;
      }
      @font-face {
        font-family: "JetBrains Mono";
        src: url("${staticFile("fonts/jetbrains-mono-variable.woff2")}") format("woff2");
        font-weight: 400 800;
      }
    `}
  </style>
);

const GridBackground = ({ frame }: { frame: number }) => {
  const drift = interpolate(frame % 240, [0, 240], [0, 16], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: 0.32,
        backgroundImage: `radial-gradient(circle, ${borderBright} 1px, transparent 1px)`,
        backgroundSize: "16px 16px",
        backgroundPosition: `${drift}px ${drift}px`,
      }}
    />
  );
};

const SceneFrame = ({
  scene,
  frame,
  duration,
  index,
}: {
  scene: Scene;
  frame: number;
  duration: number;
  index: number;
}) => {
  const enter = interpolate(frame, [0, 28], [0, 1], { ...clamp, easing: ease });
  const progress = interpolate(frame, [0, duration], [0, 1], clamp);
  const sig = signalColor(scene.signal);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 44,
          border: `1px solid ${border}`,
          background: "rgba(0,0,0,0.76)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 78,
          top: 72,
          right: 78,
          height: 58,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 18,
          color: secondary,
          textTransform: "uppercase",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Signal color={sig} progress={progress} />
          <span>PrairieClassroom OS</span>
          <span style={{ color: tertiary }}>/ Nothing-system cut</span>
        </div>
        <span>
          {scene.code} / {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 90,
          top: 182,
          width: 520,
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [16, 0], clamp)}px)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            border: `1px solid ${sig}`,
            color: sig,
            padding: "7px 10px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 16,
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 8, height: 8, background: sig }} />
          {scene.label}
        </div>

        <h1
          style={{
            margin: "34px 0 0",
            fontSize: 74,
            lineHeight: 1.02,
            letterSpacing: 0,
            fontWeight: 700,
            color: text,
          }}
        >
          {scene.title}
        </h1>

        <p
          style={{
            margin: "28px 0 0",
            color: secondary,
            fontSize: 28,
            lineHeight: 1.34,
            letterSpacing: 0,
            fontWeight: 500,
          }}
        >
          {scene.body}
        </p>

        <div
          style={{
            marginTop: 34,
            border: `1px solid ${borderBright}`,
            borderLeft: `5px solid ${sig}`,
            background: surface,
            padding: "18px 20px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 20,
            lineHeight: 1.3,
            color: text,
            textTransform: "uppercase",
          }}
        >
          {scene.metric}
        </div>

        <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
          {scene.bullets.map((bullet, bulletIndex) => {
            const reveal = interpolate(
              progress,
              [0.15 + bulletIndex * 0.08, 0.28 + bulletIndex * 0.08],
              [0, 1],
              { ...clamp, easing: ease },
            );
            return (
              <div
                key={bullet}
                style={{
                  opacity: reveal,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: secondary,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 18,
                  textTransform: "uppercase",
                }}
              >
                <span style={{ width: 18, height: 10, border: `1px solid ${sig}` }} />
                {bullet}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 680,
          top: 170,
          width: 1090,
          height: 760,
          opacity: interpolate(frame, [8, 34], [0, 1], { ...clamp, easing: ease }),
        }}
      >
        {scene.imageMode === "device" ? (
          <DeviceVisual scene={scene} progress={progress} />
        ) : (
          <DesktopVisual scene={scene} progress={progress} />
        )}
      </div>
    </AbsoluteFill>
  );
};

const DesktopVisual = ({ scene, progress }: { scene: Scene; progress: number }) => {
  const sig = signalColor(scene.signal);
  const scale = interpolate(progress, [0, 1], [1.01, 1.035], clamp);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        border: `1px solid ${borderBright}`,
        background: raised,
        overflow: "hidden",
        transform: `scale(${scale})`,
      }}
    >
      <Chrome color={sig} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 48, bottom: 0, overflow: "hidden" }}>
        <Img
          src={staticFile(scene.image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
      <CornerLabel color={sig} text={scene.label} />
    </div>
  );
};

const DeviceVisual = ({ scene, progress }: { scene: Scene; progress: number }) => {
  const sig = signalColor(scene.signal);
  const pan = interpolate(progress, [0.1, 1], [0, -1120], clamp);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 760,
          height: 520,
          border: `1px solid ${borderBright}`,
          overflow: "hidden",
          background: raised,
        }}
      >
        <Chrome color={sig} />
        <Img
          src={staticFile("screenshots/nothing-fixed/01-today-command.png")}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 48,
            width: "100%",
            height: "calc(100% - 48px)",
            objectFit: "cover",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 10,
          width: 310,
          height: 680,
          background: "#050505",
          border: `2px solid ${borderBright}`,
          padding: 12,
        }}
      >
        <div style={{ width: "100%", height: "100%", overflow: "hidden", border: `1px solid ${border}` }}>
          <Img
            src={staticFile(scene.image)}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              transform: `translateY(${pan}px)`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 58,
          width: 700,
          border: `1px solid ${sig}`,
          background: black,
          padding: 28,
          color: text,
        }}
      >
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, color: sig, textTransform: "uppercase" }}>
          production rule
        </div>
        <div style={{ marginTop: 12, fontSize: 39, lineHeight: 1.12, fontWeight: 700 }}>
          Professional judgment stays in the loop.
        </div>
      </div>
    </div>
  );
};

const Chrome = ({ color }: { color: string }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: 48,
      borderBottom: `1px solid ${border}`,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 16px",
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
      color: tertiary,
      textTransform: "uppercase",
    }}
  >
    <span style={{ width: 10, height: 10, background: color }} />
    <span style={{ width: 10, height: 10, border: `1px solid ${borderBright}` }} />
    <span style={{ width: 10, height: 10, border: `1px solid ${borderBright}` }} />
    <span style={{ marginLeft: 14 }}>demo classroom / fixed design capture</span>
  </div>
);

const CornerLabel = ({ color, text: label }: { color: string; text: string }) => (
  <div
    style={{
      position: "absolute",
      right: 18,
      bottom: 18,
      background: black,
      color,
      border: `1px solid ${color}`,
      padding: "8px 10px",
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
      textTransform: "uppercase",
    }}
  >
    {label}
  </div>
);

const Signal = ({ color, progress }: { color: string; progress: number }) => {
  const on = Math.floor(progress * 16) % 2 === 0;
  return (
    <span
      style={{
        width: 16,
        height: 16,
        background: on ? color : "transparent",
        border: `1px solid ${color}`,
        display: "block",
      }}
    />
  );
};

const Timeline = ({ frame }: { frame: number }) => {
  const progress = interpolate(frame, [0, nothingDurationInFrames - 1], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 78,
        right: 78,
        bottom: 64,
        height: 30,
        display: "flex",
        gap: 8,
      }}
    >
      {Array.from({ length: 34 }).map((_, index) => {
        const threshold = index / 34;
        return (
          <span
            key={index}
            style={{
              flex: 1,
              height: 10,
              alignSelf: "center",
              background: progress >= threshold ? text : border,
            }}
          />
        );
      })}
    </div>
  );
};
