import type { Request, Response, NextFunction } from "express";

// Patterns that attempt to override system instructions
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /disregard\s+(all\s+)?prior/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /\bprompt\s*injection\b/i,
];

function sanitizeString(value: string): string {
  let sanitized = value;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }
  return sanitized;
}

// Fields that contain teacher free-text
const TEXT_FIELDS = [
  "teacher_reflection",
  "teacher_goal",
  "teacher_note",
  "context",
  "raw_text",
  "source_text",
  "teacher_notes",
];

export function inputSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    for (const field of TEXT_FIELDS) {
      if (typeof req.body[field] === "string") {
        req.body[field] = sanitizeString(req.body[field]);
      }
    }
  }
  next();
}
