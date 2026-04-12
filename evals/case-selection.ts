export function parseCaseIdList(raw: string): string[] {
  return [...new Set(
    raw
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry && !entry.startsWith("#")),
  )];
}

export interface EvalCaseRef {
  id: string;
}

export interface EvalCaseSelectionResult<T extends EvalCaseRef> {
  selected: T[];
  missingIds: string[];
}

export function selectEvalCases<T extends EvalCaseRef>(
  cases: T[],
  selectedCaseIds: string[],
): EvalCaseSelectionResult<T> {
  if (selectedCaseIds.length === 0) {
    return { selected: cases, missingIds: [] };
  }

  const byId = new Map(cases.map((evalCase) => [evalCase.id, evalCase]));
  const selected: T[] = [];
  const missingIds: string[] = [];

  for (const caseId of selectedCaseIds) {
    const match = byId.get(caseId);
    if (!match) {
      missingIds.push(caseId);
      continue;
    }
    selected.push(match);
  }

  return {
    selected,
    missingIds,
  };
}
