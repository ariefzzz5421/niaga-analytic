"use client";

import { Activity, BarChart3, Calculator, Github, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  { href: "/", label: "Calculator", icon: Calculator },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[color:var(--plane)]/95 px-4 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)]"><Activity className="size-4 text-white" /></span>
          <span className="font-semibold">Niaga<span className="text-[var(--text-muted)]">Analytics</span></span>
        </Link>
        <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)]" aria-label="Open navigation"><Menu className="size-5" /></button>
      </header>

      {open ? <button className="fixed inset-0 z-40 bg-black/60 md:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[82vw] max-w-[290px] border-r border-[var(--border)] bg-[var(--plane)] p-4 transition-transform md:w-60 md:max-w-none md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)]"><Activity className="size-4 text-white" /></span><span className="text-sm font-semibold">Niaga<span className="text-[var(--text-muted)]">Analytics</span></span></Link>
          <button onClick={() => setOpen(false)} className="grid size-10 place-items-center md:hidden" aria-label="Close navigation"><X className="size-5" /></button>
        </div>
        <nav className="mt-8 space-y-1.5">
          {items.map((item) => { const active = pathname === item.href; const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${active ? "bg-[var(--accent-soft)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-white"}`}><Icon className="size-4" /><span>{item.label}</span></Link>; })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4"><a href="https://github.com/ariefzzz5421/niaga-analytic" target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-2)]"><Github className="size-4" />GitHub</a></div>
      </aside>
    </>
  );
}
