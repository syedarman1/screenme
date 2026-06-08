import React from "react";

interface LogoProps {
  className?: string;
  showMark?: boolean;
}

export default function Logo({ className = "", showMark = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight text-fg ${className}`}>
      {showMark && (
        <span
          className="w-5 h-5 rounded-[5px] bg-fg flex items-center justify-center shrink-0"
          aria-hidden
        >
          <span className="w-[7px] h-[7px] rounded-[2px] bg-bg" />
        </span>
      )}
      ScreenMe
    </span>
  );
}
