// src/app/components/ConfirmDialog.tsx
"use client";

import React from "react";
import { useModalA11y } from "../hooks/useModalA11y";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useModalA11y<HTMLDivElement>(onCancel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative bg-surface rounded-lg border border-border shadow-2xl w-full max-w-sm p-6"
      >
        <h2 id="confirm-title" className="text-base font-semibold text-fg mb-2">{title}</h2>
        <p className="text-sm text-fg-muted mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-fg-muted hover:bg-bg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
