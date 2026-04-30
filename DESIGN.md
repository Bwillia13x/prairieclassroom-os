# Design System: PrairieClassroom OS
**Project ID:** local-prairieclassroom-predev

## 1. Visual Theme & Atmosphere

PrairieClassroom OS is a dense, operational classroom cockpit: calm, precise, and teacher-facing rather than decorative. Dark mode follows the PrairieClassroom color-board reference with a blackened neutral workspace, a deep Prairie-blue brand rail, wheat-gold judgment marks, green live/success signals, and rust reserved for true critical states. The design should feel trusted and institutional, but still warm enough to belong in an Alberta classroom.

## 2. Color Palette & Roles

- **Blackened Classroom Canvas** (`#020b12`): dark-mode browser-edge and page background; keeps the experience grounded without becoming blue-dominant.
- **Near-Black Workspace** (`#061421`): dark-mode application workspace behind panels and command surfaces.
- **Neutral Night Card** (`#0b1622`): primary dark-mode card and form surface.
- **Raised Neutral Panel** (`#0f1e2d`): elevated command blocks, popovers, dialogs, and prominent panels.
- **Inset Neutral Surface** (`#162331`): nested panels, disabled fields, and subdued metric wells.
- **Prairie Blue Rail** (`#081d33`): brand rail, inverse navigation, and logo-side surfaces.
- **Prairie Blue Hover** (`#173a63`): hover and secondary inverse rail states.
- **Primary Series Blue** (`#2563e8`): chart primary series and rare high-signal data marks.
- **Wheat-Gold Action** (`#d4a333`): selected states, active rails, focus, warnings, queue attention, judgment prompts, and evidence actions.
- **Pale Gold Emphasis** (`#ead9b3`): dark-mode accent text and hover highlights where gold needs lift.
- **Prairie Green Success** (`#2fb67c`): live, completed, healthy, achieved coverage, and success indicators.
- **Rust Critical** (`#c2410c`): errors, urgent/critical states, destructive intent, and high-risk badges only.
- **Teal Information** (`#0891b2`): informational labels and support hints, never broad background color.
- **Neutral Text White** (`#f8fafc`): primary dark-mode text.
- **Soft Neutral Text** (`#e5e7eb`, `#d1d5db`, `#9ca3af`): secondary, tertiary, and disabled text.

## 3. Typography Rules

Display typography uses the dotted, instrument-like display face only for real hero and command moments. Body and tool copy use the sans/UI stack for fast scanning. Labels, metadata, command keys, and tabular values use the monospace stack with zero letter-spacing. Dark mode should not soften text through opacity; use semantic neutral text tokens so contrast remains measurable.

## 4. Component Stylings

* **Buttons:** Primary institutional actions may use Prairie blue in light mode and wheat-gold action emphasis in dark mode. Secondary controls sit on neutral card surfaces with clear borders. Active choices get a restrained gold rail or underline, not a red proof mark.
* **Cards/Containers:** Dark cards are neutral night panels with sharp, squared-off 2px corners and thin neutral borders. Blue fills are reserved for navigation and inverse brand surfaces, not routine content cards.
* **Inputs/Forms:** Inputs use neutral dark fills, discoverable neutral borders, and gold focus treatment. Placeholder and helper text use soft neutral values instead of low-opacity white.
* **Navigation:** The rail is the strongest Prairie-blue surface. Active navigation uses gold marks over blue, with cream/white text. Count badges use gold unless the state is truly critical.
* **Status:** Green means live/success/coverage. Gold means warning, attention, or in progress. Rust means critical/error/destructive. Teal means information.

## 5. Layout Principles

The application uses measured, cockpit-like density: thin rules, aligned panels, command frames, and evidence rails. Page sections should feel framed and legible, not card-heavy or decorative. Broad dark surfaces remain neutral and near-black; color appears as low-area information architecture so teachers can scan status, risk, and next action quickly.

