import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const SUBMISSION_VIDEO_WIDTH = 1920;
export const SUBMISSION_VIDEO_HEIGHT = 1080;
export const SUBMISSION_VIDEO_FPS = 30;

const sceneSeconds = [12, 14, 15, 16, 18, 16, 16, 13] as const;
const sceneStarts = sceneSeconds.reduce<number[]>((starts, seconds, index) => {
  starts.push(index === 0 ? 0 : starts[index - 1] + sceneSeconds[index - 1] * SUBMISSION_VIDEO_FPS);
  return starts;
}, []);

export const submissionDurationInFrames = sceneSeconds.reduce(
  (total, seconds) => total + seconds * SUBMISSION_VIDEO_FPS,
  0,
);

export type SubmissionVideoProps = {
  voiceover?: "none" | "elevenlabs";
  captions?: boolean;
};

type Scene = {
  eyebrow: string;
  title: string;
  body: string;
  proof: string;
  caption: string;
  image: string;
  visual: "photo" | "screenshot" | "loop" | "proof";
  accent: string;
  bullets: string[];
};

export const submissionNarration = [
  "This is the opening proof: a paper worksheet becomes five usable access routes without the teacher retyping the artifact.",
  "The real problem is coordination. In a synthetic Grade 3/4 room, the day includes language supports, sensory routines, family follow-up, and a morning-only educational assistant.",
  "PrairieClassroom OS organizes that work around four adult jobs: open the day, adapt instruction, prepare tomorrow, and coordinate with adults or families.",
  "Gemma 4 matters because the workflow can read the classroom artifact, transform it quickly, and keep the learning goal intact across different supports.",
  "A quick teacher note becomes structured memory. That memory feeds tomorrow's plan, the EA briefing, the next family message, and the following pattern review.",
  "Safety is practical here. The system can draft a family message, but it cannot send one. The teacher reviews, edits, and approves before anything leaves the classroom.",
  "The proof lane stays honest: proof and claims checks pass, hosted Gemma proof is synthetic-demo only, and the privacy-first local deployment path is separate until the Ollama host is proven.",
  "PrairieClassroom OS is built for the adults carrying inclusive classrooms: less coordination drag, more timely support, and professional judgment still in control.",
];

const scenes: Scene[] = [
  {
    eyebrow: "Opening proof",
    title: "Paper becomes five classroom-ready paths.",
    body: "A worksheet photo turns into readiness-aligned variants while preserving the same instructional goal.",
    proof: "Gemma 4 vision workflow",
    caption: "A worksheet photo becomes five usable access routes without retyping.",
    image: "generated/submission-2026-05-09/01-paper-to-laptop.png",
    visual: "photo",
    accent: "#1f6f55",
    bullets: ["same source artifact", "five access routes", "teacher remains in control"],
  },
  {
    eyebrow: "The real problem",
    title: "Complexity is coordination work.",
    body: "The day is not just lesson delivery. It is remembering supports, sequencing adults, and choosing the next useful move.",
    proof: "26 students, synthetic Grade 3/4 demo",
    caption: "The hard part is coordination: supports, adults, follow-up, and timing.",
    image: "browser-captures/submission-2026-05-11/01-today-live.png",
    visual: "screenshot",
    accent: "#245f9f",
    bullets: ["open loops visible", "teacher and EA workflow", "not a student chatbot"],
  },
  {
    eyebrow: "Product shape",
    title: "Four adult jobs, one classroom memory.",
    body: "Open the day, adapt instruction, prepare tomorrow, and coordinate family or EA follow-through from the same classroom context.",
    proof: "12 workflow tools, 13 model-routed prompt classes",
    caption: "PrairieClassroom organizes the day around four adult jobs.",
    image: "generated/submission-2026-05-09/02-adult-coordination.png",
    visual: "photo",
    accent: "#b96f00",
    bullets: ["today", "prep", "tomorrow", "ops and review"],
  },
  {
    eyebrow: "Adapt instruction",
    title: "One lesson, multiple workable routes.",
    body: "The differentiation surface makes supports visible: core work, language scaffolds, chunked access, extension, and EA small-group paths.",
    proof: "same goal, different access routes",
    caption: "One learning goal stays intact while the access routes change.",
    image: "screenshots/08b-differentiate-generated-full.png",
    visual: "screenshot",
    accent: "#245f9f",
    bullets: ["core", "EAL support", "chunked path", "extension"],
  },
  {
    eyebrow: "Closed loop",
    title: "Notes become tomorrow's plan.",
    body: "A quick intervention log becomes structured memory, then informs planning, EA coordination, family follow-up, and the next pattern report.",
    proof: "memory to plan to action",
    caption: "A quick note becomes memory, then tomorrow's plan, message, and review.",
    image: "generated/submission-2026-05-11/06-memory-loop-tabletop.png",
    visual: "loop",
    accent: "#1f6f55",
    bullets: ["log", "retrieve", "plan", "coordinate", "review"],
  },
  {
    eyebrow: "Safety boundary",
    title: "The copilot drafts. The teacher decides.",
    body: "Family communication is useful only when bounded. PrairieClassroom keeps approval gates permanent and visible.",
    proof: "no autonomous family sends",
    caption: "The copilot can draft. The teacher reviews, edits, and approves.",
    image: "generated/submission-2026-05-11/05-human-approval-desk.png",
    visual: "photo",
    accent: "#ba3f36",
    bullets: ["draft only", "teacher review", "school channel decides"],
  },
  {
    eyebrow: "Proof boundary",
    title: "The claim is strong because it is specific.",
    body: "Hosted Gemma proof is synthetic-demo evidence. The privacy-first local lane remains separate until the Ollama host is proven.",
    proof: "proof and claims checks passing",
    caption: "The claim stays specific: synthetic-demo proof today, local proof only when captured.",
    image: "generated/submission-2026-05-09/03-local-privacy.png",
    visual: "proof",
    accent: "#10253d",
    bullets: ["hosted proof: synthetic only", "Ollama path: not overclaimed", "claims ledger governs copy"],
  },
  {
    eyebrow: "Close",
    title: "Built for the adults carrying the room.",
    body: "PrairieClassroom OS reduces coordination load while preserving privacy, professional judgment, and practical next actions.",
    proof: "Final submission cut",
    caption: "Less coordination drag, more timely support, teacher judgment still in control.",
    image: "generated/submission-2026-05-11/07-product-lockup-devices.png",
    visual: "photo",
    accent: "#1f6f55",
    bullets: ["less coordination drag", "more timely support", "teacher control"],
  },
];

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const dark = "#0c1f35";
const ink = "#10253d";
const muted = "#526272";
const surface = "#f8fafc";
const line = "#d9e1ea";
const audioDirectory = "audio/submission-2026-05-11";

const fadeForScene = (frame: number, start: number, duration: number, isFirst: boolean, isLast: boolean) => {
  const fade = 20;
  const end = start + duration;
  const enter = isFirst
    ? 1
    : interpolate(frame, [start, start + fade], [0, 1], { ...clamp, easing: ease });
  const exit = isLast
    ? 1
    : interpolate(frame, [end - fade, end], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) });
  return Math.min(enter, exit);
};

const sceneProgress = (frame: number, duration: number) =>
  interpolate(frame, [0, duration], [0, 1], clamp);

export const SubmissionVideo = ({ voiceover = "none", captions = true }: SubmissionVideoProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: surface, fontFamily: "Instrument Sans, Inter, system-ui, sans-serif" }}>
      <FontFaces />
      {voiceover === "elevenlabs" ? <SegmentedVoiceover /> : null}
      {scenes.map((scene, index) => {
        const start = sceneStarts[index];
        const duration = sceneSeconds[index] * fps;
        const opacity = fadeForScene(frame, start, duration, index === 0, index === scenes.length - 1);
        return (
          <AbsoluteFill key={scene.title} style={{ opacity }}>
            <SubmissionScene
              scene={scene}
              index={index}
              frame={frame - start}
              duration={duration}
              captions={captions}
            />
          </AbsoluteFill>
        );
      })}
      <ProgressRail frame={frame} />
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
        font-weight: 500 800;
      }
    `}
  </style>
);

const SubmissionScene = ({
  scene,
  index,
  frame,
  duration,
  captions,
}: {
  scene: Scene;
  index: number;
  frame: number;
  duration: number;
  captions: boolean;
}) => {
  const enter = interpolate(frame, [0, 28], [0, 1], { ...clamp, easing: ease });
  const progress = sceneProgress(frame, duration);
  const textY = interpolate(enter, [0, 1], [28, 0], clamp);
  const imageScale = interpolate(progress, [0, 1], [1.015, 1.065], clamp);
  const imageX = interpolate(progress, [0, 1], [0, scene.visual === "photo" ? -18 : -6], clamp);

  return (
    <AbsoluteFill style={{ color: ink, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: scene.visual === "proof" ? "#091725" : surface,
        }}
      />
      <Visual scene={scene} scale={imageScale} x={imageX} progress={progress} />
      <div
        style={{
          position: "absolute",
          left: 86,
          top: 78,
          width: 690,
          transform: `translateY(${textY}px)`,
          opacity: enter,
        }}
      >
        <Eyebrow scene={scene} index={index} />
        <h1
          style={{
            margin: "32px 0 0",
            color: scene.visual === "proof" ? "#f7fbff" : ink,
            fontSize: 74,
            lineHeight: 0.98,
            fontWeight: 780,
            letterSpacing: 0,
          }}
        >
          {scene.title}
        </h1>
        <p
          style={{
            margin: "28px 0 0",
            color: scene.visual === "proof" ? "#c9d7e5" : muted,
            fontSize: 31,
            lineHeight: 1.3,
            fontWeight: 520,
            letterSpacing: 0,
          }}
        >
          {scene.body}
        </p>
        <ProofPill proof={scene.proof} accent={scene.accent} proofMode={scene.visual === "proof"} />
        <BulletGrid bullets={scene.bullets} accent={scene.accent} progress={progress} proofMode={scene.visual === "proof"} />
      </div>
      {captions ? <CaptionOverlay scene={scene} frame={frame} duration={duration} /> : null}
      <SceneNumber index={index} accent={scene.accent} proofMode={scene.visual === "proof"} />
    </AbsoluteFill>
  );
};

const SegmentedVoiceover = () => (
  <>
    {scenes.map((scene, index) => {
      const duration = sceneSeconds[index] * SUBMISSION_VIDEO_FPS;
      return (
        <Sequence key={scene.title} from={sceneStarts[index]} durationInFrames={duration}>
          <Audio
            name={`Narration ${String(index + 1).padStart(2, "0")}`}
            src={staticFile(`${audioDirectory}/scene-${String(index + 1).padStart(2, "0")}.mp3`)}
            volume={(audioFrame) =>
              interpolate(audioFrame, [0, 10, Math.max(11, duration - 14), duration], [0, 1, 1, 0], clamp)
            }
          />
        </Sequence>
      );
    })}
  </>
);

const Visual = ({
  scene,
  scale,
  x,
  progress,
}: {
  scene: Scene;
  scale: number;
  x: number;
  progress: number;
}) => {
  if (scene.visual === "photo" || scene.visual === "proof") {
    return (
      <>
        <Img
          src={staticFile(scene.image)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `translateX(${x}px) scale(${scale})`,
            opacity: scene.visual === "proof" ? 0.82 : 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              scene.visual === "proof"
                ? "linear-gradient(90deg, rgba(7,18,32,0.95) 0%, rgba(7,18,32,0.82) 42%, rgba(7,18,32,0.2) 100%)"
                : "linear-gradient(90deg, rgba(248,250,252,0.96) 0%, rgba(248,250,252,0.86) 36%, rgba(248,250,252,0.08) 82%)",
          }}
        />
      </>
    );
  }

  if (scene.visual === "loop") {
    return (
      <div style={{ position: "absolute", left: 760, top: 104, width: 1040, height: 780 }}>
        <Img
          src={staticFile(scene.image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            border: `1px solid ${line}`,
            borderRadius: 8,
            transform: `scale(${scale})`,
          }}
        />
        <LoopLabels progress={progress} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 820,
        top: 76,
        width: 1008,
        height: 840,
        border: `1px solid ${line}`,
        borderRadius: 8,
        overflow: "hidden",
        background: "#0f1721",
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 18px",
          background: "#fff",
          borderBottom: `1px solid ${line}`,
        }}
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            style={{
              width: 13,
              height: 13,
              borderRadius: 8,
              background: dot === 0 ? scene.accent : "#cdd6e1",
            }}
          />
        ))}
        <span style={{ color: "#5a6674", fontSize: 17, fontWeight: 700 }}>
          demo classroom
        </span>
      </div>
      <Img
        src={staticFile(scene.image)}
        style={{
          width: "100%",
          height: "calc(100% - 52px)",
          objectFit: scene.image.includes("20-mobile") ? "contain" : "cover",
          background: "#0f1721",
        }}
      />
    </div>
  );
};

const Eyebrow = ({ scene, index }: { scene: Scene; index: number }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      border: `1px solid ${scene.visual === "proof" ? "rgba(255,255,255,0.22)" : line}`,
      background: scene.visual === "proof" ? "rgba(9,23,37,0.7)" : "rgba(255,255,255,0.86)",
      borderRadius: 8,
      color: scene.visual === "proof" ? "#eaf3ff" : scene.accent,
      fontSize: 21,
      fontWeight: 780,
      letterSpacing: 0,
      textTransform: "uppercase",
    }}
  >
    <span style={{ fontFamily: "JetBrains Mono", color: scene.accent }}>
      {String(index + 1).padStart(2, "0")}
    </span>
    {scene.eyebrow}
  </div>
);

const ProofPill = ({
  proof,
  accent,
  proofMode,
}: {
  proof: string;
  accent: string;
  proofMode: boolean;
}) => (
  <div
    style={{
      marginTop: 32,
      display: "inline-flex",
      alignItems: "center",
      padding: "15px 18px",
      borderLeft: `7px solid ${accent}`,
      borderRadius: 8,
      background: proofMode ? "rgba(255,255,255,0.1)" : "#ffffff",
      color: proofMode ? "#f7fbff" : dark,
      fontSize: 25,
      lineHeight: 1.15,
      fontWeight: 760,
      boxShadow: proofMode ? "none" : "0 10px 30px rgba(16, 37, 61, 0.08)",
    }}
  >
    {proof}
  </div>
);

const BulletGrid = ({
  bullets,
  accent,
  progress,
  proofMode,
}: {
  bullets: string[];
  accent: string;
  progress: number;
  proofMode: boolean;
}) => (
  <div style={{ display: "grid", gap: 11, marginTop: 28 }}>
    {bullets.map((bullet, index) => {
      const reveal = interpolate(progress, [0.13 + index * 0.06, 0.27 + index * 0.06], [0, 1], {
        ...clamp,
        easing: ease,
      });
      return (
        <div
          key={bullet}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: reveal,
            transform: `translateY(${interpolate(reveal, [0, 1], [14, 0], clamp)}px)`,
            color: proofMode ? "#d7e5f3" : "#27374a",
            fontSize: 24,
            lineHeight: 1.16,
            fontWeight: 680,
          }}
        >
          <span
            style={{
              width: 19,
              height: 19,
              borderRadius: 5,
              background: index === 0 ? accent : "transparent",
              border: `2px solid ${accent}`,
              display: "block",
            }}
          />
          <span>{bullet}</span>
        </div>
      );
    })}
  </div>
);

const LoopLabels = ({ progress }: { progress: number }) => {
  const labels = [
    { text: "note", left: 90, top: 250 },
    { text: "memory", left: 470, top: 112 },
    { text: "plan", left: 770, top: 248 },
    { text: "approve", left: 524, top: 604 },
    { text: "action", left: 110, top: 602 },
  ];
  return (
    <>
      {labels.map((label, index) => {
        const reveal = interpolate(progress, [0.14 + index * 0.08, 0.26 + index * 0.08], [0, 1], {
          ...clamp,
          easing: ease,
        });
        return (
          <div
            key={label.text}
            style={{
              position: "absolute",
              left: label.left,
              top: label.top,
              padding: "10px 13px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.9)",
              border: `1px solid ${line}`,
              color: dark,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 0,
              textTransform: "uppercase",
              opacity: reveal,
              transform: `translateY(${interpolate(reveal, [0, 1], [10, 0], clamp)}px)`,
            }}
          >
            {label.text}
          </div>
        );
      })}
    </>
  );
};

const CaptionOverlay = ({
  scene,
  frame,
  duration,
}: {
  scene: Scene;
  frame: number;
  duration: number;
}) => {
  const reveal = interpolate(frame, [18, 38, Math.max(39, duration - 32), duration - 12], [0, 1, 1, 0], {
    ...clamp,
    easing: ease,
  });
  const proofMode = scene.visual === "proof";
  return (
    <div
      style={{
        position: "absolute",
        right: 86,
        bottom: 78,
        width: 830,
        minHeight: 78,
        padding: "20px 23px",
        borderRadius: 8,
        border: `1px solid ${proofMode ? "rgba(255,255,255,0.2)" : "rgba(16,37,61,0.14)"}`,
        background: proofMode ? "rgba(5,16,28,0.78)" : "rgba(255,255,255,0.92)",
        color: proofMode ? "#f7fbff" : ink,
        boxShadow: proofMode ? "0 18px 50px rgba(0,0,0,0.22)" : "0 18px 55px rgba(16,37,61,0.13)",
        opacity: reveal,
        transform: `translateY(${interpolate(reveal, [0, 1], [16, 0], clamp)}px)`,
      }}
    >
      <div
        style={{
          fontSize: 32,
          lineHeight: 1.16,
          fontWeight: 760,
          letterSpacing: 0,
        }}
      >
        {scene.caption}
      </div>
    </div>
  );
};

const SceneNumber = ({
  index,
  accent,
  proofMode,
}: {
  index: number;
  accent: string;
  proofMode: boolean;
}) => (
  <div
    style={{
      position: "absolute",
      left: 86,
      bottom: 62,
      display: "flex",
      alignItems: "center",
      gap: 15,
      color: proofMode ? "#b8c8d9" : "#526272",
      fontSize: 20,
      fontWeight: 760,
    }}
  >
    <span style={{ fontFamily: "JetBrains Mono" }}>{String(index + 1).padStart(2, "0")}</span>
    <span style={{ width: 76, height: 2, background: accent, display: "block" }} />
    <span>PrairieClassroom OS submission cut</span>
  </div>
);

const ProgressRail = ({ frame }: { frame: number }) => {
  const progress = interpolate(frame, [0, submissionDurationInFrames], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 86,
        right: 86,
        bottom: 32,
        height: 4,
        background: "rgba(16,37,61,0.12)",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: "#1f6f55",
        }}
      />
    </div>
  );
};

export const submissionStoryBeats = scenes.map((scene, index) => ({
  index: index + 1,
  seconds: sceneSeconds[index],
  title: scene.title,
  proof: scene.proof,
  caption: scene.caption,
  narration: submissionNarration[index],
}));
