import type {
  ChecklistQuery,
  EvidenceRequirementInput,
  SubmissionChecklist,
} from "@freshphones/contracts";
import { tsRequest } from "./ts-api";

export function getSubmissionChecklist(query: ChecklistQuery) {
  return tsRequest<SubmissionChecklist>(
    `/submission-checklists?${new URLSearchParams(query)}`,
  );
}

export function saveEvidenceRequirement(
  id: string,
  version: number,
  record: EvidenceRequirementInput,
) {
  return tsRequest(`/submission-checklists/${id}`, {
    method: "POST",
    body: JSON.stringify({ version, record }),
  });
}
