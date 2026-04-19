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

const sceneSeconds = [11, 12, 13, 15, 17, 16, 15, 15, 14, 15, 14, 15] as const;
const sceneStarts = sceneSeconds.reduce<number[]>((starts, seconds, index) => {
  starts.push(index === 0 ? 0 : starts[index - 1] + sceneSeconds[index - 1] * VIDEO_FPS);
  return starts;
}, []);

export const durationInFrames = sceneSeconds.reduce((total, seconds) => total + seconds * VIDEO_FPS, 0);

type VisualMode = "screenshot" | "architecture" | "proof" | "safety" | "final";
type ImageMode = "wide" | "tall";

type Scene = {
  eyebrow: string;
  title: string;
  body: string;
  metric: string;
  accent: string;
  background: string;
  visual: VisualMode;
  image?: string;
  imageMode?: ImageMode;
  callouts: string[];
};

const scenes: Scene[] = [
  {
    eyebrow: "PrairieClassroom OS",
    title: "Classroom complexity is a coordination problem.",
    body: "Teachers are not just delivering lessons. They are sequencing support, remembering accommodations, managing family communication, and choosing which fragile moment needs attention first.",
    metric: "26 students · 8 EAL learners · 94 open threads",
    image: "screenshots/01-today-hero.png",
    imageMode: "wide",
    visual: "screenshot",
    accent: "#0f4c9e",
    background: "#f7f8fa",
    callouts: ["Built for Alberta K-6", "Teacher and EA workflow", "Not a student chatbot"],
  },
  {
    eyebrow: "Morning Triage",
    title: "The day becomes a shape teachers can act on.",
    body: "The Today view turns classroom memory into an attention map: where the day will peak, which learners need the first touch, and which support work cannot wait.",
    metric: "10:00 math block · visible watch points",
    image: "screenshots/02-today-day-arc.png",
    imageMode: "wide",
    visual: "screenshot",
    accent: "#1f7a44",
    background: "#eef1f6",
    callouts: ["Block-level risk", "Student-specific cues", "Before-the-bell planning"],
  },
  {
    eyebrow: "Complexity Debt",
    title: "Outstanding classroom work stops hiding.",
    body: "PrairieClassroom frames follow-ups, pending messages, recurring plan items, and stale interventions as visible debt. The point is not surveillance. It is reducing cognitive load.",
    metric: "94 items · down 30 from last check",
    image: "screenshots/04-today-complexity-debt.png",
    imageMode: "wide",
    visual: "screenshot",
    accent: "#5f4bb6",
    background: "#f1f3f6",
    callouts: ["Prioritize what compounds", "Close loops sooner", "Keep teacher judgment central"],
  },
  {
    eyebrow: "Architecture",
    title: "A local-first classroom operating layer.",
    body: "The app routes structured teacher requests through validation, safety checks, classroom memory, model-tier selection, and tool calls before returning reviewable artifacts.",
    metric: "Web UI · orchestrator · Gemma tiers · SQLite memory",
    visual: "architecture",
    accent: "#3f6a6d",
    background: "#f7f8fa",
    callouts: ["Validated inputs", "Retrieval-backed context", "Persisted outputs"],
  },
  {
    eyebrow: "Differentiate",
    title: "One source artifact becomes multiple workable paths.",
    body: "A teacher can adapt a lesson into core, EAL-supported, chunked, extension, and EA small-group versions while preserving the same instructional goal.",
    metric: "Core · EAL · chunked · extension · small group",
    image: "screenshots/08b-differentiate-generated-full.png",
    imageMode: "tall",
    visual: "screenshot",
    accent: "#4a5c80",
    background: "#eef1f6",
    callouts: ["Same goal, different access routes", "Fast live-tier generation", "Curriculum grounding available"],
  },
  {
    eyebrow: "Family Communication",
    title: "Drafts are helpful. Approval is non-negotiable.",
    body: "The system drafts clear family messages and language supports, but it never sends for the teacher. Every outward communication stays reviewable, editable, and human-approved.",
    metric: "Draft first · teacher reviews · school channel decides",
    image: "screenshots/10b-family-message-generated-full.png",
    imageMode: "tall",
    visual: "screenshot",
    accent: "#a66a00",
    background: "#f7f8fa",
    callouts: ["Plain-language drafts", "Multilingual support path", "No autonomous sends"],
  },
  {
    eyebrow: "EA Coordination",
    title: "Scarce adult support gets a route through the day.",
    body: "EA briefings and load balancing turn patterns into concrete support blocks: who needs pre-correction, where the morning will spike, and when a handoff matters.",
    metric: "Watch list · support blocks · load balance",
    image: "screenshots/15b-ea-load-full.png",
    imageMode: "tall",
    visual: "screenshot",
    accent: "#346751",
    background: "#f1f3f6",
    callouts: ["Morning-only EA coverage", "Cognitive load balancing", "Concrete next actions"],
  },
  {
    eyebrow: "Forecast",
    title: "Planning moves from reactive to anticipatory.",
    body: "The complexity forecast looks across coming blocks and days, using classroom memory to surface stable, watch, and high-pressure moments before they become emergencies.",
    metric: "5-day forecast · early warning · plan ahead",
    image: "screenshots/17b-forecast-full.png",
    imageMode: "tall",
    visual: "screenshot",
    accent: "#a62f26",
    background: "#eef1f6",
    callouts: ["Green, amber, red blocks", "Pattern-informed planning", "Teacher-facing warning"],
  },
  {
    eyebrow: "Evidence Loop",
    title: "Usage evidence stays with the classroom.",
    body: "Feedback, sessions, request logs, and generated artifacts become a local evidence portfolio. Teachers can see which workflows are useful without sending analytics to an external warehouse.",
    metric: "Feedback · sessions · reliability · pilot evidence",
    image: "screenshots/18b-usage-insights-full.png",
    imageMode: "tall",
    visual: "screenshot",
    accent: "#755c1b",
    background: "#f7f8fa",
    callouts: ["Teacher-facing insights", "Local SQLite storage", "Pilot-ready artifacts"],
  },
  {
    eyebrow: "Governance",
    title: "The system is bounded by design.",
    body: "PrairieClassroom is not a diagnostic engine, discipline score, or student-surveillance tool. It uses observational language, role-aware access, prompt-injection checks, and approval gates.",
    metric: "No diagnosis · no autonomous sends · no surveillance",
    visual: "safety",
    accent: "#8d3f64",
    background: "#f1f3f6",
    callouts: ["15 forbidden diagnostic terms", "Classroom-code access", "Audit trail on model-routed outputs"],
  },
  {
    eyebrow: "Gemma 4 Proof",
    title: "Fast live work and deeper planning share one substrate.",
    body: "Live prompt classes handle immediate classroom tasks. Planning prompt classes use retrieval and thinking mode for forecasts, tomorrow plans, support patterns, scaffold reviews, and load balancing.",
    metric: "7 live classes · 6 planning classes · deterministic debt register",
    visual: "proof",
    accent: "#0f4c9e",
    background: "#eef1f6",
    callouts: ["Hosted Gemma proof lane passing", "42/42 final evals in baseline", "Local-first deployment target"],
  },
  {
    eyebrow: "Built For Schools",
    title: "A copilot for the adults carrying the classroom.",
    body: "The north star is simple: reduce coordination load, preserve privacy, keep professionals in control, and help each student receive the support they need at the right moment.",
    metric: "Classroom memory · teacher control · practical next actions",
    visual: "final",
    accent: "#0f4c9e",
    background: "#f7f8fa",
    callouts: ["Runs in the demo classroom today", "Mobile and desktop UI", "Ready for cinematic treatment"],
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
  const fade = 20;
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
  const enter = interpolate(frame, [0, 32], [0, 1], { ...clamp, easing: ease });
  const progress = localProgress(frame, duration);
  const imageScale = interpolate(progress, [0, 1], [1.01, 1.055], clamp);
  const textY = interpolate(enter, [0, 1], [36, 0], clamp);

  return (
    <AbsoluteFill style={{ background: scene.background }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(120deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.58) 46%, rgba(255,255,255,0.18) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 74,
          top: 72,
          width: 560,
          transform: `translateY(${textY}px)`,
          opacity: enter,
        }}
      >
        <Eyebrow scene={scene} />
        <h1
          style={{
            marginTop: 34,
            color: textColor,
            fontSize: 64,
            lineHeight: 1.02,
            letterSpacing: 0,
            fontWeight: 850,
          }}
        >
          {scene.title}
        </h1>
        <p
          style={{
            marginTop: 26,
            color: mutedText,
            fontSize: 28,
            lineHeight: 1.32,
            letterSpacing: 0,
            fontWeight: 520,
          }}
        >
          {scene.body}
        </p>
        <div
          style={{
            marginTop: 34,
            padding: "17px 19px",
            borderLeft: `8px solid ${scene.accent}`,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 12px 36px rgba(17, 24, 39, 0.08)",
            color: textColor,
            fontSize: 26,
            lineHeight: 1.25,
            fontWeight: 820,
          }}
        >
          {scene.metric}
        </div>
        <CalloutList callouts={scene.callouts} accent={scene.accent} progress={progress} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 690,
          top: scene.visual === "final" ? 104 : 70,
          width: scene.visual === "final" ? 1060 : 1140,
          height: scene.visual === "final" ? 800 : 850,
          transform: `scale(${imageScale})`,
          transformOrigin: "center",
          opacity: interpolate(frame, [8, 38], [0, 1], { ...clamp, easing: ease }),
        }}
      >
        <VisualPanel scene={scene} progress={progress} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 74,
          bottom: 62,
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
        <span>NotebookLM source overview</span>
      </div>
    </AbsoluteFill>
  );
};

const Eyebrow = ({ scene }: { scene: Scene }) => (
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
      fontSize: 22,
      fontWeight: 830,
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
);

const CalloutList = ({
  callouts,
  accent,
  progress,
}: {
  callouts: string[];
  accent: string;
  progress: number;
}) => (
  <div style={{ display: "grid", gap: 10, marginTop: 28 }}>
    {callouts.map((callout, index) => {
      const reveal = interpolate(progress, [0.08 + index * 0.07, 0.2 + index * 0.07], [0, 1], {
        ...clamp,
        easing: ease,
      });
      return (
        <div
          key={callout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: reveal,
            transform: `translateY(${interpolate(reveal, [0, 1], [12, 0], clamp)}px)`,
            color: "#384252",
            fontSize: 23,
            fontWeight: 700,
            lineHeight: 1.18,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              border: `2px solid ${accent}`,
              background: "#fff",
              display: "block",
            }}
          />
          <span>{callout}</span>
        </div>
      );
    })}
  </div>
);

const VisualPanel = ({ scene, progress }: { scene: Scene; progress: number }) => {
  if (scene.visual === "architecture") {
    return <ArchitectureVisual accent={scene.accent} progress={progress} />;
  }
  if (scene.visual === "proof") {
    return <ProofVisual accent={scene.accent} progress={progress} />;
  }
  if (scene.visual === "safety") {
    return <SafetyVisual accent={scene.accent} progress={progress} />;
  }
  if (scene.visual === "final") {
    return <FinalDeviceShot accent={scene.accent} progress={progress} />;
  }
  return <ScreenshotWindow scene={scene} progress={progress} />;
};

const ScreenshotWindow = ({ scene, progress }: { scene: Scene; progress: number }) => {
  const isTall = scene.imageMode === "tall";
  const pan = isTall ? interpolate(progress, [0.12, 0.9], [0, -52], clamp) : 0;

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
          src={staticFile(scene.image ?? "screenshots/01-today-hero.png")}
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

const ArchitectureVisual = ({ accent, progress }: { accent: string; progress: number }) => {
  const layers = [
    { title: "Teacher UI", body: "Panels, forms, uploads, role-aware classroom access" },
    { title: "Orchestrator", body: "Zod validation, auth, sanitization, prompt routing" },
    { title: "Gemma 4 Tiers", body: "Live classes for speed, planning classes for depth" },
    { title: "Memory Layer", body: "Plans, interventions, forecasts, feedback, sessions" },
    { title: "Safety Layer", body: "No diagnosis, approval gates, audit trail" },
  ];

  return (
    <PanelShell accent={accent} label="System flow">
      <div style={{ display: "grid", gap: 18, padding: 34 }}>
        {layers.map((layer, index) => {
          const reveal = interpolate(progress, [0.08 + index * 0.08, 0.2 + index * 0.08], [0, 1], {
            ...clamp,
            easing: ease,
          });
          return (
            <div
              key={layer.title}
              style={{
                display: "grid",
                gridTemplateColumns: "230px 1fr",
                alignItems: "center",
                gap: 22,
                opacity: reveal,
                transform: `translateX(${interpolate(reveal, [0, 1], [38, 0], clamp)}px)`,
              }}
            >
              <div
                style={{
                  borderRadius: 8,
                  background: index === 2 ? accent : "#ffffff",
                  color: index === 2 ? "#ffffff" : textColor,
                  padding: "22px 24px",
                  fontSize: 30,
                  lineHeight: 1.08,
                  fontWeight: 850,
                  border: `1px solid ${index === 2 ? accent : border}`,
                  boxShadow: "0 12px 28px rgba(17, 24, 39, 0.08)",
                }}
              >
                {layer.title}
              </div>
              <div
                style={{
                  borderRadius: 8,
                  background: "#ffffff",
                  border: `1px solid ${border}`,
                  padding: "22px 24px",
                  color: "#384252",
                  fontSize: 27,
                  lineHeight: 1.22,
                  fontWeight: 660,
                }}
              >
                {layer.body}
              </div>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
};

const SafetyVisual = ({ accent, progress }: { accent: string; progress: number }) => {
  const boundaries = [
    ["No diagnostic claims", "The system uses observational language and blocks clinical labels."],
    ["No autonomous sending", "Family messages remain drafts until the teacher takes action."],
    ["No surveillance posture", "It supports adult coordination instead of scoring children."],
    ["No hidden data sprawl", "Classroom memory is local-first and classroom-scoped."],
  ];

  return (
    <PanelShell accent={accent} label="Product boundaries">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, padding: 36 }}>
        {boundaries.map(([title, body], index) => {
          const reveal = interpolate(progress, [0.08 + index * 0.08, 0.24 + index * 0.08], [0, 1], {
            ...clamp,
            easing: ease,
          });
          return (
            <div
              key={title}
              style={{
                minHeight: 255,
                borderRadius: 8,
                background: "#ffffff",
                border: `1px solid ${border}`,
                padding: 30,
                opacity: reveal,
                transform: `translateY(${interpolate(reveal, [0, 1], [30, 0], clamp)}px)`,
                boxShadow: "0 18px 44px rgba(17, 24, 39, 0.08)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: accent,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 27,
                  fontWeight: 900,
                }}
              >
                {index + 1}
              </div>
              <h2 style={{ marginTop: 24, marginBottom: 0, color: textColor, fontSize: 34, lineHeight: 1.05 }}>
                {title}
              </h2>
              <p style={{ marginTop: 18, color: mutedText, fontSize: 26, lineHeight: 1.26, fontWeight: 560 }}>
                {body}
              </p>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
};

const ProofVisual = ({ accent, progress }: { accent: string; progress: number }) => {
  const stats = [
    ["13", "model-routed prompt classes"],
    ["12/12", "hosted Gemma proof suite passed"],
    ["42/42", "final baseline evals passing"],
    ["6,298", "requests in reliability evidence"],
  ];
  const routes = ["differentiate", "family message", "EA briefing", "tomorrow plan", "forecast", "support patterns"];

  return (
    <PanelShell accent={accent} label="Evidence snapshot">
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 28, padding: 36 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {stats.map(([number, label], index) => {
            const reveal = interpolate(progress, [0.08 + index * 0.06, 0.22 + index * 0.06], [0, 1], {
              ...clamp,
              easing: ease,
            });
            return (
              <div
                key={label}
                style={{
                  borderRadius: 8,
                  background: "#ffffff",
                  border: `1px solid ${border}`,
                  padding: 27,
                  minHeight: 185,
                  opacity: reveal,
                  transform: `scale(${interpolate(reveal, [0, 1], [0.95, 1], clamp)})`,
                }}
              >
                <div style={{ color: accent, fontSize: 64, lineHeight: 1, fontWeight: 900 }}>{number}</div>
                <div style={{ color: "#384252", fontSize: 25, lineHeight: 1.17, fontWeight: 720, marginTop: 18 }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            borderRadius: 8,
            background: "#111827",
            color: "#ffffff",
            padding: 32,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ color: "#c7d2fe", fontSize: 22, fontWeight: 820, textTransform: "uppercase" }}>
              Dual-speed routing
            </div>
            <h2 style={{ marginTop: 18, marginBottom: 0, fontSize: 43, lineHeight: 1.04 }}>
              Live for speed. Planning for synthesis.
            </h2>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {routes.map((route, index) => {
              const width = interpolate(progress, [0.22 + index * 0.05, 0.46 + index * 0.05], [22, 100], {
                ...clamp,
                easing: ease,
              });
              return (
                <div key={route}>
                  <div style={{ fontSize: 22, fontWeight: 760, marginBottom: 7 }}>{route}</div>
                  <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.18)" }}>
                    <div style={{ width: `${width}%`, height: "100%", borderRadius: 5, background: "#93c5fd" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PanelShell>
  );
};

const PanelShell = ({
  accent,
  label,
  children,
}: {
  accent: string;
  label: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      position: "relative",
      width: "100%",
      height: "100%",
      borderRadius: 8,
      border: `1px solid ${border}`,
      background: "#f8fafc",
      boxShadow: "0 26px 80px rgba(17, 24, 39, 0.16)",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        height: 58,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 24px",
        background: "#ffffff",
        borderBottom: `1px solid ${border}`,
        color: "#56606d",
        fontSize: 18,
        fontWeight: 780,
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: 7, background: accent, display: "block" }} />
      {label}
    </div>
    {children}
  </div>
);

const FinalDeviceShot = ({ accent, progress }: { accent: string; progress: number }) => {
  const mobileY = interpolate(progress, [0.15, 1], [44, -24], clamp);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 34,
          width: 840,
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
            visual: "screenshot",
            accent,
            background: "#fff",
            callouts: [],
          }}
          progress={progress}
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: 62,
          top: 54 + mobileY,
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
      <div
        style={{
          position: "absolute",
          left: 104,
          bottom: 40,
          width: 770,
          borderRadius: 8,
          background: "#111827",
          color: "#ffffff",
          padding: "26px 30px",
          boxShadow: "0 20px 52px rgba(17, 24, 39, 0.22)",
        }}
      >
        <div style={{ color: "#93c5fd", fontSize: 22, fontWeight: 820, textTransform: "uppercase" }}>
          Closing thesis
        </div>
        <div style={{ marginTop: 12, fontSize: 36, lineHeight: 1.14, fontWeight: 850 }}>
          Less coordination drag for teachers. More timely support for students.
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
