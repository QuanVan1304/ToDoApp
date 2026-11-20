export function AgentNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-[var(--mustard)] pl-3 font-serif italic text-sm leading-relaxed text-[var(--ink)]">
      {children}
    </p>
  );
}
