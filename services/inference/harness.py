"""
PrairieClassroom OS — Gemma Inference Harness

Provides model loading and generation for the dual-speed architecture:
- Live route:     self-deployed Gemma live tier (low-latency classroom actions)
- Planning route: self-deployed Gemma planning tier (deeper reasoning, next-day planning)

Supports four modes:
1. mock   — returns canned responses for development without GPU
2. api    — calls remote Vertex AI endpoints
3. local  — loads model weights locally via transformers
4. gemini — calls hosted Gemma 4 models through the Gemini API

Usage:
    python harness.py --mode mock --smoke-test
    python harness.py --mode local --model-id google/gemma-4-4b-it --smoke-test
    python harness.py --mode gemini --smoke-test
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

PAID_SERVICES_ENV = "PRAIRIE_ALLOW_PAID_SERVICES"
GEMINI_API_KEY_ENV_VARS = ("PRAIRIE_GEMINI_API_KEY", "GEMINI_API_KEY")
GEMINI_HTTP_TIMEOUT_ENV = "PRAIRIE_GEMINI_HTTP_TIMEOUT_MS"
PROMPT_SPLIT_DELIMITERS = [
    "\n\nCLASSROOM CONTEXT:",
    "\n\nARTIFACT:",
    "\n\nTEACHER INPUT:",
    "\n\nSTUDENT TEXT:",
    "\n\nINTERVENTION NOTE:",
    "\n\nSOURCE TEXT:",
    "\n\nCLASSROOM MEMORY:",
    "\n\nWORKSHEET IMAGE:",
]

try:
    from google import genai
except Exception:  # pragma: no cover - dependency presence is validated at runtime
    genai = None


def paid_services_enabled() -> bool:
    return os.environ.get(PAID_SERVICES_ENV, "").strip().lower() in {"1", "true", "yes", "on"}


class InferenceMode(Enum):
    MOCK = "mock"
    API = "api"
    LOCAL = "local"
    OLLAMA = "ollama"
    GEMINI = "gemini"


GEMINI_RUN_GUARD_ENV_VAR = "PRAIRIE_ENABLE_GEMINI_RUNS"


def _flag_enabled(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def require_gemini_run_guard(env: dict[str, str] | None = None) -> None:
    source = env if env is not None else os.environ
    if _flag_enabled(source.get(GEMINI_RUN_GUARD_ENV_VAR)):
        return
    raise RuntimeError(
        f"Hosted Gemini runs are disabled by default. Export {GEMINI_RUN_GUARD_ENV_VAR}=true to enable them intentionally."
    )


class ModelTier(Enum):
    LIVE = "live"       # fast classroom actions
    PLANNING = "planning"  # deeper synthesis/planning


DEFAULT_GEMINI_HTTP_TIMEOUT_MS_BY_TIER = {
    ModelTier.LIVE: 100_000,
    ModelTier.PLANNING: 120_000,
}


@dataclass
class GenerationRequest:
    """A single generation request to the harness."""
    prompt: str
    images: list[str] = field(default_factory=list)  # file paths
    thinking: bool = False
    tools: list[dict[str, Any]] | None = None
    tool_interactions: list[dict[str, Any]] | None = None
    model_tier: ModelTier = ModelTier.LIVE
    max_tokens: int = 2048
    prompt_class: str | None = None
    mock_context: dict[str, Any] | None = None


@dataclass
class GenerationResponse:
    """Response from the harness."""
    text: str
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    thinking_text: str | None = None
    model_id: str = ""
    latency_ms: float = 0.0
    # Token usage — None when backend cannot report it (e.g. mock, ollama-without-options)
    prompt_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None


def _coerce_json_object(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def gemini_function_declarations(tools: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Convert Prairie tool definitions to Gemini function_declarations."""
    declarations: list[dict[str, Any]] = []
    for tool in tools or []:
        name = tool.get("name")
        parameters = _coerce_json_object(tool.get("parameters"))
        if not isinstance(name, str) or not name:
            continue
        declaration: dict[str, Any] = {"name": name}
        if isinstance(tool.get("description"), str):
            declaration["description"] = tool["description"]
        if parameters:
            declaration["parameters"] = parameters
        declarations.append(declaration)
    return declarations


def openai_chat_tools(tools: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Convert Prairie tool definitions to OpenAI-compatible chat tools."""
    declarations = gemini_function_declarations(tools)
    return [
        {
            "type": "function",
            "function": declaration,
        }
        for declaration in declarations
    ]


def _json_dumps_compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _tool_interaction_name(interaction: dict[str, Any]) -> str:
    return str(interaction.get("tool_name") or interaction.get("name") or "")


def _tool_interaction_id(interaction: dict[str, Any], index: int) -> str:
    raw = interaction.get("tool_call_id") or interaction.get("id")
    return str(raw) if raw else f"tool_call_{index}"


def _tool_interaction_arguments(interaction: dict[str, Any]) -> dict[str, Any]:
    return _coerce_json_object(interaction.get("arguments"))


def _tool_interaction_result(interaction: dict[str, Any]) -> Any:
    return interaction.get("result")


def _tool_interaction_thought_signature(interaction: dict[str, Any]) -> str | None:
    raw = interaction.get("thought_signature") or interaction.get("thoughtSignature")
    return raw if isinstance(raw, str) and raw else None


def gemini_tool_history_contents(tool_interactions: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Build Gemini model/functionResponse turns from executed tool calls."""
    if not tool_interactions:
        return []

    model_parts: list[dict[str, Any]] = []
    response_parts: list[dict[str, Any]] = []
    for index, interaction in enumerate(tool_interactions):
        if not isinstance(interaction, dict):
            continue
        name = _tool_interaction_name(interaction)
        if not name:
            continue
        call_id = _tool_interaction_id(interaction, index)
        model_part: dict[str, Any] = {
            "function_call": {
                "name": name,
                "args": _tool_interaction_arguments(interaction),
                "id": call_id,
            }
        }
        thought_signature = _tool_interaction_thought_signature(interaction)
        if thought_signature:
            model_part["thought_signature"] = thought_signature
        model_parts.append(model_part)
        response_parts.append({
            "function_response": {
                "name": name,
                "response": {"result": _tool_interaction_result(interaction)},
                "id": call_id,
            }
        })

    if not model_parts or not response_parts:
        return []
    return [
        {"role": "model", "parts": model_parts},
        {"role": "user", "parts": response_parts},
    ]


def ollama_tool_history_messages(tool_interactions: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Build Ollama /api/chat history for executed tool calls."""
    if not tool_interactions:
        return []

    tool_calls: list[dict[str, Any]] = []
    result_messages: list[dict[str, Any]] = []
    for index, interaction in enumerate(tool_interactions):
        if not isinstance(interaction, dict):
            continue
        name = _tool_interaction_name(interaction)
        if not name:
            continue
        call_id = _tool_interaction_id(interaction, index)
        tool_calls.append({
            "id": call_id,
            "type": "function",
            "function": {
                "index": index,
                "name": name,
                "arguments": _tool_interaction_arguments(interaction),
            },
        })
        result_messages.append({
            "role": "tool",
            "tool_call_id": call_id,
            "tool_name": name,
            "content": _json_dumps_compact(_tool_interaction_result(interaction)),
        })

    if not tool_calls:
        return []
    return [
        {
            "role": "assistant",
            "content": "",
            "tool_calls": tool_calls,
        },
        *result_messages,
    ]


def openai_tool_history_messages(tool_interactions: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Build OpenAI-compatible chat history for executed tool calls."""
    if not tool_interactions:
        return []

    tool_calls: list[dict[str, Any]] = []
    result_messages: list[dict[str, Any]] = []
    for index, interaction in enumerate(tool_interactions):
        if not isinstance(interaction, dict):
            continue
        name = _tool_interaction_name(interaction)
        if not name:
            continue
        call_id = _tool_interaction_id(interaction, index)
        tool_calls.append({
            "id": call_id,
            "type": "function",
            "function": {
                "name": name,
                "arguments": _json_dumps_compact(_tool_interaction_arguments(interaction)),
            },
        })
        result_messages.append({
            "role": "tool",
            "tool_call_id": call_id,
            "content": _json_dumps_compact(_tool_interaction_result(interaction)),
        })

    if not tool_calls:
        return []
    return [
        {
            "role": "assistant",
            "content": None,
            "tool_calls": tool_calls,
        },
        *result_messages,
    ]


def _normalize_tool_call(value: Any) -> dict[str, Any] | None:
    call = _coerce_json_object(value)
    function_payload = _coerce_json_object(
        call.get("function") or call.get("function_call") or call.get("functionCall")
    )
    name = call.get("name") or function_payload.get("name")
    if not isinstance(name, str) or not name:
        return None
    args = (
        _coerce_json_object(call.get("arguments"))
        or _coerce_json_object(call.get("args"))
        or _coerce_json_object(function_payload.get("arguments"))
        or _coerce_json_object(function_payload.get("args"))
    )
    normalized: dict[str, Any] = {"name": name, "arguments": args}
    call_id = call.get("id") or call.get("tool_call_id") or function_payload.get("id")
    if isinstance(call_id, str) and call_id:
        normalized["id"] = call_id
    thought_signature = (
        call.get("thought_signature")
        or call.get("thoughtSignature")
        or function_payload.get("thought_signature")
        or function_payload.get("thoughtSignature")
    )
    if isinstance(thought_signature, str) and thought_signature:
        normalized["thought_signature"] = thought_signature
    return normalized


def extract_tool_calls(payload: Any) -> list[dict[str, Any]]:
    """Extract OpenAI, Ollama, or Gemini function-call suggestions."""
    calls: list[dict[str, Any]] = []

    def visit(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item)
            return
        if not isinstance(value, dict):
            return

        direct_calls = value.get("tool_calls") or value.get("toolCalls") or value.get("functionCalls")
        if isinstance(direct_calls, list):
            for item in direct_calls:
                normalized = _normalize_tool_call(item)
                if normalized is not None:
                    calls.append(normalized)

        for key in ("function_call", "functionCall"):
            if key in value:
                normalized = _normalize_tool_call({
                    key: value[key],
                    "thought_signature": value.get("thought_signature"),
                    "thoughtSignature": value.get("thoughtSignature"),
                })
                if normalized is not None:
                    calls.append(normalized)

        for child in value.values():
            if isinstance(child, (dict, list)):
                visit(child)

    visit(payload)

    unique: list[dict[str, Any]] = []
    seen: set[str] = set()
    for call in calls:
        marker = json.dumps(call, sort_keys=True)
        if marker in seen:
            continue
        seen.add(marker)
        unique.append(call)
    return unique


@dataclass(frozen=True)
class MockFixture:
    text: str
    thinking_text: str | None = None


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

MOCK_TOMORROW_PLAN_DEMO = json.dumps({
    "transition_watchpoints": [
        {
            "time_or_activity": "After lunch — returning to classroom",
            "risk_description": "Brody still needs proactive support during the post-lunch re-entry. The recent positive streak holds best when the first task is visible before he walks in.",
            "suggested_mitigation": "Have the visual timer running and a 1-minute desk task already posted. Meet Brody at the doorway and point him directly to the first step."
        },
        {
            "time_or_activity": "Math word problems after mini-lesson",
            "risk_description": "Amira can explain the math orally but may stall when the written language load spikes. Farid shows the same pattern when verbal reasoning has to turn into written sentences.",
            "suggested_mitigation": "Pre-teach key problem language, then let Amira and Farid talk through the steps before writing. Keep sentence frames and word banks on the table from the start."
        }
    ],
    "support_priorities": [
        {
            "student_ref": "Brody",
            "reason": "Your records show the strongest risk cluster is still the post-lunch transition. The timer and settling task are working, but only when they are in place before correction is needed.",
            "suggested_action": "Set the timer before lunch ends, place the first task on Brody's desk, and keep the re-entry directions short and visual."
        },
        {
            "student_ref": "Amira",
            "reason": "Amira's math reasoning is stronger than her written English output. She benefits when she can rehearse the language before she has to write.",
            "suggested_action": "Preview the problem vocabulary, pair a brief verbal planning step with a sentence frame, and check in after the first written response."
        },
        {
            "student_ref": "Farid",
            "reason": "Farid can explain his thinking clearly aloud but still slows down when he has to transfer that reasoning into written sentences.",
            "suggested_action": "Use a voice-first planning step or quick dictation before independent writing, then reduce the written load to two strong sentences."
        }
    ],
    "ea_actions": [
        {
            "description": "Run a short language-to-writing bridge with Amira and Farid before math journaling. Let them explain their reasoning aloud first, then move to sentence frames.",
            "student_refs": ["Amira", "Farid"],
            "timing": "9:15–9:35 (math support block)"
        },
        {
            "description": "Monitor Brody's post-lunch re-entry and cue the first desk task before noise builds in the room.",
            "student_refs": ["Brody"],
            "timing": "12:45–13:00 (after lunch re-entry)"
        },
        {
            "description": "Check Daniyal's visual schedule during the afternoon transition and anchor him with a nearby peer if he misses the room cue.",
            "student_refs": ["Daniyal"],
            "timing": "13:00–13:10 (transition to writing)"
        }
    ],
    "prep_checklist": [
        "Set out the visual timer and settling task before lunch ends",
        "Print sentence frames for Amira and Farid's math journaling",
        "Place Brody's first-task card on desk before re-entry",
        "Clip Daniyal's visual schedule to the whiteboard edge",
        "Brief the EA on the language-to-writing bridge before first block"
    ],
    "family_followups": [
        {
            "student_ref": "Amira",
            "reason": "Amira's math understanding is coming through more clearly when she gets language scaffolds before writing. That progress is worth a short praise note to family.",
            "message_type": "praise"
        }
    ]
})

MOCK_TOMORROW_THINKING_DEMO = (
    "Let me think through tomorrow's support plan for the demo classroom.\n\n"
    "Brody's recent progress depends on proactive transition structure, especially after lunch.\n"
    "Amira and Farid both show the same friction point: they can explain the math, but the written language slows them down.\n"
    "Daniyal still needs the visual schedule to catch transitions reliably.\n\n"
    "The plan should therefore front-load transition supports for Brody, language-to-writing bridges for Amira and Farid, and one short visual check for Daniyal."
)

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

MOCK_COMPLEXITY_FORECAST = json.dumps({
    "blocks": [
        {
            "time_slot": "9:00–9:45",
            "activity": "Morning literacy block",
            "level": "medium",
            "contributing_factors": [
                "Amira's peer buddy absent today — will need alternative pairing",
                "New passage may challenge EAL students without pre-teaching"
            ],
            "suggested_mitigation": "Pre-teach 3 key vocabulary words with Amira before the block. Pair with Chantal as temporary buddy."
        },
        {
            "time_slot": "10:00–10:45",
            "activity": "Math block (post-assembly transition)",
            "level": "high",
            "contributing_factors": [
                "Assembly at 10am will shorten and disrupt the math block",
                "Post-assembly re-entry is a known high-noise transition for this class",
                "Brody and Daniyal historically struggle with focus after assemblies"
            ],
            "suggested_mitigation": "Post visual schedule before assembly. Use 2-minute settling activity on return. Have step checklists ready for Brody and Daniyal."
        },
        {
            "time_slot": "11:00–11:45",
            "activity": "Science — plant lifecycle observation",
            "level": "low",
            "contributing_factors": [
                "Hands-on activity with high student engagement",
                "EA (Ms. Fehr) available for small-group support"
            ],
            "suggested_mitigation": "Standard support plan. Amira may need vocabulary support for observation journal entries."
        },
        {
            "time_slot": "12:45–13:30",
            "activity": "Afternoon writing block",
            "level": "high",
            "contributing_factors": [
                "Post-lunch transition is consistently the hardest period for this class",
                "Writing task has high language demand for EAL students",
                "No EA available in afternoon — teacher-only support"
            ],
            "suggested_mitigation": "Use structured re-entry task (1-minute desk activity). Provide sentence starters and word bank for Amira and Elena. Monitor Brody's transition with pre-correction."
        }
    ],
    "overall_summary": "Your records show two high-complexity blocks tomorrow — the post-assembly math transition and the afternoon writing block. Both involve transitions that have historically been challenging for this class. Amira's buddy absence adds complexity to the morning literacy block. The science block is a bright spot with hands-on engagement and EA support.",
    "highest_risk_block": "12:45–13:30 Afternoon writing block — post-lunch transition combined with high language demand and no EA support creates the highest complexity concentration."
})

MOCK_COMPLEXITY_FORECAST_THINKING = (
    "Let me analyze the complexity landscape for tomorrow.\n\n"
    "First, the assembly at 10am will disrupt the math block. Your records show post-assembly transitions "
    "are consistently noisy for this class, especially for Brody and Daniyal.\n\n"
    "Amira's peer buddy is absent, which affects the literacy block — she relies on buddy support for reading tasks.\n\n"
    "The afternoon writing block is always the highest-risk period: post-lunch transition plus high language demand "
    "plus no EA support in the afternoon.\n\n"
    "Science block is the lowest complexity — hands-on, engaging, and EA available."
)

MOCK_EA_LOAD = json.dumps({
    "blocks": [
        {
            "time_slot": "8:30-9:15",
            "activity": "Bell work journal + calendar math",
            "ea_available": True,
            "supported_students": ["Amira", "Daniyal"],
            "load_level": "low",
            "load_factors": [
                "Familiar morning routine",
                "Only 2 supported students in this block"
            ]
        },
        {
            "time_slot": "9:15-9:30",
            "activity": "Recess transition",
            "ea_available": True,
            "supported_students": ["Brody"],
            "load_level": "medium",
            "load_factors": [
                "Your records show post-recess re-entry is a known pressure point for Brody",
                "Short block but high transition cost"
            ],
            "redistribution_suggestion": "Consider having Brody's fidget kit pre-placed at his desk before recess ends so the EA can greet rather than retrieve."
        },
        {
            "time_slot": "9:30-10:30",
            "activity": "Literacy block",
            "ea_available": True,
            "supported_students": ["Amira", "Daniyal", "Farid"],
            "load_level": "high",
            "load_factors": [
                "3 EAL-tagged students need EA attention simultaneously",
                "Language-heavy block increases per-student support intensity",
                "Follows the higher-cost recess transition"
            ],
            "redistribution_suggestion": "Consider moving Farid to the independent sentence-frames station at 9:30 so the EA can focus on Amira and Daniyal during the opening 20 minutes."
        },
        {
            "time_slot": "10:30-10:45",
            "activity": "Snack break",
            "ea_available": True,
            "supported_students": [],
            "load_level": "low",
            "load_factors": ["Structural break — no active support demand"]
        },
        {
            "time_slot": "10:45-11:45",
            "activity": "Science / Social Studies",
            "ea_available": True,
            "supported_students": ["Amira", "Brody"],
            "load_level": "high",
            "load_factors": [
                "EA departs at noon — this is the last full-support block",
                "Your records show Brody historically needs more support in content-heavy blocks",
                "Follows a sustained high-load literacy block with only a 15-minute snack recovery"
            ],
            "redistribution_suggestion": "Consider front-loading the hands-on demonstration in the first 20 minutes when Brody's attention is freshest."
        },
        {
            "time_slot": "11:45-12:30",
            "activity": "Lunch",
            "ea_available": False,
            "supported_students": [],
            "load_level": "break",
            "load_factors": ["EA not scheduled"]
        },
        {
            "time_slot": "12:30-12:45",
            "activity": "Body break + transition to math",
            "ea_available": False,
            "supported_students": [],
            "load_level": "break",
            "load_factors": ["EA not scheduled"]
        },
        {
            "time_slot": "12:45-1:45",
            "activity": "Math block",
            "ea_available": False,
            "supported_students": [],
            "load_level": "break",
            "load_factors": ["EA not scheduled"]
        }
    ],
    "alerts": [
        "Sustained high-load sequence from 9:30-11:45 with only a 15-minute snack recovery between the literacy block and the science block — consider pacing the literacy block's second half so the EA can recover briefly before science."
    ],
    "overall_summary": "Your records show tomorrow's EA window (8:30-12:00) concentrates three supported students into the literacy and science blocks back-to-back. The highest sustained load is 9:30-11:45, with Amira, Daniyal, and Farid needing EA attention during literacy and Amira plus Brody during science. The afternoon is teacher-only as usual and carries no EA load.",
    "highest_load_block": "9:30-10:30"
})

MOCK_EA_LOAD_THINKING = (
    "Let me trace the EA's day. The window is 8:30-12:00 only, so the afternoon is break by definition.\n\n"
    "Morning starts light — only Amira and Daniyal in bell work, familiar routine.\n\n"
    "Recess transition adds a short medium-load moment for Brody based on the intervention history.\n\n"
    "Literacy 9:30-10:30 stacks three EAL students simultaneously. That's the highest per-minute load of the day.\n\n"
    "Snack is a brief recovery, then science pulls Amira and Brody back into active support. That makes 9:30-11:45 a "
    "sustained high-load sequence — worth flagging as an alert.\n\n"
    "Noon onward is break by contract."
)

MOCK_SCAFFOLD_DECAY = json.dumps({
    "reviews": [
        {
            "scaffold_name": "sentence starters",
            "usage_trend": {
                "scaffold_name": "sentence starters",
                "early_window_count": 8,
                "early_window_total": 10,
                "recent_window_count": 3,
                "recent_window_total": 10,
                "trend": "decaying"
            },
            "positive_signals": [
                {
                    "description": "Your records show the student completed 3 of 5 writing questions independently with only the word bank — sentence starters were not needed.",
                    "source_record_id": "int-demo-001"
                },
                {
                    "description": "Your records show increasing confidence when starting sentences without the full starter template.",
                    "source_record_id": "int-demo-005"
                }
            ],
            "withdrawal_plan": [
                {
                    "phase_number": 1,
                    "description": "Provide word bank only. Offer sentence starters only if the student stalls after 2 minutes.",
                    "duration_weeks": 2,
                    "success_criteria": "Student starts 3 of 5 sentences independently with word bank alone."
                },
                {
                    "phase_number": 2,
                    "description": "Remove word bank for familiar topics. Keep available for new vocabulary-heavy tasks.",
                    "duration_weeks": 2,
                    "success_criteria": "Student starts writing within 1 minute on familiar topics without any scaffold."
                },
                {
                    "phase_number": 3,
                    "description": "Full withdrawal. Monitor for regression during high-demand tasks.",
                    "duration_weeks": 2,
                    "success_criteria": "Consistent independent writing starts across all task types for 2 weeks."
                }
            ],
            "regression_protocol": "If the student stalls for more than 3 minutes on 2 consecutive tasks, reintroduce word bank (phase 1). Do not skip back to sentence starters unless word bank alone is insufficient for 3 sessions.",
            "confidence": "medium"
        }
    ],
    "summary": "Your records show a clear decaying trend in sentence starter usage for this student. The withdrawal pattern is positive — the student is increasingly able to start writing with lighter scaffolds. A 3-phase withdrawal plan over 6 weeks is recommended, with clear regression checkpoints."
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

MOCK_SUPPORT_PATTERNS_DEMO = json.dumps({
    "recurring_themes": [
        {
            "theme": "Post-lunch transition supports are becoming more proactive",
            "student_refs": ["Brody"],
            "evidence_count": 2,
            "example_observations": [
                "Brody had significant difficulty transitioning back from lunch recess until a calm sensory break and low-pressure entry were used.",
                "Brody independently picked up the visual countdown timer before the next transition and moved without adult prompting."
            ]
        },
        {
            "theme": "Strong verbal reasoning needs a bridge into written language",
            "student_refs": ["Amira", "Farid"],
            "evidence_count": 2,
            "example_observations": [
                "Amira could explain the math accurately but stalled once she had to write the solution in English.",
                "Farid explained his pattern-finding clearly to a partner, then produced only three written words after eight minutes."
            ]
        }
    ],
    "follow_up_gaps": [
        {
            "original_record_id": "int-demo-003",
            "student_refs": ["Daniyal"],
            "observation": "Daniyal used the visual schedule and peer anchor successfully, but there is no documented plan yet for how that transition support should generalize across the full day.",
            "days_since": 6
        }
    ],
    "positive_trends": [
        {
            "student_ref": "Brody",
            "description": "Your records show a real shift from adult-managed transition support toward Brody choosing the visual timer independently. That is a meaningful self-regulation gain worth reinforcing with family.",
            "evidence": [
                "Mar 20: sensory break and calm corner were needed before Brody could rejoin the class.",
                "Mar 25: Brody independently picked up the visual timer and transitioned on his own."
            ]
        }
    ],
    "suggested_focus": [
        {
            "student_ref": "Farid",
            "reason": "Farid's verbal reasoning is outpacing his written production. Without a standing bridge from spoken explanation to written output, he is likely to keep hitting the same wall.",
            "suggested_action": "Make voice-first planning or dictation the default first step on written explanation tasks, then keep the written expectation short and high-quality.",
            "priority": "high"
        },
        {
            "student_ref": "Elena",
            "reason": "Elena's understanding improves when timed pressure is removed and manipulatives are available, but that accommodation has not yet been formalized.",
            "suggested_action": "Document an untimed or reduced-pressure option for timed math checks and keep concrete materials available at the start of assessment tasks.",
            "priority": "medium"
        }
    ]
})

MOCK_SUPPORT_PATTERNS_THINKING_DEMO = (
    "Let me review the demo classroom records.\n\n"
    "Brody's strongest pattern is transition regulation, and the important change is that the support is becoming proactive rather than reactive.\n"
    "Amira and Farid share a language-to-writing bottleneck: both can reason aloud before the writing demand catches them.\n"
    "Daniyal still has a follow-up gap because the successful peer-and-visual transition support has not been formalized."
)

MOCK_EA_BRIEFING_DEMO = json.dumps({
    "schedule_blocks": [
        {
            "time_slot": "9:15–9:35",
            "student_refs": ["Amira", "Farid"],
            "task_description": "Run the math language bridge before journaling. Let Amira and Farid explain the problem orally first, then move them into sentence frames and brief written responses.",
            "materials_needed": ["math journal prompt", "sentence frame cards", "word bank"]
        },
        {
            "time_slot": "12:45–13:00",
            "student_refs": ["Brody"],
            "task_description": "Meet Brody at re-entry from lunch, point him to the visual timer, and cue the first desk task before the room gets loud.",
            "materials_needed": ["visual timer", "first-task card"]
        },
        {
            "time_slot": "13:00–13:10",
            "student_refs": ["Daniyal"],
            "task_description": "Check that Daniyal notices the transition cue and redirect him to the visual schedule if he misses the room movement.",
            "materials_needed": ["visual schedule card"]
        }
    ],
    "student_watch_list": [
        {
            "student_ref": "Amira",
            "context_summary": "Amira's mathematical thinking is stronger than her written English output. She benefits when she can rehearse language before writing.",
            "suggested_approach": "Start with oral rehearsal and a sentence frame before asking for written work."
        },
        {
            "student_ref": "Brody",
            "context_summary": "Brody is building momentum on post-lunch transitions, but the positive pattern depends on visible structure being ready ahead of time.",
            "suggested_approach": "Keep the timer and first task visible before correction is needed."
        },
        {
            "student_ref": "Farid",
            "context_summary": "Farid explains his reasoning clearly aloud but slows down once he has to turn that language into written sentences.",
            "suggested_approach": "Use voice-first planning or dictation, then keep the written expectation concise."
        }
    ],
    "pending_followups": [
        {
            "student_ref": "Daniyal",
            "original_observation": "Visual schedule plus peer anchor helped Daniyal catch the transition, but the accommodation is not yet formalized.",
            "days_since": 6,
            "suggested_action": "Check whether the visual schedule still works when Farid is not the nearby peer and note the result for follow-up."
        }
    ],
    "teacher_notes_for_ea": "Today's fragile points are the post-lunch re-entry for Brody and the language-to-writing bridge for Amira and Farid. Daniyal still needs a quick visual cue check during room transitions."
})

MOCK_COMPLEXITY_FORECAST_ALPHA = json.dumps({
    "blocks": [
        {
            "time_slot": "9:00–9:45",
            "activity": "Morning literacy block",
            "level": "medium",
            "contributing_factors": [
                "Ari needs vocabulary support before independent reading",
                "New text may increase language demand for the first 10 minutes"
            ],
            "suggested_mitigation": "Pre-teach 3 key words with Ari before students begin independent reading. Keep sentence starters visible on desks."
        },
        {
            "time_slot": "12:45–13:15",
            "activity": "Post-lunch transition into math",
            "level": "high",
            "contributing_factors": [
                "Mika often needs proactive support after lunch",
                "The block begins with a fast transition and independent seatwork"
            ],
            "suggested_mitigation": "Use a 2-minute settling task on desks and give Mika a step checklist before students re-enter the room."
        },
        {
            "time_slot": "13:15–14:00",
            "activity": "Independent writing block",
            "level": "medium",
            "contributing_factors": [
                "Ari's writing task carries language demand",
                "Jae may finish early and need extension work"
            ],
            "suggested_mitigation": "Have sentence starters ready for Ari and an extension menu card ready for Jae."
        }
    ],
    "overall_summary": "Your records show the post-lunch transition into math is tomorrow's most fragile period. Ari will still need light language scaffolds during writing, while Jae needs extension ready to avoid drift once core work is complete.",
    "highest_risk_block": "12:45–13:15"
})

MOCK_COMPLEXITY_FORECAST_ALPHA_THINKING = (
    "The highest concentration of complexity is the post-lunch transition into math. "
    "Mika's transition support needs are the strongest recurring pattern. "
    "Ari still needs language scaffolds during writing, and Jae needs early-finisher structure."
)

MOCK_SURVIVAL_PACKET_ALPHA = json.dumps({
    "routines": [
        {
            "time_or_label": "Morning entry",
            "description": "Students hang coats, begin the bell-work bin immediately, and wait for instructions at desks."
        },
        {
            "time_or_label": "After lunch",
            "description": "Students return quietly, sit immediately, and begin the short settling task on the board before any whole-class directions."
        },
        {
            "time_or_label": "Pack-up",
            "description": "Dismiss by table group once desks are clear and agendas are in backpacks."
        }
    ],
    "student_support": [
        {
            "student_ref": "Ari",
            "current_scaffolds": ["sentence starters", "word bank", "peer buddy"],
            "key_strategies": "Pre-teach vocabulary and check for understanding before asking for independent writing.",
            "things_to_avoid": "Do not start with a blank page and verbal-only directions."
        },
        {
            "student_ref": "Mika",
            "current_scaffolds": ["step checklist", "advance notice"],
            "key_strategies": "Give proactive transition reminders and a specific first job when returning from lunch."
        },
        {
            "student_ref": "Jae",
            "current_scaffolds": ["extension menu"],
            "key_strategies": "Offer extension work quickly after core tasks to maintain engagement."
        }
    ],
    "ea_coordination": {
        "schedule_summary": "EA is available for the morning reading block and briefly after lunch.",
        "primary_students": ["Ari", "Mika"],
        "if_ea_absent": "Run Ari's small-group support whole-class with sentence starters and keep Mika's checklist visible on desk."
    },
    "simplified_day_plan": [
        {
            "time_slot": "9:00–9:45",
            "activity": "Literacy",
            "sub_instructions": "Read the passage together first, then release students to answer questions. Keep Ari near a supportive peer.",
            "materials_location": "Reading handouts are stacked in the blue literacy tray."
        },
        {
            "time_slot": "12:45–13:15",
            "activity": "Math re-entry",
            "sub_instructions": "Start with the 2-minute settling task on the board before explaining the math page. Give Mika the checklist card immediately.",
            "materials_location": "Checklist cards are clipped to the whiteboard ledge."
        },
        {
            "time_slot": "13:15–14:00",
            "activity": "Writing",
            "sub_instructions": "Offer the word bank to Ari before sentence starters. Give Jae the extension menu if core work is finished early.",
            "materials_location": "Word banks and extension menus are in the green writing folder."
        }
    ],
    "family_comms": [
        {
            "student_ref": "Ari",
            "status": "expecting_message",
            "notes": "Teacher has a praise note in progress. Do not send anything directly."
        },
        {
            "student_ref": "Mika",
            "status": "defer_to_teacher",
            "notes": "Transition support updates should stay with the teacher."
        }
    ],
    "complexity_peaks": [
        {
            "time_slot": "12:45–13:15",
            "level": "high",
            "reason": "Post-lunch transitions are the most fragile period for this classroom.",
            "mitigation": "Use the settling task first and keep directions short and visible."
        },
        {
            "time_slot": "13:15–14:00",
            "level": "medium",
            "reason": "Writing has language demand for Ari and pacing differences for early finishers.",
            "mitigation": "Use scaffold cards and extension menus instead of improvising new work."
        }
    ],
    "heads_up": [
        "Mika needs proactive support after lunch, not reactive correction.",
        "Ari works best when vocabulary is previewed before independent writing.",
        "Jae should get extension work as soon as core tasks are complete."
    ]
})

MOCK_SURVIVAL_PACKET_DEMO = json.dumps({
    "routines": [
        {
            "time_or_label": "Morning entry",
            "description": "Students unpack, check the board, and start the bell work without waiting for a second reminder."
        },
        {
            "time_or_label": "After lunch",
            "description": "Students return quietly, look to the timer and first-task card, and begin the settling task before whole-class directions."
        },
        {
            "time_or_label": "Pack-up",
            "description": "Students pack agendas first, then line up by table once desks are clear."
        }
    ],
    "student_support": [
        {
            "student_ref": "Amira",
            "current_scaffolds": ["sentence frames", "word bank", "peer verbal rehearsal"],
            "key_strategies": "Let Amira talk through the idea before she has to write it down. Preview vocabulary before independent work.",
            "things_to_avoid": "Do not move straight from oral instruction to a blank written response."
        },
        {
            "student_ref": "Brody",
            "current_scaffolds": ["visual timer", "settling task", "advance cue"],
            "key_strategies": "Give Brody the first task immediately on re-entry and keep the transition language short.",
            "things_to_avoid": "Do not wait until Brody is stuck in the doorway to introduce the support."
        },
        {
            "student_ref": "Farid",
            "current_scaffolds": ["dictation option", "sentence frame card"],
            "key_strategies": "Farid can explain ideas well aloud. Use a voice-first bridge, then ask for two strong written sentences.",
            "things_to_avoid": "Avoid long written-response demands without a planning bridge."
        }
    ],
    "ea_coordination": {
        "schedule_summary": "EA is most useful during the morning math language bridge and the post-lunch re-entry window.",
        "primary_students": ["Amira", "Brody", "Farid"],
        "if_ea_absent": "Keep the sentence frames on tables for Amira and Farid, and make sure the visual timer and first-task card are ready for Brody before lunch ends."
    },
    "simplified_day_plan": [
        {
            "time_slot": "9:15–9:35",
            "activity": "Math journaling support",
            "sub_instructions": "Have Amira and Farid explain the problem aloud first, then move them into sentence frames before independent writing.",
            "materials_location": "Sentence frame cards are in the blue math folder."
        },
        {
            "time_slot": "12:45–13:00",
            "activity": "Lunch re-entry",
            "sub_instructions": "Start the timer before students enter and point Brody to the first-task card immediately.",
            "materials_location": "Timer is on the shelf by the door; first-task cards are clipped to the board."
        },
        {
            "time_slot": "13:00–13:30",
            "activity": "Independent writing",
            "sub_instructions": "Check Daniyal's visual schedule if he misses the transition. Offer Farid dictation or oral rehearsal before written output if he stalls.",
            "materials_location": "Visual schedule cards are in the red support bin."
        }
    ],
    "family_comms": [
        {
            "student_ref": "Amira",
            "status": "expecting_message",
            "notes": "Teacher has a praise note in progress about stronger math communication with scaffolds."
        },
        {
            "student_ref": "Brody",
            "status": "defer_to_teacher",
            "notes": "Transition progress can be celebrated, but any update should come from the teacher."
        }
    ],
    "complexity_peaks": [
        {
            "time_slot": "12:45–13:00",
            "level": "high",
            "reason": "Post-lunch re-entry is still the most fragile time for the room, especially for Brody.",
            "mitigation": "Have the timer and settling task ready before students enter."
        },
        {
            "time_slot": "9:15–9:35",
            "level": "medium",
            "reason": "Amira and Farid both need a bridge from spoken reasoning into written language.",
            "mitigation": "Use oral rehearsal and sentence frames before independent writing."
        }
    ],
    "heads_up": [
        "Brody's transition momentum is real, but it depends on proactive structure.",
        "Amira can solve the math before she can always write the English for it.",
        "Farid's best entry point is to explain first and write second."
    ]
})

MOCK_SURVIVAL_PACKET_THINKING = (
    "I prioritized routines, active supports, and the fragile transition blocks so a substitute can execute the day without digging through prior notes."
)

MOCK_WORKSHEET_EXTRACTION = json.dumps({
    "extracted_text": "Fractions Review Worksheet\n\n1. Circle the larger fraction: 1/4 or 1/3?\n\n2. Show 2/3 on the number line below.\n   [_______________]\n\n3. Solve: 1/2 + 1/4 = ___\n\n4. Mrs. Okafor has 3/4 of a pizza. If she eats 1/4, how much is left?\n\n5. Write a fraction that is equal to 1/2.\n\n6. Challenge: 5/6 - 2/6 = ___",
    "confidence_notes": ["All text clearly legible", "Number line in question 2 represented as blank line"]
})

DEMO_CLASSROOM_ID = "demo-okafor-grade34"
ALPHA_CLASSROOM_ID = "alpha-grade4"

def _mock_classroom_id(request: GenerationRequest) -> str:
    context = request.mock_context or {}
    classroom_id = context.get("classroom_id")
    if isinstance(classroom_id, str) and classroom_id in {ALPHA_CLASSROOM_ID, DEMO_CLASSROOM_ID}:
        return classroom_id
    if DEMO_CLASSROOM_ID in request.prompt:
        return DEMO_CLASSROOM_ID
    return ALPHA_CLASSROOM_ID


def _mock_student_refs(request: GenerationRequest) -> list[str]:
    context = request.mock_context or {}
    refs = context.get("student_refs")
    if isinstance(refs, list):
        return [str(ref) for ref in refs if ref]
    return []


def _mock_family_message_fixture(request: GenerationRequest) -> MockFixture:
    context = request.mock_context or {}
    classroom_id = _mock_classroom_id(request)
    student_refs = _mock_student_refs(request)
    defaults = MOCK_CLASSROOM_DEFAULTS[classroom_id]
    student_ref = student_refs[0] if student_refs else defaults["default_student_ref"]
    message_type = str(context.get("message_type") or "routine_update")
    target_language = str(context.get("target_language") or "en")
    templates = defaults["family_templates"]
    return MockFixture(text=json.dumps({
        "student_refs": [student_ref],
        "message_type": message_type,
        "target_language": target_language,
        "plain_language_text": templates.get(message_type, templates["routine_update"]).format(student_ref=student_ref),
        "simplified_student_text": defaults["student_message_template"].format(student_ref=student_ref),
    }))


def _mock_intervention_fixture(request: GenerationRequest) -> MockFixture:
    classroom_id = _mock_classroom_id(request)
    student_refs = _mock_student_refs(request)
    defaults = MOCK_CLASSROOM_DEFAULTS[classroom_id]
    student_ref = student_refs[0] if student_refs else defaults["default_student_ref"]
    return MockFixture(text=json.dumps({
        "observation": f"{student_ref} needed extra support to start the writing task and hesitated when looking at the blank page.",
        "action_taken": f"Used a quick verbal check-in and scaffold supports with {student_ref}, then modelled the first step before releasing to independent work.",
        "outcome": f"{student_ref} completed the first part of the task with more confidence once the scaffold was in place.",
        "follow_up_needed": True,
    }))


MockFixtureEntry = MockFixture | Callable[[GenerationRequest], MockFixture]

MOCK_CLASSROOM_DEFAULTS: dict[str, dict[str, Any]] = {
    ALPHA_CLASSROOM_ID: {
        "default_student_ref": "Ari",
        "student_message_template": "{student_ref}, you worked hard today. Keep using the support tools that help you get started.",
        "family_templates": {
            "praise": "Hi! I wanted to share some good news about {student_ref}'s progress this week. {student_ref} showed stronger focus and follow-through during class today, and that progress was noticeable. We will keep using the same supports that helped this success. Thank you for your support at home!",
            "missed_work": "Hi! I wanted to let you know that {student_ref} still has one classroom task to finish. {student_ref} made a start, but the work was not completed during class time. We will help them re-enter the task tomorrow and can share the next step if needed.",
            "low_stakes_concern": "Hi! I wanted to share a small classroom concern about {student_ref}. {student_ref} needed a few extra prompts to get started today, but responded well once support was in place. We will keep watching this pattern and use the supports that are already helping.",
            "routine_update": "Hi! Here is a quick classroom update about {student_ref}. {student_ref} used the regular classroom supports and stayed engaged with the lesson. We will keep building on that progress during the next few days.",
        },
    },
    DEMO_CLASSROOM_ID: {
        "default_student_ref": "Amira",
        "student_message_template": "{student_ref}, you used the classroom supports well today. Keep starting with the tools that help you explain your thinking.",
        "family_templates": {
            "praise": "Hi! I wanted to share some good news about {student_ref}. Today {student_ref} showed stronger independence once the right classroom support was in place, and that progress was noticeable. We will keep building on that same structure because it is working well.",
            "missed_work": "Hi! I wanted to let you know that {student_ref} still has one classroom task to finish. {student_ref} began the work, but needed more time and support than the block allowed. We will help them re-enter it tomorrow with the same scaffolds that are already helping.",
            "low_stakes_concern": "Hi! I wanted to share a small classroom concern about {student_ref}. {student_ref} needed a few extra prompts to get started today, but responded once the support routine was in place. We will keep watching the pattern and using the supports that are already helping.",
            "routine_update": "Hi! Here is a quick classroom update about {student_ref}. {student_ref} stayed engaged once the classroom supports were in place and was able to keep going with the lesson. We will keep reinforcing that same routine over the next few days.",
        },
    },
}

COMMON_MOCK_PROMPT_FIXTURES: dict[str, MockFixtureEntry] = {
    "differentiate_material": MockFixture(MOCK_DIFFERENTIATION),
    "simplify_for_student": MockFixture(MOCK_SIMPLIFICATION),
    "generate_vocab_cards": MockFixture(MOCK_VOCAB_CARDS),
    "detect_scaffold_decay": MockFixture(MOCK_SCAFFOLD_DECAY),
    "extract_worksheet": MockFixture(MOCK_WORKSHEET_EXTRACTION),
    "balance_ea_load": MockFixture(MOCK_EA_LOAD, MOCK_EA_LOAD_THINKING),
}

MOCK_CLASSROOM_FIXTURES: dict[str, dict[str, MockFixtureEntry]] = {
    ALPHA_CLASSROOM_ID: {
        **COMMON_MOCK_PROMPT_FIXTURES,
        "prepare_tomorrow_plan": MockFixture(MOCK_TOMORROW_PLAN, MOCK_TOMORROW_THINKING),
        "draft_family_message": _mock_family_message_fixture,
        "log_intervention": _mock_intervention_fixture,
        "detect_support_patterns": MockFixture(MOCK_SUPPORT_PATTERNS, MOCK_SUPPORT_PATTERNS_THINKING),
        "generate_ea_briefing": MockFixture(MOCK_EA_BRIEFING),
        "forecast_complexity": MockFixture(MOCK_COMPLEXITY_FORECAST_ALPHA, MOCK_COMPLEXITY_FORECAST_ALPHA_THINKING),
        "generate_survival_packet": MockFixture(MOCK_SURVIVAL_PACKET_ALPHA, MOCK_SURVIVAL_PACKET_THINKING),
    },
    DEMO_CLASSROOM_ID: {
        **COMMON_MOCK_PROMPT_FIXTURES,
        "prepare_tomorrow_plan": MockFixture(MOCK_TOMORROW_PLAN_DEMO, MOCK_TOMORROW_THINKING_DEMO),
        "draft_family_message": _mock_family_message_fixture,
        "log_intervention": _mock_intervention_fixture,
        "detect_support_patterns": MockFixture(MOCK_SUPPORT_PATTERNS_DEMO, MOCK_SUPPORT_PATTERNS_THINKING_DEMO),
        "generate_ea_briefing": MockFixture(MOCK_EA_BRIEFING_DEMO),
        "forecast_complexity": MockFixture(MOCK_COMPLEXITY_FORECAST, MOCK_COMPLEXITY_FORECAST_THINKING),
        "generate_survival_packet": MockFixture(MOCK_SURVIVAL_PACKET_DEMO, MOCK_SURVIVAL_PACKET_THINKING),
    },
}


def _resolve_mock_fixture(
    request: GenerationRequest,
    prompt_class: str | None = None,
) -> MockFixture | None:
    target_prompt = prompt_class or request.prompt_class
    if not target_prompt:
        return None
    classroom_id = _mock_classroom_id(request)
    entry = MOCK_CLASSROOM_FIXTURES.get(classroom_id, {}).get(target_prompt)
    if entry is None:
        return None
    if callable(entry):
        return entry(request)
    return entry

MOCK_RESPONSES: dict[str, str] = {
    "text": MOCK_DIFFERENTIATION,
    "image_text": (
        "I can see a worksheet about community helpers. The passage asks students "
        "to read about people who help in their community and answer three questions."
    ),
    "tool_call": json.dumps({
        "tool_calls": [{
            "name": "lookup_curriculum_outcome",
            "arguments": {
                "grade": "3",
                "subject": "mathematics",
                "keyword": "multiplication"
            }
        }]
    }),
    "plan_tool_call": json.dumps({
        "tool_calls": [{
            "name": "query_intervention_history",
            "arguments": {
                "student_ref": "Ari",
                "days": 14,
                "limit": 3
            }
        }]
    }),
}


class MockBackend:
    """Returns canned responses for offline development."""

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        if request.tools and not request.tool_interactions:
            text = MOCK_RESPONSES["plan_tool_call"] if request.prompt_class == "prepare_tomorrow_plan" else MOCK_RESPONSES["tool_call"]
            tool_calls = json.loads(text).get("tool_calls", [])
            return GenerationResponse(
                text=text, tool_calls=tool_calls, model_id="mock"
            )
        fixture = _resolve_mock_fixture(request)
        if fixture is not None:
            return GenerationResponse(
                text=fixture.text,
                thinking_text=fixture.thinking_text,
                model_id="mock",
            )
        if request.thinking:
            fixture = _resolve_mock_fixture(request, "prepare_tomorrow_plan")
            if fixture is not None:
                return GenerationResponse(
                    text=fixture.text,
                    thinking_text=fixture.thinking_text,
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

_VALID_JSON_ESCAPES = frozenset('"\\bfnrtu/')


def _sanitize_json_control_chars(text: str) -> str:
    """Fix illegal characters inside JSON string values.

    Models sometimes emit:
    - Unescaped control characters (tabs, newlines) inside strings
    - Invalid escape sequences like \\_  (markdown-style underline escaping)

    We walk char-by-char, track whether we're inside a JSON string,
    and fix only characters that would cause JSON.parse() to fail.
    """
    result: list[str] = []
    in_string = False
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == '\\' and in_string and i + 1 < len(text):
            next_ch = text[i + 1]
            if next_ch in _VALID_JSON_ESCAPES:
                # Valid JSON escape — pass through
                result.append(ch)
                result.append(next_ch)
                i += 2
            else:
                # Invalid escape like \_ or \' — drop the backslash
                result.append(next_ch)
                i += 2
            continue
        if ch == '"':
            in_string = not in_string
            result.append(ch)
        elif in_string and ord(ch) < 0x20:
            # Control character inside a string — escape it
            if ch == '\n':
                result.append('\\n')
            elif ch == '\r':
                result.append('\\r')
            elif ch == '\t':
                result.append('\\t')
            else:
                result.append(f'\\u{ord(ch):04x}')
        else:
            result.append(ch)
        i += 1
    return ''.join(result)


def extract_json(raw: str) -> str:
    """Extract JSON from model output that may include prose or markdown fencing.

    Handles:
    - Markdown ```json ... ``` fences
    - Leading/trailing prose around JSON
    - Trailing commas (common Gemma quirk)
    - Unescaped control characters inside JSON strings
    """
    text = raw.strip()

    # Strip markdown fences
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    # Find the outermost JSON structure — prefer whichever bracket appears first
    candidates: list[tuple[int, str, str]] = []
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        idx = text.find(start_char)
        if idx != -1:
            candidates.append((idx, start_char, end_char))
    candidates.sort(key=lambda c: c[0])

    for idx, start_char, end_char in candidates:
        ridx = text.rfind(end_char)
        if ridx > idx:
            candidate = text[idx : ridx + 1]
            candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
            candidate = _sanitize_json_control_chars(candidate)
            return candidate

    # No JSON structure found — return the raw text for downstream handling
    return raw.strip()


# ---------------------------------------------------------------------------
# Hosted Gemini API backend — calls hosted Gemma 4 via AI Studio / Gemini API
# ---------------------------------------------------------------------------


class GeminiAPIBackend:
    """Calls hosted Gemma 4 models through the Gemini API."""

    DEFAULT_MODEL_MAP = {
        ModelTier.LIVE: "gemma-4-26b-a4b-it",
        ModelTier.PLANNING: "gemma-4-31b-it",
    }

    def __init__(
        self,
        api_key: str | None = None,
        live_model: str | None = None,
        planning_model: str | None = None,
        client: Any | None = None,
    ) -> None:
        self.api_key = api_key or self._resolve_api_key()
        self.live_model = (
            live_model
            or os.environ.get("PRAIRIE_GEMINI_MODEL_ID_LIVE", "").strip()
            or self.DEFAULT_MODEL_MAP[ModelTier.LIVE]
        )
        self.planning_model = (
            planning_model
            or os.environ.get("PRAIRIE_GEMINI_MODEL_ID_PLANNING", "").strip()
            or self.DEFAULT_MODEL_MAP[ModelTier.PLANNING]
        )
        self.http_timeout_ms_by_tier = {
            ModelTier.LIVE: self._resolve_http_timeout_ms(ModelTier.LIVE),
            ModelTier.PLANNING: self._resolve_http_timeout_ms(ModelTier.PLANNING),
        }

        if client is not None:
            self.client = client
            self.client_by_tier = {
                ModelTier.LIVE: client,
                ModelTier.PLANNING: client,
            }
        else:
            if genai is None:
                raise RuntimeError("google-genai dependency is not available for Gemini API mode.")
            self.client_by_tier = {
                tier: genai.Client(
                    api_key=self.api_key,
                    http_options=genai.types.HttpOptions(timeout=timeout_ms),
                )
                for tier, timeout_ms in self.http_timeout_ms_by_tier.items()
            }
            self.client = self.client_by_tier[ModelTier.LIVE]

    @staticmethod
    def _resolve_api_key() -> str:
        for env_name in GEMINI_API_KEY_ENV_VARS:
            value = os.environ.get(env_name, "").strip()
            if value:
                return value
        raise RuntimeError(
            "Gemini API key is required for hosted Gemma 4 mode. "
            "Set PRAIRIE_GEMINI_API_KEY or GEMINI_API_KEY."
        )

    @staticmethod
    def _resolve_http_timeout_ms(tier: ModelTier) -> int:
        raw = os.environ.get(GEMINI_HTTP_TIMEOUT_ENV, "").strip()
        if not raw:
            return DEFAULT_GEMINI_HTTP_TIMEOUT_MS_BY_TIER[tier]
        try:
            parsed = int(raw, 10)
        except ValueError:
            return DEFAULT_GEMINI_HTTP_TIMEOUT_MS_BY_TIER[tier]
        return parsed if parsed > 0 else DEFAULT_GEMINI_HTTP_TIMEOUT_MS_BY_TIER[tier]

    def _client_for_tier(self, tier: ModelTier) -> Any:
        return self.client_by_tier[tier]

    def _model_for_tier(self, tier: ModelTier) -> str:
        if tier == ModelTier.PLANNING:
            return self.planning_model
        return self.live_model

    @staticmethod
    def _split_prompt(prompt: str) -> tuple[str | None, str]:
        for delimiter in PROMPT_SPLIT_DELIMITERS:
            idx = prompt.find(delimiter)
            if idx > 0:
                return prompt[:idx].strip(), prompt[idx:].strip()
        return None, prompt

    @staticmethod
    def _guess_mime_type(file_path: str) -> str:
        mime_type, _ = mimetypes.guess_type(file_path)
        return mime_type or "image/png"

    def _build_contents(self, request: GenerationRequest) -> list[dict[str, Any]]:
        _system_instruction, user_text = self._split_prompt(request.prompt)
        parts: list[dict[str, Any]] = []

        for img_path in request.images:
            try:
                with open(img_path, "rb") as handle:
                    image_bytes = handle.read()
            except OSError:
                continue

            parts.append(
                {
                    "inline_data": {
                        "mime_type": self._guess_mime_type(img_path),
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    }
                }
            )

        parts.append({"text": user_text})
        return [
            {"role": "user", "parts": parts},
            *gemini_tool_history_contents(request.tool_interactions),
        ]

    def _build_config(self, request: GenerationRequest) -> dict[str, Any]:
        system_instruction, _user_text = self._split_prompt(request.prompt)
        config: dict[str, Any] = {
            "temperature": 0.7,
            "max_output_tokens": request.max_tokens,
        }
        if system_instruction:
            config["system_instruction"] = system_instruction
        # All 13 PrairieClassroom prompt classes emit JSON. Locking the response
        # MIME type cuts the "model returned prose instead of JSON" failure mode
        # at its source. extract_json() in the harness still defends against
        # legacy markdown-fenced replies from older Gemma builds.
        config["response_mime_type"] = "application/json"
        declarations = gemini_function_declarations(request.tools)
        if declarations:
            config["tools"] = [{"function_declarations": declarations}]
        return config

    @staticmethod
    def _normalize_response(value: Any) -> Any:
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, list):
            return [GeminiAPIBackend._normalize_response(item) for item in value]
        if isinstance(value, dict):
            return {key: GeminiAPIBackend._normalize_response(item) for key, item in value.items()}
        if hasattr(value, "to_json_dict"):
            try:
                return GeminiAPIBackend._normalize_response(value.to_json_dict())
            except Exception:
                pass
        if hasattr(value, "model_dump"):
            try:
                return GeminiAPIBackend._normalize_response(value.model_dump(mode="json", exclude_none=True))
            except Exception:
                pass
        if hasattr(value, "__dict__"):
            return GeminiAPIBackend._normalize_response(vars(value))
        return value

    @staticmethod
    def _extract_generation(payload: Any, fallback_text: str | None = None) -> tuple[str, str | None]:
        normalized = GeminiAPIBackend._normalize_response(payload)

        if isinstance(normalized, dict):
            candidates = normalized.get("candidates")
            if isinstance(candidates, list) and candidates:
                candidate = candidates[0]
                if isinstance(candidate, dict):
                    content = candidate.get("content", {})
                    parts = content.get("parts", []) if isinstance(content, dict) else []
                    text_parts: list[str] = []
                    thought_parts: list[str] = []
                    if isinstance(parts, list):
                        for part in parts:
                            if not isinstance(part, dict):
                                continue
                            text = part.get("text")
                            if not isinstance(text, str) or not text.strip():
                                continue
                            if part.get("thought") or part.get("thought_signature"):
                                thought_parts.append(text)
                            else:
                                text_parts.append(text)
                    if text_parts or thought_parts:
                        output_text = "\n".join(text_parts).strip() or (fallback_text or "")
                        thinking_text = "\n".join(thought_parts).strip() or None
                        return output_text, thinking_text

            if isinstance(normalized.get("text"), str) and normalized["text"].strip():
                return normalized["text"], None

        if isinstance(normalized, str) and normalized.strip():
            return normalized, None

        if fallback_text and fallback_text.strip():
            return fallback_text, None

        return json.dumps(normalized), None

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        model = self._model_for_tier(request.model_tier)
        client = self._client_for_tier(request.model_tier)
        contents = self._build_contents(request)
        config = self._build_config(request)

        start = time.perf_counter()
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            return GenerationResponse(
                text=json.dumps({"error": str(exc)}),
                model_id=model,
                latency_ms=latency_ms,
            )

        latency_ms = (time.perf_counter() - start) * 1000
        fallback_text = getattr(response, "text", None)
        output_text, thinking_text = self._extract_generation(response, fallback_text=fallback_text)
        tool_calls = extract_tool_calls(self._normalize_response(response))
        output_text = extract_json(output_text)
        prompt_tokens, output_tokens, total_tokens = self._extract_usage(response)

        return GenerationResponse(
            text=output_text,
            tool_calls=tool_calls,
            thinking_text=thinking_text,
            model_id=model,
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
        )

    @staticmethod
    def _extract_usage(response: Any) -> tuple[int | None, int | None, int | None]:
        """Pull token counts from Gemini's usage_metadata; tolerate missing fields."""
        usage = getattr(response, "usage_metadata", None)
        if usage is None:
            normalized = GeminiAPIBackend._normalize_response(response)
            if isinstance(normalized, dict):
                usage = normalized.get("usage_metadata") or normalized.get("usageMetadata")
        if usage is None:
            return None, None, None

        def _read(obj: Any, *keys: str) -> int | None:
            for key in keys:
                if isinstance(obj, dict) and key in obj and obj[key] is not None:
                    try:
                        return int(obj[key])
                    except (TypeError, ValueError):
                        continue
                value = getattr(obj, key, None)
                if value is not None:
                    try:
                        return int(value)
                    except (TypeError, ValueError):
                        continue
            return None

        prompt_tokens = _read(usage, "prompt_token_count", "promptTokenCount")
        output_tokens = _read(usage, "candidates_token_count", "candidatesTokenCount")
        total_tokens = _read(usage, "total_token_count", "totalTokenCount")
        if total_tokens is None and prompt_tokens is not None and output_tokens is not None:
            total_tokens = prompt_tokens + output_tokens
        return prompt_tokens, output_tokens, total_tokens


# ---------------------------------------------------------------------------
# Vertex AI backend — calls self-deployed Gemma endpoints
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class VertexEndpointConfig:
    endpoint: str
    model_id: str


class VertexAIBackend:
    """Calls self-deployed Gemma endpoints on Vertex AI via raw_predict."""

    DEFAULT_MODEL_MAP = {
        ModelTier.LIVE: "google/gemma-4-4b-it",
        ModelTier.PLANNING: "google/gemma-4-27b-it",
    }
    ENDPOINT_ENV_MAP = {
        ModelTier.LIVE: "PRAIRIE_VERTEX_ENDPOINT_LIVE",
        ModelTier.PLANNING: "PRAIRIE_VERTEX_ENDPOINT_PLANNING",
    }
    MODEL_ENV_MAP = {
        ModelTier.LIVE: "PRAIRIE_VERTEX_MODEL_ID_LIVE",
        ModelTier.PLANNING: "PRAIRIE_VERTEX_MODEL_ID_PLANNING",
    }

    def __init__(self) -> None:
        self._endpoint_clients: dict[ModelTier, Any] = {}
        self._sdk_initialized = False
        if not paid_services_enabled():
            raise RuntimeError(
                "Vertex AI mode is blocked unless PRAIRIE_ALLOW_PAID_SERVICES=true. "
                "This repo defaults to zero-cloud-spend."
            )
        backend_mode = os.environ.get("PRAIRIE_VERTEX_BACKEND", "").strip()
        if backend_mode != "endpoint":
            raise RuntimeError(
                "PRAIRIE_VERTEX_BACKEND must be set to 'endpoint' for Vertex AI endpoint mode."
            )

        self.project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
        if not self.project:
            raise RuntimeError(
                "GOOGLE_CLOUD_PROJECT environment variable is required for Vertex AI mode. "
                "Set it to your GCP project ID."
            )

        self.endpoint_map: dict[ModelTier, VertexEndpointConfig] = {}
        for tier, endpoint_env in self.ENDPOINT_ENV_MAP.items():
            endpoint = os.environ.get(endpoint_env, "").strip()
            if not endpoint:
                raise RuntimeError(
                    f"{endpoint_env} is required for Vertex AI endpoint mode. "
                    "Use the full endpoint resource name, e.g. "
                    "'projects/<project>/locations/<region>/endpoints/<endpoint-id>'."
                )
            if not endpoint.startswith("projects/"):
                raise RuntimeError(
                    f"{endpoint_env} must be a full endpoint resource name, got: {endpoint}"
                )
            model_id = os.environ.get(
                self.MODEL_ENV_MAP[tier],
                self.DEFAULT_MODEL_MAP[tier],
            ).strip()
            self.endpoint_map[tier] = VertexEndpointConfig(
                endpoint=endpoint,
                model_id=model_id,
            )

    def _get_endpoint_client(self, model_tier: ModelTier):
        existing = self._endpoint_clients.get(model_tier)
        if existing is not None:
            return existing

        from google.cloud import aiplatform

        if not self._sdk_initialized:
            aiplatform.init(project=self.project, location=self.location)
            self._sdk_initialized = True
            print(
                f"Vertex AI endpoint client initialized — project={self.project}, location={self.location}"
            )

        endpoint_config = self.endpoint_map.get(
            model_tier,
            self.endpoint_map[ModelTier.LIVE],
        )
        endpoint_client = aiplatform.Endpoint(endpoint_name=endpoint_config.endpoint)
        self._endpoint_clients[model_tier] = endpoint_client
        return endpoint_client

    @staticmethod
    def _split_prompt(prompt: str) -> tuple[str | None, str]:
        system_instruction = None
        user_text = prompt

        for delimiter in [
            "\n\nCLASSROOM CONTEXT:",
            "\n\nARTIFACT:",
            "\n\nTEACHER INPUT:",
            "\n\nSTUDENT TEXT:",
            "\n\nINTERVENTION NOTE:",
            "\n\nSOURCE TEXT:",
            "\n\nCLASSROOM MEMORY:",
        ]:
            idx = prompt.find(delimiter)
            if idx > 0:
                system_instruction = prompt[:idx].strip()
                user_text = prompt[idx:].strip()
                break

        return system_instruction, user_text

    @staticmethod
    def _guess_mime_type(file_path: str) -> str:
        mime_type, _ = mimetypes.guess_type(file_path)
        return mime_type or "image/png"

    def _build_chat_messages(self, request: GenerationRequest) -> list[dict[str, Any]]:
        system_instruction, user_text = self._split_prompt(request.prompt)
        messages: list[dict[str, Any]] = []

        if system_instruction:
            messages.append(
                {
                    "role": "system",
                    "content": [{"type": "text", "text": system_instruction}],
                }
            )

        user_content: list[dict[str, Any]] = []
        for img_path in request.images:
            try:
                with open(img_path, "rb") as handle:
                    image_bytes = handle.read()
            except FileNotFoundError:
                continue

            mime_type = self._guess_mime_type(img_path)
            encoded = base64.b64encode(image_bytes).decode("ascii")
            user_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{encoded}"},
                }
            )

        user_content.append({"type": "text", "text": user_text})
        messages.append({"role": "user", "content": user_content})
        messages.extend(openai_tool_history_messages(request.tool_interactions))
        return messages

    def _build_payload(self, request: GenerationRequest) -> dict[str, Any]:
        instance: dict[str, Any] = {
            "@requestFormat": "chatCompletions",
            "messages": self._build_chat_messages(request),
            "max_tokens": request.max_tokens,
            "temperature": 0.7,
        }
        if request.thinking:
            instance["metadata"] = {"thinking_requested": True}
        tools = openai_chat_tools(request.tools)
        if tools:
            instance["tools"] = tools
            instance["tool_choice"] = "auto"
        return {"instances": [instance]}

    @staticmethod
    def _coerce_content_to_text(content: Any) -> str | None:
        if content is None:
            return None
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                text = VertexAIBackend._coerce_content_to_text(item)
                if text:
                    parts.append(text)
            return "\n".join(parts) if parts else None
        if isinstance(content, dict):
            if isinstance(content.get("text"), str):
                return content["text"]
            if isinstance(content.get("content"), (str, list, dict)):
                return VertexAIBackend._coerce_content_to_text(content["content"])
            if isinstance(content.get("message"), dict):
                return VertexAIBackend._coerce_content_to_text(content["message"])
            if isinstance(content.get("generated_text"), str):
                return content["generated_text"]
        return None

    def _extract_generation(self, payload: Any) -> tuple[str, str | None]:
        if isinstance(payload, dict):
            choices = payload.get("choices")
            if isinstance(choices, list) and choices:
                choice = choices[0]
                if isinstance(choice, dict):
                    message = choice.get("message", {})
                    text = self._coerce_content_to_text(message.get("content"))
                    thinking = self._coerce_content_to_text(
                        message.get("reasoning_content") or choice.get("reasoning_content")
                    )
                    if text:
                        return text, thinking

            predictions = payload.get("predictions")
            if isinstance(predictions, list) and predictions:
                return self._extract_generation(predictions[0])
            if isinstance(predictions, dict):
                return self._extract_generation(predictions)

            for key in ["generated_text", "text", "output"]:
                text = self._coerce_content_to_text(payload.get(key))
                if text:
                    return text, None

        if isinstance(payload, list) and payload:
            return self._extract_generation(payload[0])

        text = self._coerce_content_to_text(payload)
        if text:
            return text, None

        return json.dumps(payload), None

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        endpoint_config = self.endpoint_map.get(
            request.model_tier,
            self.endpoint_map[ModelTier.LIVE],
        )
        endpoint_client = self._get_endpoint_client(request.model_tier)
        payload = self._build_payload(request)

        start = time.perf_counter()
        try:
            response = endpoint_client.raw_predict(
                body=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
        except Exception as e:
            latency_ms = (time.perf_counter() - start) * 1000
            return GenerationResponse(
                text=json.dumps({"error": str(e)}),
                model_id=endpoint_config.model_id,
                latency_ms=latency_ms,
            )
        latency_ms = (time.perf_counter() - start) * 1000

        if response.status_code >= 400:
            return GenerationResponse(
                text=json.dumps({"error": f"HTTP {response.status_code}: {response.text}"}),
                model_id=endpoint_config.model_id,
                latency_ms=latency_ms,
            )

        try:
            response_payload = json.loads(response.text)
        except json.JSONDecodeError:
            response_payload = response.text

        output_text, thinking_text = self._extract_generation(response_payload)
        tool_calls = extract_tool_calls(response_payload)
        output_text = extract_json(output_text)

        return GenerationResponse(
            text=output_text,
            tool_calls=tool_calls,
            thinking_text=thinking_text,
            model_id=endpoint_config.model_id,
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
        elif mode == InferenceMode.OLLAMA:
            from ollama_backend import OllamaBackend
            self.backend = OllamaBackend()
        elif mode == InferenceMode.GEMINI:
            self.backend = GeminiAPIBackend()
        else:
            raise ValueError(f"Unknown inference mode: {mode}")

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        return self.backend.generate(request)


# ---------------------------------------------------------------------------
# Smoke tests
# ---------------------------------------------------------------------------

def run_smoke_tests(harness: GemmaHarness) -> bool:
    """Run harness smoke tests for the active backend."""
    passed = 0
    total = 4 if harness.mode == InferenceMode.MOCK else 3

    def classify_error_text(text: str) -> str:
        normalized = text.lower()
        if any(token in normalized for token in [
            "permission_denied",
            "aiplatform.endpoints.predict",
            "quota project",
            "endpoint mode",
            "prairie_vertex_endpoint",
            "endpoint resource name",
            "deployed model",
            "raw_predict",
            "endpoint",
            "not_found",
        ]):
            return "auth/model-access"
        if any(token in normalized for token in [
            "json",
            "schema",
            "missing key",
            "required key",
            "parse",
        ]):
            return "parse/schema"
        return "other"

    def inspect_response(resp: GenerationResponse) -> tuple[bool, str | None]:
        text = resp.text.strip()
        if not text:
            return False, "empty model response"
        if text.startswith('{"error"'):
            try:
                payload = json.loads(text)
                message = str(payload.get("error", text))
            except json.JSONDecodeError:
                message = text
            category = classify_error_text(message)
            return False, f"{category}: {message}"
        return True, None

    # Test 1: Text prompt
    print(f"\n[1/{total}] Text prompt...")
    resp = harness.generate(GenerationRequest(prompt="Differentiate this reading passage for mixed levels."))
    ok, detail = inspect_response(resp)
    print(f"  {'PASS' if ok else 'FAIL'} — {detail or f'got {len(resp.text)} chars'}")
    passed += ok

    # Test 2: Image + text prompt
    print(f"[2/{total}] Image + text prompt...")
    resp = harness.generate(GenerationRequest(
        prompt="Describe this worksheet and suggest how to adapt it.",
        images=["placeholder.png"],
    ))
    ok, detail = inspect_response(resp)
    print(f"  {'PASS' if ok else 'FAIL'} — {detail or f'got {len(resp.text)} chars'}")
    passed += ok

    # Test 3: Thinking mode
    print(f"[3/{total}] Thinking mode...")
    resp = harness.generate(GenerationRequest(
        prompt="Plan tomorrow's support priorities for a class with 3 EAL students and 2 needing transition support.",
        thinking=True,
        model_tier=ModelTier.PLANNING,
    ))
    text_ok, detail = inspect_response(resp)
    ok = resp.thinking_text is not None or text_ok
    if ok:
        print(f"  PASS — thinking={'yes' if resp.thinking_text else 'no'}")
    else:
        print(f"  FAIL — {detail or 'no thinking text returned'}")
    passed += ok

    if harness.mode == InferenceMode.MOCK:
        # Test 4: Tool call round trip (mock-only; current live stack is text generation only)
        print(f"[4/{total}] Tool call round trip...")
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
    parser.add_argument("--mode", choices=["mock", "api", "local", "ollama", "gemini"], default="mock")
    parser.add_argument("--model-id", type=str, default=None)
    parser.add_argument("--smoke-test", action="store_true")
    args = parser.parse_args()

    if args.mode == InferenceMode.GEMINI.value:
        require_gemini_run_guard()

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
