// src/app/hooks/useModalA11y.ts
import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, summary, [tabindex]:not([tabindex="-1"])';

/**
 * Dialog accessibility for modal panels: moves focus into the panel on mount,
 * traps Tab within it, closes on Escape, and restores focus to the trigger on
 * unmount. Attach the returned ref to the panel element (also give it
 * role="dialog" aria-modal="true").
 */
export function useModalA11y<T extends HTMLElement>(onClose: () => void) {
  const panelRef = useRef<T>(null);
  // Keep the latest onClose without re-running the mount effect (inline
  // arrow props change identity every parent render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const preferred = panel?.querySelector<HTMLElement>("input, select, textarea");
    (preferred ?? panel?.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return panelRef;
}
