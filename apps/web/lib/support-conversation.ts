import type { SupportCaseDetail } from "./api";

export type SupportConversationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; detail: SupportCaseDetail }
  | { status: "error"; message: string };

export function createSupportConversation(
  loadDetail: (id: string) => Promise<SupportCaseDetail>,
  onChange: (state: SupportConversationState) => void,
) {
  let selected: Readonly<{ id: string }> | null = null;

  let generation = 0;

  async function reload() {
    const target = selected;

    if (!target) {
      return;
    }

    const request = ++generation;

    try {
      const detail = await loadDetail(target.id);

      if (selected === target && generation === request) {
        onChange({ status: "ready", detail });
      }
    } catch (error) {
      if (selected === target && generation === request) {
        onChange({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load this request.",
        });
      }
    }
  }

  function cancel() {
    selected = null;

    generation++;
  }

  return {
    get selected() {
      return selected;
    },
    select(id: string | null) {
      cancel();

      selected = id === null ? null : { id };

      onChange({ status: id === null ? "idle" : "loading" });

      return reload();
    },
    reload,
    cancel,
  };
}
