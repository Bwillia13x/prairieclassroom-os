---
name: prairie-signal-design
description: Generate UI, UX, and interface concepts in the Prairie Signal CONSULTING-STUDIO design language (calm, premium, editorial-warm, serif display, cream canvas). Do NOT apply to the PrairieClassroom product, which uses a different, institutional palette — see scope note below.
---

# Prairie Signal Design

> **Scope note (added 2026-04-17).** This skill is authored for the **PrairieSignal consulting-studio / founder-facing brand**. It is *not* the design system for the **PrairieClassroom** teacher-facing product. PrairieClassroom was repositioned to an institutional neutral + Alberta-navy palette on 2026-04-17 (see `docs/decision-log.md` and `docs/dark-mode-contract.md`). If your task is in `apps/web` or touches classroom-product surfaces, **do not invoke this skill** — use the product's token system (`apps/web/src/styles/tokens.css`) as the source of truth instead.

A design-system skill for generating interfaces in the **Prairie Signal** visual language.

This style is not flashy consumer SaaS. It is:
- calm
- precise
- premium
- technical
- spacious
- operationally serious
- high-legibility
- diagram-first
- consulting-grade

Use this skill when the user wants a UI or UX concept that should feel like a serious frontier product, analytical workspace, premium dashboard, studio environment, or decision-support interface.

## When to use this skill

Use this skill when the user asks for any of the following:
- “Make this look premium”
- “Use Prairie Signal style”
- “Design a serious dashboard”
- “Create a consulting-grade interface”
- “Build a clean AI studio UI”
- “Make this feel like a high-end strategy product”
- “Create a classroom/ops/analysis interface with strong hierarchy”
- “Turn this into a polished React/Tailwind interface”

This skill is especially appropriate for:
- AI tools
- decision-support systems
- classroom coordination tools
- analytics dashboards
- workspace / studio UIs
- operational consoles
- founder / consulting sites
- internal tools that need clarity and trust

## Core design philosophy

Design every interface as if it must help someone:
1. understand the situation quickly,
2. identify what matters,
3. take the next correct action.

The style should always communicate:
- trust
- order
- clarity
- seriousness
- restraint
- quality

The interface should feel **composed**, not decorated.

## Visual identity

### Overall mood
- calm and modern
- premium but restrained
- editorial where helpful
- technical without looking cold
- quiet confidence
- spacious and intentional

### Surfaces
Default to:
- warm off-white
- soft cream
- light paper tones
- muted neutral backgrounds

Dark mode is allowed, but it should feel like an **operations room**, not neon cyberpunk.

### Color behavior
Use accent color sparingly and intentionally.
Accents should guide attention, not fill space.

Preferred accent families:
- prairie blue / cobalt
- slate blue
- muted sage
- restrained bronze or sand for subtle emphasis

Do not create loud rainbow palettes or oversaturated startup gradients unless explicitly requested.

## Hierarchy rules

Every interface should have a clear hierarchy with minimal ambiguity.

### Preferred hierarchy pattern
1. **Primary layer**  
   Main purpose, title, key decision, or dominant task.

2. **Secondary layer**  
   Supporting context, panels, metrics, notes, evidence, controls.

3. **Tertiary layer**  
   Metadata, timestamps, status text, provenance, system details.

Avoid cluttered intermediate levels.

### Headlines
- strong and clear
- concise
- high contrast
- not overly decorative

### Body text
- crisp
- readable
- moderate line length
- plain English when possible

### Metadata
- smaller
- quieter
- often uppercase or mono-friendly
- visually distinct from body copy

## Layout principles

### Default layout behavior
Prefer:
- strong margins
- generous whitespace
- visible grid logic
- balanced vertical rhythm
- obvious grouping
- split-pane workflows where useful

### Good layout archetypes
- split-pane studio
- command + results workspace
- dashboard with strong summary row
- document-style briefing page
- side rail + main analysis surface
- timeline + detail panel
- board of structured cards with clear grouping

### Avoid
- crowded card walls
- excessive nested containers
- decorative empty widgets
- dense enterprise UI with no breathing room
- random floating controls

## Component language

Components should feel:
- engineered
- restrained
- useful
- tactile in a subtle way
- elegant under repetition

### Good default components
- summary cards
- KPI strips
- timeline panels
- evidence drawers
- decision logs
- notebook-like note panels
- split-view canvases
- command bars
- right-side AI copilot drawers
- artifact history rails
- structured input blocks
- clean tables with strong typography
- status pills with minimal color

### Buttons
Buttons should feel intentional and clean:
- primary button: high-contrast fill or strong bordered emphasis
- secondary button: subtle border, low-noise surface
- tertiary actions: text or ghost style

Do not make buttons oversized, bubbly, or overly playful unless explicitly requested.

### Cards
Cards should be:
- lightly elevated or flat with thin borders
- roomy
- content-led
- not over-rounded
- not glassy by default

### Tables
Tables should be:
- high-legibility
- lightly ruled
- carefully spaced
- optimized for scanning
- styled like briefing artifacts, not spreadsheet dumps

## Typography guidance

Use typography to create trust.

### Font behavior
Prefer clean, modern sans-serif for the core interface.

Good families in implementation:
- Inter
- Geist
- system sans stacks
- other neutral high-legibility modern sans fonts

Optional:
- a restrained serif accent for page titles or editorial sections
- mono for metadata, technical labels, timestamps, IDs

### Typography principles
- large, confident titles
- crisp section headings
- disciplined label styles
- readable body copy
- subdued metadata
- avoid oversized decorative type treatments unless explicitly requested

## Motion and interaction

Motion should be:
- subtle
- fast
- purposeful
- non-playful
- informative

Use:
- soft fades
- light slide transitions
- small state shifts
- hover emphasis through contrast, border, or elevation changes

Avoid:
- bounce
- elastic motion
- flashy loading animation
- ornamental movement

## Information design principles

This skill should prioritize **structured thinking**.

Whenever possible:
- show source/context near decisions
- separate summary from detail
- expose relationships between objects
- use layout to reduce cognitive load
- make next actions obvious
- surface the most important information first

If the interface contains AI outputs:
- include provenance or evidence space when relevant
- visually separate generated content from confirmed data
- show status, timestamps, or confidence cues where useful

## Platform output rules

### For React/Tailwind
Generate:
- production-quality structure
- clean spacing scale
- reusable cards/panels
- utility classes with restraint
- minimal but refined interaction states

### For HTML/CSS
Generate:
- semantic HTML
- modern CSS with clear sections
- maintainable class names
- accessible structure
- layout clarity over visual tricks

### For product/UI concepts
Generate:
- a clear screen structure
- named regions
- interaction intent
- rationale for hierarchy
- optional component breakdown

## Accessibility rules

Always preserve:
- strong contrast
- readable sizing
- clear states
- touch-friendly targets where relevant
- low cognitive overload
- strong information grouping

Do not sacrifice readability for aesthetic minimalism.

## Default design checklist

When using this skill, make sure the result has:
- a strong title and summary layer
- clear grouping and spacing
- disciplined color usage
- premium restraint
- obvious information hierarchy
- low-noise surfaces
- polished but not trendy interactions
- readability first
- layout logic that reflects the task

## Do not

Do not produce:
- generic startup gradient spam
- glossy SaaS clichés
- oversized neon glassmorphism
- noisy dashboards with weak hierarchy
- overly playful illustrations by default
- cartoonish controls
- visual chaos disguised as “modern”
- consumer-social app aesthetics unless explicitly requested

## Preferred workflow when responding

When asked to design or generate UI in this style:

1. Infer the product/task context.
2. Identify the main decision or workflow the screen supports.
3. Choose the simplest layout that supports that workflow clearly.
4. Apply Prairie Signal hierarchy, spacing, and restraint.
5. Generate the requested output in the specified platform.
6. Keep the result implementation-ready whenever possible.

## Examples

### Example requests
- “Design this dashboard in Prairie Signal style.”
- “Create a React/Tailwind homepage for an AI consulting studio using Prairie Signal design.”
- “Make this classroom operations dashboard feel premium and serious.”
- “Turn this messy analytics UI into a calm, consulting-grade interface.”
- “Build a split-pane AI workspace in Prairie Signal style.”

### Example response posture
When the skill is active, default toward:
- fewer but better elements
- stronger hierarchy
- more whitespace
- restrained accents
- premium operational polish

## Final instruction

Whenever this skill is active, generate interfaces that feel like they belong in a **serious, beautifully designed decision-support product**.

The result should look:
- calm
- polished
- premium
- highly legible
- operationally credible
- unmistakably intentional
