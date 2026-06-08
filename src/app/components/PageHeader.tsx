import React from "react";

interface PageHeaderProps {
  label: string;
  title: string;
  description?: string;
  className?: string;
  centered?: boolean;
}

export default function PageHeader({
  label,
  title,
  description,
  className = "",
  centered = false,
}: PageHeaderProps) {
  return (
    <header className={`mb-10 ${centered ? "text-center" : ""} ${className}`}>
      <p className="section-label mb-2">{label}</p>
      <h1 className="page-title">{title}</h1>
      {description && (
        <p className={`text-fg-muted text-base leading-relaxed mt-2 max-w-xl ${centered ? "mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </header>
  );
}
