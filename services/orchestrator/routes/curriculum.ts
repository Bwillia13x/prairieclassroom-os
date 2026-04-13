import { Router } from "express";
import {
  getCurriculumEntry,
  listCurriculumEntries,
  listCurriculumSubjects,
} from "../curriculum-registry.js";
import { sendRouteError } from "../errors.js";

export function createCurriculumRouter(): Router {
  const router = Router();

  router.get("/subjects", (_req, res) => {
    res.json({ subjects: listCurriculumSubjects() });
  });

  router.get("/entries", (req, res) => {
    const subjectCode =
      typeof req.query.subject === "string" && req.query.subject.trim()
        ? req.query.subject.trim()
        : undefined;
    const grade =
      typeof req.query.grade === "string" && req.query.grade.trim()
        ? req.query.grade.trim()
        : undefined;

    res.json({
      entries: listCurriculumEntries({ subjectCode, grade }),
    });
  });

  router.get("/entries/:entryId", (req, res) => {
    const entry = getCurriculumEntry(req.params.entryId);
    if (!entry) {
      sendRouteError(res, 404, {
        error: `Curriculum entry '${req.params.entryId}' not found`,
        category: "validation",
        retryable: false,
        detail_code: "curriculum_entry_not_found",
      });
      return;
    }

    res.json({ entry });
  });

  return router;
}
