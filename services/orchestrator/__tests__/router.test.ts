// services/orchestrator/__tests__/router.test.ts
import { describe, it, expect } from "vitest";
import {
  getRoute,
  getModelId,
  listPromptClasses,
  getRoutingTable,
} from "../router.js";
import type { PromptClass } from "../types.js";

const ALL_PROMPT_CLASSES: PromptClass[] = [
  "differentiate_material",
  "prepare_tomorrow_plan",
  "draft_family_message",
  "log_intervention",
  "simplify_for_student",
  "generate_vocab_cards",
  "detect_support_patterns",
  "generate_ea_briefing",
  "forecast_complexity",
  "detect_scaffold_decay",
  "generate_survival_packet",
  "extract_worksheet",
];

const PLANNING_TIER_CLASSES: PromptClass[] = [
  "prepare_tomorrow_plan",
  "detect_support_patterns",
  "forecast_complexity",
  "detect_scaffold_decay",
  "generate_survival_packet",
];

const LIVE_TIER_CLASSES: PromptClass[] = [
  "differentiate_material",
  "draft_family_message",
  "log_intervention",
  "simplify_for_student",
  "generate_vocab_cards",
  "generate_ea_briefing",
  "extract_worksheet",
];

const RETRIEVAL_REQUIRED_CLASSES: PromptClass[] = [
  "prepare_tomorrow_plan",
  "detect_support_patterns",
  "generate_ea_briefing",
  "forecast_complexity",
  "detect_scaffold_decay",
  "generate_survival_packet",
];

describe("getRoute", () => {
  it.each(ALL_PROMPT_CLASSES)(
    "returns a valid RouteConfig for %s",
    (promptClass) => {
      const route = getRoute(promptClass);
      expect(route).toBeDefined();
      expect(route.prompt_class).toBe(promptClass);
      expect(route.output_schema_version).toBe("0.1.0");
    },
  );

  it("throws for an unknown prompt class", () => {
    expect(() => getRoute("nonexistent" as PromptClass)).toThrow(
      "Unknown prompt class",
    );
  });
});

describe("model tier assignments", () => {
  it.each(PLANNING_TIER_CLASSES)(
    "%s uses planning tier with thinking enabled",
    (promptClass) => {
      const route = getRoute(promptClass);
      expect(route.model_tier).toBe("planning");
      expect(route.thinking_enabled).toBe(true);
    },
  );

  it.each(LIVE_TIER_CLASSES)(
    "%s uses live tier with thinking disabled",
    (promptClass) => {
      const route = getRoute(promptClass);
      expect(route.model_tier).toBe("live");
      expect(route.thinking_enabled).toBe(false);
    },
  );
});

describe("retrieval requirements", () => {
  it.each(RETRIEVAL_REQUIRED_CLASSES)(
    "%s requires retrieval",
    (promptClass) => {
      const route = getRoute(promptClass);
      expect(route.retrieval_required).toBe(true);
    },
  );

  const nonRetrievalClasses = ALL_PROMPT_CLASSES.filter(
    (c) => !RETRIEVAL_REQUIRED_CLASSES.includes(c),
  );

  it.each(nonRetrievalClasses)(
    "%s does not require retrieval",
    (promptClass) => {
      const route = getRoute(promptClass);
      expect(route.retrieval_required).toBe(false);
    },
  );
});

describe("tool_call_capable", () => {
  const TOOL_CAPABLE_CLASSES: PromptClass[] = [
    "differentiate_material",
    "prepare_tomorrow_plan",
  ];

  it.each(TOOL_CAPABLE_CLASSES)(
    "%s is tool_call_capable",
    (promptClass) => {
      const route = getRoute(promptClass);
      expect(route.tool_call_capable).toBe(true);
    },
  );

  const nonToolClasses = ALL_PROMPT_CLASSES.filter(
    (c) => !TOOL_CAPABLE_CLASSES.includes(c),
  );

  it.each(nonToolClasses)(
    "%s is not tool_call_capable",
    (promptClass) => {
      const route = getRoute(promptClass);
      expect(route.tool_call_capable).toBe(false);
    },
  );
});

describe("getModelId", () => {
  it("returns correct model ID for live tier", () => {
    expect(getModelId("live")).toBe("google/gemma-4-4b-it");
  });

  it("returns correct model ID for planning tier", () => {
    expect(getModelId("planning")).toBe("google/gemma-4-27b-it");
  });

  it("throws for an unknown tier", () => {
    expect(() => getModelId("unknown" as any)).toThrow("Unknown model tier");
  });
});

describe("listPromptClasses", () => {
  it("returns all 12 prompt classes", () => {
    const classes = listPromptClasses();
    expect(classes).toHaveLength(12);
    for (const pc of ALL_PROMPT_CLASSES) {
      expect(classes).toContain(pc);
    }
  });
});

describe("getRoutingTable", () => {
  it("returns a copy that does not affect internal state", () => {
    const table = getRoutingTable();
    (table as any).fake_class = { prompt_class: "fake" };
    const fresh = getRoutingTable();
    expect((fresh as any).fake_class).toBeUndefined();
  });
});
