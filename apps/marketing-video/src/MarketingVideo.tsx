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

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;

const sceneSeconds = [8, 9, 11, 10, 10, 10, 9] as const;
const sceneStarts = sceneSeconds.reduce<number[]>((starts, seconds, index) => {
  starts.push(index === 0 ? 0 : starts[index - 1] + sceneSeconds[index - 1] * VIDEO_FPS);
  return starts;
}, []);

export const durationInFrames = sceneSeconds.reduce((total, seconds) => total + seconds * VIDEO_FPS, 0);

type Scene = {
  eyebrow: string;
  title: string;
  body: string;
  metric: string;
  image: string;
  imageMode: "wide" | "tall" | "mobile-final";
  accent: string;
  background: string;
};

const scenes: Scene[] = [
  {
    eyebrow: "PrairieClassroom OS",
    title: "A command center for classroom complexity.",
    body: "The day opens with the work teachers actually carry: learners, support needs, family follow-ups, staffing pressure, and the next block that can make or break the morning.",
    metric: "26 students · 8 EAL learners · 94 open threads",
    image: "screenshots/01-today-hero.png",
    imageMode: "wide",
    accent: "#0f4c9e",
    background: "#f7f8fa",
  },
  {
    eyebrow: "Morning Triage",
    title: "See the day before it happens.",
    body: "The Today view turns classroom history into an attention map: which block is fragile, which students need the first touch, and which coordination debt is already trending down.",
    metric: "10:00 math block · debt down 30",
    image: "screenshots/04-today-complexity-debt.png",
    imageMode: "wide",
    accent: "#1f7a44",
    background: "#eef1f6",
  },
  {
    eyebrow: "Differentiate",
    title: "One lesson becomes four workable paths.",
    body: "A single classroom artifact is reshaped into core, ESL-supported, chunked, and EA small-group variants so every learner can stay with the same instructional goal.",
    metric: "Core · ESL · chunked · small group",
    image: "screenshots/08b-differentiate-generated-full.png",
    imageMode: "tall",
    accent: "#4a5c80",
    background: "#f1f3f6",
  },
  {
    eyebrow: "Family Message",
    title: "Helpful drafts, bounded by teacher approval.",
    body: "The copilot drafts clear communication, but the product rule stays visible: nothing goes out automatically. The teacher reviews, edits, and shares through the school channel.",
    metric: "Draft first · teacher decides",
    image: "screenshots/10b-family-message-generated-full.png",
    imageMode: "tall",
    accent: "#a66a00",
    background: "#f7f8fa",
  },
  {
    eyebrow: "EA Briefing",
    title: "Coordinate support before the crunch point.",
    body: "Timestamped plans give educational assistants a concrete support route through the day: who to sit with, when to step in, and where the load is likely to spike.",
    metric: "Watch list · support blocks · load balance",
    image: "screenshots/13b-ea-briefing-full.png",
    imageMode: "tall",
    accent: "#3f6a6d",
    background: "#eef1f6",
  },
  {
    eyebrow: "Forecast",
    title: "Catch patterns before they become emergencies.",
    body: "The five-day forecast frames classroom risk as something teachers can prepare for early: green blocks are stable, amber blocks need attention, red blocks need a plan.",
    metric: "5-day risk view · early warning",
    image: "screenshots/17b-forecast-full.png",
    imageMode: "tall",
    accent: "#a62f26",
    background: "#f1f3f6",
  },
  {
    eyebrow: "Built For Schools",
    title: "Local-first, synthetic-demo safe, teacher controlled.",
    body: "PrairieClassroom OS combines fast classroom workflows, deeper planning, and durable classroom memory without pretending the model should replace professional judgment.",
    metric: "Gemma 4 workflows · classroom memory · approval gates",
    image: "screenshots/19-today-light-theme.png",
    imageMode: "mobile-final",
    accent: "#0f4c9e",
    background: "#f7f8fa",
  },
];

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const textColor = "#111827";
const mutedText = "#47505c";
const border = "#dfe3ea";

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

const localProgress = (frame: number, duration: number) =>
  interpolate(frame, [0, duration], [0, 1], clamp);

export const MarketingVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#f7f8fa", fontFamily: "Inter, Public Sans, system-ui, sans-serif" }}>
      {scenes.map((scene, index) => {
        const start = sceneStarts[index];
        const duration = sceneSeconds[index] * fps;
        const opacity = fadeForScene(frame, start, duration, index === 0, index === scenes.length - 1);
        const relativeFrame = frame - start;

        return (
          <AbsoluteFill key={scene.title} style={{ opacity }}>
            <MarketingScene scene={scene} frame={relativeFrame} duration={duration} index={index} />
          </AbsoluteFill>
        );
      })}
      <GlobalProgress frame={frame} />
    </AbsoluteFill>
  );
};

const MarketingScene = ({
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
  const enter = interpolate(frame, [0, 30], [0, 1], { ...clamp, easing: ease });
  const progress = localProgress(frame, duration);
  const imageScale = interpolate(progress, [0, 1], [1.015, 1.055], clamp);
  const textY = interpolate(enter, [0, 1], [38, 0], clamp);

  return (
    <AbsoluteFill style={{ background: scene.background }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(120deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.58) 43%, rgba(255,255,255,0.2) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 82,
          top: 78,
          width: 510,
          transform: `translateY(${textY}px)`,
          opacity: enter,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            border: `1px solid ${border}`,
            borderRadius: 8,
            background: "#fff",
            color: scene.accent,
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              display: "block",
              width: 10,
              height: 10,
              borderRadius: 3,
              background: scene.accent,
            }}
          />
          {scene.eyebrow}
        </div>

        <h1
          style={{
            marginTop: 38,
            color: textColor,
            fontSize: 68,
            lineHeight: 1.02,
            letterSpacing: 0,
            fontWeight: 850,
          }}
        >
          {scene.title}
        </h1>

        <p
          style={{
            marginTop: 30,
            color: mutedText,
            fontSize: 30,
            lineHeight: 1.32,
            letterSpacing: 0,
            fontWeight: 520,
          }}
        >
          {scene.body}
        </p>

        <div
          style={{
            marginTop: 38,
            padding: "18px 20px",
            borderLeft: `8px solid ${scene.accent}`,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 12px 36px rgba(17, 24, 39, 0.08)",
            color: textColor,
            fontSize: 27,
            lineHeight: 1.25,
            fontWeight: 800,
          }}
        >
          {scene.metric}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 675,
          top: scene.imageMode === "mobile-final" ? 110 : 76,
          width: scene.imageMode === "mobile-final" ? 1070 : 1128,
          height: scene.imageMode === "mobile-final" ? 780 : 836,
          transform: `scale(${imageScale})`,
          transformOrigin: "center",
          opacity: interpolate(frame, [8, 36], [0, 1], { ...clamp, easing: ease }),
        }}
      >
        {scene.imageMode === "mobile-final" ? (
          <FinalDeviceShot accent={scene.accent} progress={progress} />
        ) : (
          <ScreenshotWindow scene={scene} progress={progress} />
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 82,
          bottom: 66,
          display: "flex",
          alignItems: "center",
          gap: 16,
          color: "#56606d",
          fontSize: 22,
          fontWeight: 750,
        }}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span style={{ width: 78, height: 2, background: scene.accent, display: "block" }} />
        <span>Marketing demo</span>
      </div>
    </AbsoluteFill>
  );
};

const ScreenshotWindow = ({ scene, progress }: { scene: Scene; progress: number }) => {
  const isTall = scene.imageMode === "tall";
  const pan = isTall ? interpolate(progress, [0.12, 0.9], [0, -58], clamp) : 0;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 8,
        border: `1px solid ${border}`,
        background: "#ffffff",
        boxShadow: "0 26px 80px rgba(17, 24, 39, 0.16)",
        overflow: "hidden",
      }}
    >
      <BrowserChrome accent={scene.accent} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 50,
          bottom: 0,
          overflow: "hidden",
          background: "#0e1116",
        }}
      >
        <Img
          src={staticFile(scene.image)}
          style={
            isTall
              ? {
                  width: "100%",
                  height: "auto",
                  display: "block",
                  transform: `translateY(${pan}%)`,
                }
              : {
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }
          }
        />
      </div>
    </div>
  );
};

const BrowserChrome = ({ accent }: { accent: string }) => (
  <div
    style={{
      height: 50,
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "0 18px",
      background: "#ffffff",
      borderBottom: `1px solid ${border}`,
    }}
  >
    {[0, 1, 2].map((dot) => (
      <span
        key={dot}
        style={{
          width: 13,
          height: 13,
          borderRadius: 7,
          background: dot === 0 ? accent : "#c7ced8",
          display: "block",
        }}
      />
    ))}
    <span
      style={{
        marginLeft: 12,
        color: "#56606d",
        fontSize: 16,
        fontWeight: 700,
      }}
    >
      demo classroom · PrairieClassroom OS
    </span>
  </div>
);

const FinalDeviceShot = ({ accent, progress }: { accent: string; progress: number }) => {
  const mobileY = interpolate(progress, [0.15, 1], [42, -24], clamp);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 32,
          width: 850,
          height: 560,
        }}
      >
        <ScreenshotWindow
          scene={{
            eyebrow: "",
            title: "",
            body: "",
            metric: "",
            image: "screenshots/19-today-light-theme.png",
            imageMode: "wide",
            accent,
            background: "#fff",
          }}
          progress={progress}
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: 56,
          top: 50 + mobileY,
          width: 286,
          height: 620,
          borderRadius: 34,
          padding: 12,
          background: "#111827",
          boxShadow: "0 28px 72px rgba(17, 24, 39, 0.28)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 24,
            overflow: "hidden",
            background: "#ffffff",
          }}
        >
          <Img
            src={staticFile("screenshots/20-mobile-today.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
};

const GlobalProgress = ({ frame }: { frame: number }) => {
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 10,
        background: "#dfe3ea",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: "#0f4c9e",
        }}
      />
    </div>
  );
};
