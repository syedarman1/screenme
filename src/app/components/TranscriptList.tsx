type Entry = { who: "user" | "ai"; text: string; time: string };

export default function TranscriptList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="space-y-2">
      {entries.map((e, i) => (
        <li
          key={i}
          className={`p-2 rounded ${e.who === "user" ? "bg-[var(--card-bg)]" : "bg-[var(--accent)]/20"}`}
        >
          <div className="text-sm text-[var(--subtext)]">{e.time}</div>
          <div className={e.who === "user" ? "text-[var(--foreground)]" : "text-[var(--accent)]"}>
            {e.who.toUpperCase()}: {e.text}
          </div>
        </li>
      ))}
    </ul>
  );
}
