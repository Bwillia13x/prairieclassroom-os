import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const testRateLimitsDisabled =
  process.env.PRAIRIE_TEST_DISABLE_RATE_LIMITS === "true" &&
  process.env.NODE_ENV !== "production";

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 200,
  skip: () => testRateLimitsDisabled,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later.", category: "rate_limit", retryable: true },
});

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  skip: () => testRateLimitsDisabled,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many authentication attempts. Please wait before trying again.", category: "rate_limit", retryable: true },
  keyGenerator: (req) => {
    // Rate limit by IP + classroom ID to scope correctly
    const classroomId = req.body?.classroom_id ?? req.params?.classroomId ?? req.params?.id ?? "unknown";
    return `${ipKeyGenerator(req.ip ?? "unknown")}:${classroomId}`;
  },
});
