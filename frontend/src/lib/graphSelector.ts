/**
 * graphSelector
 * Centralized selection model computation logic for the Evidence Graph.
 */

export interface CompactInvestigation {
  investigation_id: string;
  status: string;
}

export function computeTargetId({
  selectedInvestigationId,
  activeInvestigationId,
  storedSelectedId,
  investigations,
}: {
  selectedInvestigationId?: string;
  activeInvestigationId?: string;
  storedSelectedId?: string | null;
  investigations?: CompactInvestigation[];
}): string | undefined {
  // 1. Explicit selection (navigation or dropdown click)
  if (selectedInvestigationId) return selectedInvestigationId;
  if (activeInvestigationId) return activeInvestigationId;

  // 2. Restore most recently selected investigation if valid
  if (storedSelectedId && investigations && investigations.some((i) => i.investigation_id === storedSelectedId)) {
    return storedSelectedId;
  }

  // 3 & 4. Default to newest active or newest overall
  if (investigations && investigations.length > 0) {
    const newestActive = investigations.find(
      (i) => i.status.toLowerCase() !== "resolved" && i.status.toLowerCase() !== "dismissed"
    );
    if (newestActive) return newestActive.investigation_id;
    return investigations[0].investigation_id;
  }

  return undefined;
}
