import { Router } from "express";
import type { RouteDeps } from "../route-deps.js";

export function createHealthRouter(deps: RouteDeps): Router {
  const router = Router();

  async function buildHealthPayload() {
    let ready = false;
    let inferenceProvider = (process.env.PRAIRIE_INFERENCE_PROVIDER ?? "mock").trim() || "mock";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const inferenceResp = await fetch(`${deps.inferenceUrl}/health`, { signal: controller.signal });
      if (inferenceResp.ok) {
        const inferenceData = (await inferenceResp.json()) as { status?: string; mode?: string };
        ready = inferenceData.status === "ok";
        inferenceProvider = inferenceData.mode?.trim() || inferenceProvider;
      }
    } catch {
      ready = false;
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: ready ? "ok" : "degraded",
      inference_url: deps.inferenceUrl,
      inference_provider: inferenceProvider,
      ready,
    };
  }

  router.get("/health", async (_req, res) => {
    res.json(await buildHealthPayload());
  });

  router.get("/api/health", async (_req, res) => {
    res.json(await buildHealthPayload());
  });

  return router;
}
