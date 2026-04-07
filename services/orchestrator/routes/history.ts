import { Router } from "express";
import { getRecentPlans, getRecentMessages, getRecentInterventions, getRecentPatternReports } from "../../memory/retrieve.js";
import type { RouteDeps } from "../route-deps.js";

export function createHistoryRouter(deps: RouteDeps): Router {
  const router = Router();

  router.get("/:id/plans", (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const plans = getRecentPlans(req.params.id, limit);
      res.json({ plans });
    } catch (err) {
      console.error("Plans history error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  router.get("/:id/messages", (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const messages = getRecentMessages(req.params.id, limit);
      res.json({ messages });
    } catch (err) {
      console.error("Messages history error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  router.get("/:id/interventions", (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const interventions = getRecentInterventions(req.params.id, limit);
      res.json({ interventions });
    } catch (err) {
      console.error("Interventions history error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  router.get("/:id/patterns", (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
      const patterns = getRecentPatternReports(req.params.id, limit);
      res.json({ patterns });
    } catch (err) {
      console.error("Patterns history error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  return router;
}
