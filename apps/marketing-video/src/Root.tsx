import { Composition } from "remotion";
import { MarketingVideo, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH, durationInFrames } from "./MarketingVideo";
import {
  NothingLaunchVideo,
  NOTHING_VIDEO_FPS,
  NOTHING_VIDEO_HEIGHT,
  NOTHING_VIDEO_WIDTH,
  nothingDurationInFrames,
} from "./NothingLaunchVideo";

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
  </>
);
