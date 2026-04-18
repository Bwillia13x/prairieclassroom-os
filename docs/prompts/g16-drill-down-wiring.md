# G-16 Drill-Down Wiring and Testing - Agent Prompt

## Objective
Complete the remaining G-16 work by wiring drill-down functionality on four panels (TomorrowPlanPanel, DifferentiatePanel, SupportPatternsPanel, InterventionPanel), adding regression tests, and updating documentation to close out G-16.

## Context

### DrillDownDrawer Pattern
The drill-down pattern uses the `DrillDownDrawer` component (`apps/web/src/components/DrillDownDrawer.tsx`) which accepts:
- `isOpen: boolean` - controls drawer visibility
- `context: DrillDownContext | null` - the drill-down context data
- `onClose: () => void` - close handler

`DrillDownContext` is a union type with variants for different chart types:
- `PlanCoverageSection` - for PlanCoverageRadar drill-downs
- `VariantLane` - for VariantSummaryStrip drill-downs
- `SupportPattern` - for SupportPatternRadar drill-downs
- `FollowUpMetric` - for FollowUpSuccessRate drill-downs
- `InterventionEvent` - for InterventionTimeline drill-downs

Reference implementation exists in `TodayPanel.tsx` (lines 250-355) where `HealthBar` uses `onTrendClick` to set drill-down state and open the drawer.

### Chart Component Callback Signatures
All chart components are in `apps/web/src/components/DataVisualizations.tsx`:

1. **PlanCoverageRadar** (lines 1652-1710)
   - Callback: `onSegmentClick?: (segment: string) => void`
   - Context type: `PlanCoverageSection`
   - View component: `PlanCoverageSectionView.tsx`

2. **VariantSummaryStrip** (lines 1712-1756)
   - Callback: `onSegmentClick?: (variant: string) => void`
   - Context type: `VariantLane`
   - View component: `VariantLaneView.tsx`

3. **SupportPatternRadar** (lines 865-1005)
   - Callback: `onSegmentClick?: (axis: string) => void`
   - Context type: `SupportPattern`
   - View component: `SupportPatternView.tsx` (may need creation)

4. **FollowUpSuccessRate** (lines 1470-1553)
   - Callback: `onSegmentClick?: (segment: string) => void`
   - Context type: `FollowUpMetric`
   - View component: `FollowUpMetricView.tsx` (may need creation)

5. **InterventionTimeline** (lines 1555-1633)
   - Callback: `onDotClick?: (event: InterventionEvent) => void`
   - Context type: `InterventionEvent`
   - View component: `InterventionEventView.tsx` (may need creation)

### Panel Locations
- `TomorrowPlanPanel.tsx` - in `apps/web/src/panels/`
- `DifferentiatePanel.tsx` - in `apps/web/src/panels/`
- `SupportPatternsPanel.tsx` - in `apps/web/src/panels/`
- `InterventionPanel.tsx` - in `apps/web/src/panels/`

## Tasks

### Task 1: Wire PlanCoverageRadar drill-down on TomorrowPlanPanel
1. Locate `TomorrowPlanPanel.tsx` and find the `PlanCoverageRadar` component usage
2. Add state: `const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null)`
3. Add callback handler:
   ```typescript
   const handlePlanCoverageClick = (segment: string) => {
     setDrillDown({ type: 'PlanCoverageSection', segment });
   };
   ```
4. Pass `onSegmentClick={handlePlanCoverageClick}` to `PlanCoverageRadar`
5. Add `DrillDownDrawer` component at the bottom:
   ```tsx
   <DrillDownDrawer
     isOpen={drillDown !== null}
     context={drillDown}
     onClose={() => setDrillDown(null)}
   />
   ```
6. Verify `PlanCoverageSectionView.tsx` exists and renders correctly for the context

### Task 2: Wire VariantSummaryStrip drill-down on DifferentiatePanel
1. Locate `DifferentiatePanel.tsx` and find the `VariantSummaryStrip` component usage
2. Add state: `const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null)`
3. Add callback handler:
   ```typescript
   const handleVariantClick = (variant: string) => {
     setDrillDown({ type: 'VariantLane', variant });
   };
   ```
4. Pass `onSegmentClick={handleVariantClick}` to `VariantSummaryStrip`
5. Add `DrillDownDrawer` component as above
6. Verify `VariantLaneView.tsx` exists and renders correctly

### Task 3: Wire SupportPatternRadar drill-down on SupportPatternsPanel
1. Locate `SupportPatternsPanel.tsx` and find the `SupportPatternRadar` component usage
2. Add state: `const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null)`
3. Add callback handler:
   ```typescript
   const handleSupportPatternClick = (axis: string) => {
     setDrillDown({ type: 'SupportPattern', axis });
   };
   ```
4. Pass `onSegmentClick={handleSupportPatternClick}` to `SupportPatternRadar`
5. Add `DrillDownDrawer` component as above
6. If `SupportPatternView.tsx` does not exist, create it following the pattern of `PlanCoverageSectionView.tsx`
7. Ensure the view renders relevant details for the selected support pattern axis

### Task 4: Wire FollowUpSuccessRate and InterventionTimeline drill-downs on InterventionPanel
1. Locate `InterventionPanel.tsx` and find both `FollowUpSuccessRate` and `InterventionTimeline` components
2. Add state: `const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null)`
3. Add callback handlers:
   ```typescript
   const handleFollowUpClick = (segment: string) => {
     setDrillDown({ type: 'FollowUpMetric', segment });
   };

   const handleInterventionClick = (event: InterventionEvent) => {
     setDrillDown({ type: 'InterventionEvent', event });
   };
   ```
4. Pass `onSegmentClick={handleFollowUpClick}` to `FollowUpSuccessRate`
5. Pass `onDotClick={handleInterventionClick}` to `InterventionTimeline`
6. Add `DrillDownDrawer` component as above
7. If view components don't exist, create `FollowUpMetricView.tsx` and `InterventionEventView.tsx` following the pattern of existing view components

### Task 5: Add regression tests for new drill-down panels
1. Create or update test files for each modified panel in `apps/web/src/panels/__tests__/` or appropriate test directory
2. For each panel, add tests covering:
   - Drill-down state initialization (should be null)
   - Callback handler invocation sets correct drill-down context
   - Drawer opens when drill-down context is set
   - Drawer closes when onClose is called
   - Correct context type is passed based on which chart component was clicked
3. If new view components were created, add unit tests for their rendering
4. Ensure tests use appropriate mocking for the DrillDownDrawer component
5. Run tests to verify they pass

### Task 6: Update documentation
1. Update `docs/development-gaps.md`:
   - Change G-16 status from "Partial" to "Closed"
   - Summarize completed drill-down wiring work
   - Note any remaining items or observations

2. Update `docs/decision-log.md`:
   - Add a new entry for G-16 completion
   - Include date, decision summary, rationale, alternatives considered, and consequences
   - Reference the drill-down pattern consistency across panels

### Task 7: Final validation
1. Run typecheck: `npm run typecheck` or equivalent
2. Run lint: `npm run lint` or equivalent
3. Run system inventory check: `npm run system:inventory:check` or equivalent
4. Run tests: `npm test` or equivalent
5. Fix any errors that arise from these checks

## Important Notes
- Follow the existing pattern from `TodayPanel.tsx` and `HealthBar.tsx` for consistency
- Ensure TypeScript types are correctly imported and used
- All callback signatures must match the chart component expectations
- View components should render meaningful content based on the drill-down context
- Do not modify the DrillDownDrawer component itself - only wire it into the panels
- If view components are missing, create them following the established pattern from `PlanCoverageSectionView.tsx` and `VariantLaneView.tsx`
- Maintain existing code style and formatting conventions

## Success Criteria
- All four panels have drill-down functionality wired correctly
- Clicking on chart segments/dots opens the DrillDownDrawer with appropriate context
- Drawer closes properly
- All regression tests pass
- Type checking, linting, and system inventory checks pass
- Documentation is updated to reflect G-16 closure
- No breaking changes to existing functionality
