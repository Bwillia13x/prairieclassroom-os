import { Composition } from "remotion";
import { MarketingVideo, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH, durationInFrames } from "./MarketingVideo";
import {
  NothingLaunchVideo,
  NOTHING_VIDEO_FPS,
  NOTHING_VIDEO_HEIGHT,
  NOTHING_VIDEO_WIDTH,
  nothingDurationInFrames,
} from "./NothingLaunchVideo";
import {
  SUBMISSION_VIDEO_FPS,
  SUBMISSION_VIDEO_HEIGHT,
  SUBMISSION_VIDEO_WIDTH,
  SubmissionVideo,
  submissionDurationInFrames,
} from "./SubmissionVideo";
import {
  CLASSROOM_FULL_VIDEO_FPS,
  CLASSROOM_FULL_VIDEO_HEIGHT,
  CLASSROOM_FULL_VIDEO_WIDTH,
  ClassroomFullVideo,
  classroomFullDurationInFrames,
} from "./ClassroomFullVideo";

export const RemotionRoot = () => (
  <>
    <Composition
      id="PrairieClassroomMarketing"
      component={MarketingVideo}
      durationInFrames={durationInFrames}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="PrairieClassroomNothingLaunch"
      component={NothingLaunchVideo}
      durationInFrames={nothingDurationInFrames}
      fps={NOTHING_VIDEO_FPS}
      width={NOTHING_VIDEO_WIDTH}
      height={NOTHING_VIDEO_HEIGHT}
    />
    <Composition
      id="PrairieClassroomSubmission"
      component={SubmissionVideo}
      durationInFrames={submissionDurationInFrames}
      fps={SUBMISSION_VIDEO_FPS}
      width={SUBMISSION_VIDEO_WIDTH}
      height={SUBMISSION_VIDEO_HEIGHT}
      defaultProps={{
        voiceover: "none",
        captions: true,
      }}
    />
    <Composition
      id="PrairieClassroomClassroomFull"
      component={ClassroomFullVideo}
      durationInFrames={classroomFullDurationInFrames}
      fps={CLASSROOM_FULL_VIDEO_FPS}
      width={CLASSROOM_FULL_VIDEO_WIDTH}
      height={CLASSROOM_FULL_VIDEO_HEIGHT}
    />
  </>
);
