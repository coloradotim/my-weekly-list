export type SmartEntryDecisionInput =
  | { weekStatus: "needs-setup" }
  | { weekStatus: "ready" }
  | { weekStatus: "error" }
  | {
      weekStatus: "no-current-week";
      creationStatus: "created" | "needs-setup" | "error";
    };

export function getSmartEntryDestination(input: SmartEntryDecisionInput) {
  if (input.weekStatus === "needs-setup") {
    return "/setup";
  }

  if (input.weekStatus === "ready") {
    return "/today";
  }

  if (input.weekStatus === "no-current-week") {
    if (input.creationStatus === "created") {
      return "/today";
    }

    if (input.creationStatus === "needs-setup") {
      return "/setup";
    }
  }

  return "/week";
}
