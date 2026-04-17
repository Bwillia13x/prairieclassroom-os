import { Composition } from "remotion";
import { MarketingVideo, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH, durationInFrames } from "./MarketingVideo";

export const RemotionRoot = () => (
  <Composition
    id="PrairieClassroomMarketing"
    component={MarketingVideo}
    durationInFrames={durationInFrames}
    fps={VIDEO_FPS}
    width={VIDEO_WIDTH}
    height={VIDEO_HEIGHT}
  />
);
