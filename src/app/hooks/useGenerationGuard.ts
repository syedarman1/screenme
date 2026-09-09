"use client";
import { useEffect } from "react";
export function useGenerationGuard(
  busy: boolean,
  onBlocked: (message: string) => void,
) {
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const a = (event.target as Element)?.closest?.("a");
      if (
        !a ||
        a.target ||
        a.download ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onBlocked(
        "Your draft is still being prepared. Keep this page open until it finishes and saves.",
      );
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("click", navigate, true);
    };
  }, [busy, onBlocked]);
}
