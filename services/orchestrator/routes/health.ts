import { Router } from "express";
import type { RouteDeps } from "../route-deps.js";

export function createHealthRouter(deps: RouteDeps): Router {
  const router = Router();

  async function buildHealthPayload() {
    let ready = false;

    try {
      const inferenceResp = await fetch(`${deps.inferenceUrl}/health`);
      if (inferenceResp.ok) {
        const inferenceData = (await inferenceResp.json()) as { status?: string };
        ready = inferenceData.status === "ok";
      }
    } catch {
      ready = false;
    }

    return {
      status: ready ? "ok" : "degraded",
      inference_url: deps.inferenceUrl,
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
