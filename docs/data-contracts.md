# Data Contracts

## Core entities

### ClassroomProfile
- id
- grade_band
- subject_focus
- classroom_notes
- routines
- support_constraints

### StudentSupportSummary
- student_id
- initials_or_alias
- eal_flag
- support_tags
- known_successful_scaffolds
- communication_notes

### LessonArtifact
- artifact_id
- source_type
- source_path_or_blob_ref
- title
- subject
- raw_text_excerpt
- capture_timestamp

### DifferentiatedVariant
- variant_id
- artifact_id
- variant_type
- student_facing_instructions
- teacher_notes
- required_materials
- estimated_minutes
- schema_version

### TomorrowPlan
- plan_id
- classroom_id
- source_artifact_ids
- transition_watchpoints
- support_priorities
- ea_actions
- prep_checklist
- family_followups
- schema_version

### InterventionRecord
- record_id
- classroom_id
- student_refs
- observation
- action_taken
- outcome
- follow_up_needed
- created_at

### FamilyMessageDraft
- draft_id
- classroom_id
- message_type
- target_language
- plain_language_text
- teacher_approved
- approval_timestamp

## Contract rules

- Every persisted model output gets a schema version.
- Observation and inference should be stored separately where possible.
- Free text is allowed, but only after core required fields are captured.
- Retrieval should prefer summaries plus links to raw source material.
