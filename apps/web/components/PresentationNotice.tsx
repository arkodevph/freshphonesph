import Link from "next/link";
import { PRESENTATION_MODE } from "@/lib/presentation";

export function PresentationNotice() {
  if (!PRESENTATION_MODE) {
    return null;
  }

  return (
    <aside
      aria-label="Presentation mode"
      className="fixed bottom-20 left-1/2 z-[100] flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-violet-200 bg-white px-4 py-2 text-xs text-slate-700 shadow-lg sm:bottom-3"
    >
      <span>
        <strong>Presentation</strong> · Fictional data · Read only
      </span>
      <Link
        href="/login"
        className="shrink-0 font-bold text-violet-700 underline"
      >
        Switch role
      </Link>
    </aside>
  );
}
