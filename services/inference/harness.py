"""
PrairieClassroom OS — Gemma 4 Inference Harness

Provides model loading and generation for the dual-speed architecture:
- Live route:     gemma-4-4b-it (small, low-latency classroom actions)
- Planning route: gemma-4-27b-it (deeper reasoning, next-day planning)

Supports three modes:
1. mock   — returns canned responses for development without GPU
2. api    — calls a remote Gemma API endpoint (Vertex AI, etc.)
3. local  — loads model weights locally via transformers

Usage:
    python harness.py --mode mock --smoke-test
    python harness.py --mode local --model-id google/gemma-4-4b-it --smoke-test
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class InferenceMode(Enum):
    MOCK = "mock"
    API = "api"
    LOCAL = "local"


class ModelTier(Enum):
    LIVE = "live"       # small Gemma 4 for fast classroom actions
    PLANNING = "planning"  # larger Gemma 4 for synthesis/planning


@dataclass
class GenerationRequest:
    """A single generation request to the harness."""
    prompt: str
    images: list[str] = field(default_factory=list)  # file paths
    thinking: bool = False
    tools: list[dict[str, Any]] | None = None
    model_tier: ModelTier = ModelTier.LIVE
    max_tokens: int = 2048
    prompt_class: str | None = None


@dataclass
class GenerationResponse:
    """Response from the harness."""
    text: str
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    thinking_text: str | None = None
    model_id: str = ""
    latency_ms: float = 0.0


# ---------------------------------------------------------------------------
# Mock backend — returns canned responses for development
# ---------------------------------------------------------------------------

MOCK_DIFFERENTIATION = json.dumps([
    {
        "variant_type": "core",
        "title": "Core Version",
        "student_facing_instructions": "Read the passage carefully. Answer the three questions in full sentences. Use details from the text to support each answer.",
        "teacher_notes": "Standard version for on-level readers. Monitor for comprehension during independent work.",
        "required_materials": ["passage handout", "pencil"],
        "estimated_minutes": 20,
    },
    {
        "variant_type": "eal_supported",
        "title": "EAL Supported Version",
        "student_facing_instructions": "Look at the pictures first. Read each paragraph slowly. Use the word bank to help you. Answer each question with a sentence starter provided below.",
        "teacher_notes": "Pre-teach key vocabulary. Pair with a peer buddy. Sentence starters reduce language burden while keeping the cognitive task intact.",
        "required_materials": ["passage handout", "word bank sheet", "sentence starters", "pencil"],
        "estimated_minutes": 25,
    },
    {
        "variant_type": "chunked",
        "title": "Chunked Step-by-Step Version",
        "student_facing_instructions": "Step 1: Read paragraph 1. Tell your neighbour one thing you learned. Step 2: Read paragraph 2. Underline one important word. Step 3: Read paragraph 3. Step 4: Answer question 1. Step 5: Answer question 2. Step 6: Answer question 3.",
        "teacher_notes": "Check in after Step 3 to confirm understanding. Pacing checkpoints help students who lose focus on longer tasks.",
        "required_materials": ["passage handout", "pencil", "highlighter"],
        "estimated_minutes": 25,
    },
    {
        "variant_type": "ea_small_group",
        "title": "EA Small Group Version",
        "student_facing_instructions": "We will read together as a group. After each paragraph, we will talk about what we read. Then you will answer the questions with help from the EA.",
        "teacher_notes": "EA reads aloud, pauses for discussion after each paragraph. Students answer orally first, then write. Keep group to 3–5 students. Suggested timing: 10 min reading, 10 min discussion, 10 min writing.",
        "required_materials": ["passage handout", "pencil", "whiteboard for group notes"],
        "estimated_minutes": 30,
    },
    {
        "variant_type": "extension",
        "title": "Extension Challenge Version",
        "student_facing_instructions": "Read the passage and answer all three questions. Then choose one: (A) Write a fourth question that would make a reader think more deeply. (B) Write a short paragraph comparing this topic to something you know.",
        "teacher_notes": "For strong readers who finish early. The extension maintains engagement without busy-work. Can be shared in whole-class debrief.",
        "required_materials": ["passage handout", "pencil", "lined paper"],
        "estimated_minutes": 20,
    },
])

MOCK_TOMORROW_PLAN = json.dumps({
    "transition_watchpoints": [
        {
            "time_or_activity": "After lunch — returning to classroom",
            "risk_description": "Mika often struggles with attention during the post-lunch transition. Historical pattern of off-task behaviour during unstructured re-entry.",
            "suggested_mitigation": "Give Mika advance notice 2 minutes before transition. Use the clear step checklist posted on their desk. Assign a specific seat-entry task (distribute handouts)."
        },
        {
            "time_or_activity": "Switching from reading to writing task",
            "risk_description": "Ari may lose engagement when shifting from supported reading to independent writing. Language load increases significantly.",
            "suggested_mitigation": "Pre-teach 3 key vocabulary words before the writing segment. Provide sentence starters on a card. Pair with peer buddy for first 5 minutes."
        }
    ],
    "support_priorities": [
        {
            "student_ref": "Ari",
            "reason": "EAL learner — tomorrow's writing task has high language demand. Simplified instructions and visual supports needed.",
            "suggested_action": "Prepare sentence starters and word bank. Seat near peer buddy. EA check-in at minute 5 of writing time."
        },
        {
            "student_ref": "Mika",
            "reason": "Needs pre-correction before transitions. Yesterday's note indicates increased restlessness after lunch.",
            "suggested_action": "Brief 1:1 check-in before lunch dismissal. Provide advance notice of afternoon expectations. Use step checklist."
        },
        {
            "student_ref": "Jae",
            "reason": "Strong reader — may finish core task early. Needs extension to stay engaged without disrupting others.",
            "suggested_action": "Have extension menu ready. Offer choice: write a deeper question about the topic OR compare to a personal connection."
        }
    ],
    "ea_actions": [
        {
            "description": "Run small-group reading support with Ari and 2 other EAL students during independent reading block.",
            "student_refs": ["Ari"],
            "timing": "10:00–10:20 (reading block)"
        },
        {
            "description": "Monitor Mika during post-lunch transition. Redirect with step checklist if needed.",
            "student_refs": ["Mika"],
            "timing": "12:45–13:00 (after lunch re-entry)"
        },
        {
            "description": "Check in on writing progress for small group. Scribe support if needed for students with fine motor needs.",
            "student_refs": ["Ari"],
            "timing": "13:15–13:35 (writing block)"
        }
    ],
    "prep_checklist": [
        "Print sentence starters and word bank for EAL writing support",
        "Prepare extension menu cards (2 options) for Jae and early finishers",
        "Post afternoon schedule on board before lunch",
        "Prepare step checklist cards for Mika's desk",
        "Brief EA on small-group reading plan and post-lunch monitoring role"
    ],
    "family_followups": [
        {
            "student_ref": "Ari",
            "reason": "Positive progress on reading comprehension this week — worth a praise note to family.",
            "message_type": "praise"
        }
    ]
})

MOCK_TOMORROW_THINKING = (
    "Let me think about tomorrow's plan step by step.\n\n"
    "First, I need to consider the classroom routines — after lunch is a known fragile point.\n"
    "Mika's support tags include attention during transitions and benefits from pre-correction.\n"
    "Ari is an EAL learner who needs simplified language and visual examples.\n"
    "Jae is a strong reader who needs extension tasks to stay engaged.\n\n"
    "For transitions: The post-lunch return and the reading-to-writing shift are the two highest-risk moments.\n"
    "For support priorities: Ari's writing task tomorrow has high language demand. Mika needs proactive transition support. Jae needs extension.\n"
    "For EA deployment: Small-group reading, then transition monitoring, then writing support.\n"
    "Prep: sentence starters, extension menus, schedule posting, step checklists, EA briefing."
)

MOCK_FAMILY_MESSAGE = json.dumps({
    "student_refs": ["Ari"],
    "message_type": "praise",
    "target_language": "en",
    "plain_language_text": "Hi! I wanted to share some good news about your child's progress this week. Ari has been showing real improvement in reading comprehension — during our guided reading session today, they were able to identify the main idea of a passage and explain it in their own words. This is a meaningful step forward. We will keep building on this with sentence starters and paired examples that have been working well. Thank you for your support at home!",
    "simplified_student_text": "Great job this week! You did really well finding the main idea when we read together. Keep it up!"
})

MOCK_INTERVENTION = json.dumps({
    "observation": "Ari needed 1:1 support during the writing block. Had difficulty starting the first sentence and appeared frustrated when looking at the blank page.",
    "action_taken": "Used sentence starters and word bank from the EAL support kit. Modelled the first sentence together, then had Ari try the second independently.",
    "outcome": "Completed 3 of 5 questions independently by end of period. Showed more confidence after the first modelled sentence.",
    "follow_up_needed": True
})

MOCK_SIMPLIFICATION = json.dumps({
    "simplified_text": "Read the story. It is about community helpers. Community helpers are people who help us. Read each part slowly. Answer the three questions. Use your own words. You can look back at the story to find answers.",
    "key_vocabulary": ["community", "helpers", "paragraph", "details", "support", "respond"],
    "visual_cue_suggestions": [
        "Picture of people helping in a neighbourhood (firefighter, teacher, nurse)",
        "Arrow icon pointing from question back to passage (showing students to look back)",
        "Numbered steps icon (1, 2, 3) showing the order to complete work",
        "Word bank card icon with key terms listed"
    ]
})

MOCK_VOCAB_CARDS = json.dumps({
    "cards": [
        {
            "term": "community",
            "definition": "A group of people who live or work in the same area.",
            "target_translation": "comunidad",
            "example_sentence": "Our community has many helpers who keep us safe.",
            "visual_hint": "Drawing of a neighbourhood with houses, a school, and people walking together"
        },
        {
            "term": "paragraph",
            "definition": "A group of sentences about one idea.",
            "target_translation": "párrafo",
            "example_sentence": "Read the first paragraph to learn about firefighters.",
            "visual_hint": "A block of text with an indent at the start, highlighted in a box"
        },
        {
            "term": "details",
            "definition": "Small pieces of information that tell you more about something.",
            "target_translation": "detalles",
            "example_sentence": "Use details from the text to support your answer.",
            "visual_hint": "Magnifying glass looking at a sentence with key words circled"
        },
        {
            "term": "respond",
            "definition": "To answer or reply to a question.",
            "target_translation": "responder",
            "example_sentence": "Respond to each question in a full sentence.",
            "visual_hint": "Speech bubble with a pencil writing inside it"
        },
        {
            "term": "support",
            "definition": "To help or give evidence for an idea.",
            "target_translation": "apoyar",
            "example_sentence": "Support your answer with details from the passage.",
            "visual_hint": "Two hands holding up a block labeled 'evidence'"
        },
        {
            "term": "passage",
            "definition": "A piece of writing, usually part of a longer text.",
            "target_translation": "pasaje",
            "example_sentence": "Read the passage carefully before answering.",
            "visual_hint": "An open book with a highlighted section on one page"
        }
    ]
})

MOCK_SUPPORT_PATTERNS = json.dumps({
    "recurring_themes": [
        {
            "theme": "Writing block support needs for EAL learners",
            "student_refs": ["Ari"],
            "evidence_count": 3,
            "example_observations": [
                "Ari needed 1:1 support during the writing block. Had difficulty starting the first sentence.",
                "Used sentence starters and word bank from the EAL support kit. Modelled the first sentence together."
            ]
        },
        {
            "theme": "Post-lunch transition difficulties",
            "student_refs": ["Mika"],
            "evidence_count": 2,
            "example_observations": [
                "Mika struggled with attention during the post-lunch transition.",
                "Needed pre-correction before afternoon re-entry. Step checklist helped."
            ]
        }
    ],
    "follow_up_gaps": [
        {
            "original_record_id": "int-alpha-grade4-1001",
            "student_refs": ["Ari"],
            "observation": "Ari needed 1:1 support during writing block — completed 3 of 5 questions with scaffolding",
            "days_since": 3
        }
    ],
    "positive_trends": [
        {
            "student_ref": "Ari",
            "description": "Increasing independence with sentence starters — your records show progression from needing full modelling to completing tasks with only the word bank.",
            "evidence": [
                "Completed 3 of 5 questions independently by end of period.",
                "Showed more confidence after the first modelled sentence."
            ]
        }
    ],
    "suggested_focus": [
        {
            "student_ref": "Ari",
            "reason": "Your records show consistent need for writing scaffolds. The sentence starter approach is working — consider whether Ari is ready to attempt the first sentence independently with only the word bank.",
            "suggested_action": "During tomorrow's writing block, try providing only the word bank first. If Ari stalls after 2 minutes, offer the sentence starters as a second-level scaffold.",
            "priority": "high"
        },
        {
            "student_ref": "Mika",
            "reason": "Two recent records mention post-lunch transition difficulty. The step checklist appears to help when used proactively.",
            "suggested_action": "Continue pre-correction routine before lunch dismissal. Consider adding a 1-minute desk task immediately upon re-entry to provide structure.",
            "priority": "medium"
        }
    ]
})

MOCK_EA_BRIEFING = json.dumps({
    "schedule_blocks": [
        {
            "time_slot": "10:00–10:20",
            "student_refs": ["Ari"],
            "task_description": "Run small-group reading support with Ari and 2 other EAL students. Read passage aloud, pause for discussion after each paragraph. Use sentence starters for comprehension check.",
            "materials_needed": ["passage handout", "sentence starters", "word bank sheet"]
        },
        {
            "time_slot": "12:45–13:00",
            "student_refs": ["Mika"],
            "task_description": "Monitor Mika during post-lunch transition. Use the step checklist to redirect if needed. Give advance notice 2 minutes before transition begins.",
            "materials_needed": ["step checklist card"]
        },
        {
            "time_slot": "13:15–13:35",
            "student_refs": ["Ari"],
            "task_description": "Check in on writing progress for small group. Provide scribe support if needed for students with fine motor needs. Start by offering only the word bank — if Ari stalls after 2 minutes, offer sentence starters as second-level scaffold.",
            "materials_needed": ["word bank sheet", "sentence starters (backup)", "lined paper"]
        }
    ],
    "student_watch_list": [
        {
            "student_ref": "Ari",
            "context_summary": "The teacher's plan notes Ari is an EAL learner with high language demand in tomorrow's writing task. Recent records show increasing independence with sentence starters.",
            "suggested_approach": "Start with word bank only — sentence starters as backup. The progression from full modelling to word-bank-only is documented as working."
        },
        {
            "student_ref": "Mika",
            "context_summary": "The teacher's plan notes Mika struggles with attention during post-lunch transitions. Two recent records document this pattern.",
            "suggested_approach": "Pre-correction before lunch dismissal. Step checklist on desk. Assign a specific seat-entry task (e.g. distributing handouts) to provide structure."
        }
    ],
    "pending_followups": [
        {
            "student_ref": "Ari",
            "original_observation": "Needed 1:1 support during writing block — completed 3 of 5 questions with scaffolding",
            "days_since": 3,
            "suggested_action": "Check whether Ari can start independently with word bank today. If successful, this follow-up can be closed."
        }
    ],
    "teacher_notes_for_ea": "Today's focus is the reading-to-writing transition. Ari needs graduated scaffolding during writing — try word bank first before sentence starters. Mika needs proactive support at the post-lunch transition. Jae is a strong reader who may finish early — extension menu cards are on the side table."
})

MOCK_SUPPORT_PATTERNS_THINKING = (
    "Let me analyze the intervention records and support plans for this classroom.\n\n"
    "First, I'll look for recurring themes — actions or observations that appear multiple times for the same student.\n\n"
    "Ari appears in 3 intervention records, all related to writing support needs. "
    "The sentence starter approach shows positive progression.\n\n"
    "Mika appears in 2 records related to post-lunch transitions. "
    "The step checklist intervention seems effective when used proactively.\n\n"
    "For follow-up gaps, I can see one intervention marked as needing follow-up with no subsequent record.\n\n"
    "Positive trends: Ari's records show increasing independence with scaffolds over time."
)

MOCK_RESPONSES: dict[str, str] = {
    "text": MOCK_DIFFERENTIATION,
    "image_text": (
        "I can see a worksheet about community helpers. The passage asks students "
        "to read about people who help in their community and answer three questions."
    ),
    "thinking": MOCK_TOMORROW_PLAN,
    "thinking_text": MOCK_TOMORROW_THINKING,
    "tool_call": json.dumps({
        "tool_calls": [{
            "name": "differentiate_material",
            "arguments": {
                "artifact_id": "artifact-001",
                "variant_types": ["core", "eal_supported", "chunked", "ea_small_group", "extension"]
            }
        }]
    }),
}


class MockBackend:
    """Returns canned responses for offline development."""

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        if request.tools:
            text = MOCK_RESPONSES["tool_call"]
            tool_calls = json.loads(text).get("tool_calls", [])
            return GenerationResponse(
                text=text, tool_calls=tool_calls, model_id="mock"
            )
        if request.prompt_class == "detect_support_patterns":
            return GenerationResponse(
                text=MOCK_SUPPORT_PATTERNS,
                thinking_text=MOCK_SUPPORT_PATTERNS_THINKING,
                model_id="mock",
            )
        if request.prompt_class == "generate_ea_briefing":
            return GenerationResponse(text=MOCK_EA_BRIEFING, model_id="mock")
        if request.prompt_class == "draft_family_message":
            return GenerationResponse(text=MOCK_FAMILY_MESSAGE, model_id="mock")
        if request.prompt_class == "log_intervention":
            return GenerationResponse(text=MOCK_INTERVENTION, model_id="mock")
        if request.prompt_class == "simplify_for_student":
            return GenerationResponse(text=MOCK_SIMPLIFICATION, model_id="mock")
        if request.prompt_class == "generate_vocab_cards":
            return GenerationResponse(text=MOCK_VOCAB_CARDS, model_id="mock")
        if request.thinking:
            return GenerationResponse(
                text=MOCK_RESPONSES["thinking"],
                thinking_text=MOCK_RESPONSES["thinking_text"],
                model_id="mock",
            )
        if request.images:
            return GenerationResponse(
                text=MOCK_RESPONSES["image_text"], model_id="mock"
            )
        return GenerationResponse(text=MOCK_RESPONSES["text"], model_id="mock")


# ---------------------------------------------------------------------------
# Local backend — loads via HuggingFace transformers (requires GPU)
# ---------------------------------------------------------------------------

class LocalBackend:
    """Loads a Gemma 4 checkpoint locally via transformers."""

    def __init__(self, model_id: str):
        self.model_id = model_id
        self.model = None
        self.processor = None

    def load(self) -> None:
        try:
            from transformers import AutoProcessor, AutoModelForImageTextToText
            import torch

            print(f"Loading {self.model_id}...")
            self.processor = AutoProcessor.from_pretrained(self.model_id)
            self.model = AutoModelForImageTextToText.from_pretrained(
                self.model_id,
                torch_dtype=torch.bfloat16,
                device_map="auto",
            )
            print(f"Model loaded on {next(self.model.parameters()).device}")
        except Exception as e:
            print(f"Failed to load model: {e}")
            raise

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        if self.model is None:
            self.load()

        import time
        import torch
        from PIL import Image

        messages: list[dict] = []
        content: list[dict] = []

        if request.images:
            for img_path in request.images:
                content.append({"type": "image", "url": img_path})

        content.append({"type": "text", "text": request.prompt})
        messages.append({"role": "user", "content": content})

        inputs = self.processor.apply_chat_template(
            messages,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        ).to(self.model.device)

        start = time.perf_counter()
        with torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=request.max_tokens,
                do_sample=True,
                temperature=0.7,
            )
        latency_ms = (time.perf_counter() - start) * 1000

        # Decode only the new tokens
        generated_ids = output_ids[:, inputs["input_ids"].shape[1]:]
        text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

        return GenerationResponse(
            text=extract_json(text),
            model_id=self.model_id,
            latency_ms=latency_ms,
        )


# ---------------------------------------------------------------------------
# JSON extraction — handles real model output quirks
# ---------------------------------------------------------------------------

def extract_json(raw: str) -> str:
    """Extract JSON from model output that may include prose or markdown fencing.

    Handles:
    - Markdown ```json ... ``` fences
    - Leading/trailing prose around JSON
    - Trailing commas (common Gemma quirk)
    """
    text = raw.strip()

    # Strip markdown fences
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    # If the text already looks like valid JSON, return it
    if text and text[0] in ("{", "["):
        # Fix trailing commas before } or ]
        text = re.sub(r",\s*([}\]])", r"\1", text)
        return text

    # Find the first { or [ and match to the end
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        idx = text.find(start_char)
        if idx == -1:
            continue
        # Walk backwards from end to find the last matching bracket
        ridx = text.rfind(end_char)
        if ridx > idx:
            candidate = text[idx : ridx + 1]
            candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
            return candidate

    # No JSON structure found — return the raw text for downstream handling
    return raw.strip()


# ---------------------------------------------------------------------------
# Vertex AI backend — calls Gemma models via Google GenAI SDK
# ---------------------------------------------------------------------------

class VertexAIBackend:
    """Calls Gemma 4 models on Vertex AI via the google-genai SDK."""

    MODEL_MAP = {
        ModelTier.LIVE: "gemma-4-4b-it",
        ModelTier.PLANNING: "gemma-4-27b-it",
    }

    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client

        from google import genai

        project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

        if not project:
            raise RuntimeError(
                "GOOGLE_CLOUD_PROJECT environment variable is required for Vertex AI mode. "
                "Set it to your GCP project ID."
            )

        self._client = genai.Client(
            vertexai=True,
            project=project,
            location=location,
        )
        print(f"Vertex AI client initialized — project={project}, location={location}")
        return self._client

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        from google.genai import types

        client = self._get_client()
        model_id = self.MODEL_MAP.get(request.model_tier, self.MODEL_MAP[ModelTier.LIVE])

        # Split the prompt into system instruction and user message.
        # Our prompt builders concatenate system + user with a double newline
        # before the context section. We split on common delimiters.
        system_instruction = None
        user_text = request.prompt

        for delimiter in [
            "\n\nCLASSROOM CONTEXT:",
            "\n\nARTIFACT:",
            "\n\nTEACHER INPUT:",
            "\n\nSTUDENT TEXT:",
            "\n\nINTERVENTION NOTE:",
            "\n\nSOURCE TEXT:",
            "\n\nCLASSROOM MEMORY:",
        ]:
            idx = request.prompt.find(delimiter)
            if idx > 0:
                system_instruction = request.prompt[:idx].strip()
                user_text = request.prompt[idx:].strip()
                break

        # Build message contents
        contents: list = []
        if request.images:
            for img_path in request.images:
                try:
                    with open(img_path, "rb") as f:
                        img_data = f.read()
                    contents.append(types.Part.from_bytes(
                        data=img_data,
                        mime_type="image/png",
                    ))
                except FileNotFoundError:
                    pass  # Skip missing images in smoke tests
        contents.append(user_text)

        # Configure thinking mode
        thinking_config = None
        if request.thinking:
            thinking_config = types.ThinkingConfig(
                thinking_budget=8192,
            )

        # Build generation config
        generate_config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            max_output_tokens=request.max_tokens,
            temperature=0.7,
            thinking_config=thinking_config,
        )

        start = time.perf_counter()
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=contents,
                config=generate_config,
            )
        except Exception as e:
            latency_ms = (time.perf_counter() - start) * 1000
            return GenerationResponse(
                text=json.dumps({"error": str(e)}),
                model_id=model_id,
                latency_ms=latency_ms,
            )
        latency_ms = (time.perf_counter() - start) * 1000

        # Extract text and thinking from response parts
        output_text = ""
        thinking_text = None

        if not response.candidates:
            print(f"WARNING: Empty candidates from {model_id} — possible safety filter or refusal")

        if response.candidates:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "thought") and part.thought:
                    thinking_text = (thinking_text or "") + part.text
                else:
                    output_text += part.text

        # Extract clean JSON from model output
        output_text = extract_json(output_text)

        return GenerationResponse(
            text=output_text,
            thinking_text=thinking_text,
            model_id=model_id,
            latency_ms=latency_ms,
        )


# ---------------------------------------------------------------------------
# Harness — unified interface
# ---------------------------------------------------------------------------

class GemmaHarness:
    """Unified inference interface for PrairieClassroom OS."""

    MODEL_MAP = {
        ModelTier.LIVE: "google/gemma-4-4b-it",
        ModelTier.PLANNING: "google/gemma-4-27b-it",
    }

    def __init__(self, mode: InferenceMode, model_id: str | None = None):
        self.mode = mode
        if mode == InferenceMode.MOCK:
            self.backend = MockBackend()
        elif mode == InferenceMode.LOCAL:
            mid = model_id or self.MODEL_MAP[ModelTier.LIVE]
            self.backend = LocalBackend(mid)
        elif mode == InferenceMode.API:
            self.backend = VertexAIBackend()
        else:
            raise ValueError(f"Unknown inference mode: {mode}")

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        return self.backend.generate(request)


# ---------------------------------------------------------------------------
# Smoke tests
# ---------------------------------------------------------------------------

def run_smoke_tests(harness: GemmaHarness) -> bool:
    """Run the four Sprint 0 smoke tests."""
    passed = 0
    total = 4

    # Test 1: Text prompt
    print("\n[1/4] Text prompt...")
    resp = harness.generate(GenerationRequest(prompt="Differentiate this reading passage for mixed levels."))
    ok = len(resp.text) > 0
    print(f"  {'PASS' if ok else 'FAIL'} — got {len(resp.text)} chars")
    passed += ok

    # Test 2: Image + text prompt
    print("[2/4] Image + text prompt...")
    resp = harness.generate(GenerationRequest(
        prompt="Describe this worksheet and suggest how to adapt it.",
        images=["placeholder.png"],
    ))
    ok = len(resp.text) > 0
    print(f"  {'PASS' if ok else 'FAIL'} — got {len(resp.text)} chars")
    passed += ok

    # Test 3: Thinking mode
    print("[3/4] Thinking mode...")
    resp = harness.generate(GenerationRequest(
        prompt="Plan tomorrow's support priorities for a class with 3 EAL students and 2 needing transition support.",
        thinking=True,
        model_tier=ModelTier.PLANNING,
    ))
    ok = resp.thinking_text is not None or len(resp.text) > 0
    print(f"  {'PASS' if ok else 'FAIL'} — thinking={'yes' if resp.thinking_text else 'no'}")
    passed += ok

    # Test 4: Tool call round trip
    print("[4/4] Tool call round trip...")
    tools = [{
        "name": "differentiate_material",
        "description": "Generate differentiated versions of a lesson artifact.",
        "parameters": {
            "type": "object",
            "properties": {
                "artifact_id": {"type": "string"},
                "variant_types": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["artifact_id", "variant_types"],
        },
    }]
    resp = harness.generate(GenerationRequest(
        prompt="Differentiate artifact-001 into all five variant types.",
        tools=tools,
    ))
    ok = len(resp.tool_calls) > 0
    print(f"  {'PASS' if ok else 'FAIL'} — tool_calls={len(resp.tool_calls)}")
    passed += ok

    print(f"\nSmoke tests: {passed}/{total} passed")
    return passed == total


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="PrairieClassroom OS — Gemma 4 Harness")
    parser.add_argument("--mode", choices=["mock", "api", "local"], default="mock")
    parser.add_argument("--model-id", type=str, default=None)
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()

    harness = GemmaHarness(
        mode=InferenceMode(args.mode),
        model_id=args.model_id,
    )

    if args.smoke_test:
        success = run_smoke_tests(harness)
        sys.exit(0 if success else 1)
    else:
        print("Harness ready. Use --smoke-test to validate.")


if __name__ == "__main__":
    main()
