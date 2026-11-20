"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Notice, Toggle, cx } from "@/components/ui";
import { IconArrow, IconExternal } from "@/components/icons";
import { dateFr } from "@/lib/format";

interface Source { label: string; url: string; checkedAt: string | null }
interface Msg { role: "user" | "assistant"; content: string; sources?: Source[] }

const SUGGESTIONS = ["Mon forfait à 24,99 € pour 100 Go, c'est trop cher ?", "Comment changer d'opérateur en gardant mon numéro ?", "Quels abonnements pourrais-je revoir ?", "C'est quoi les frais de résiliation d'une box ?"];

export function AssistantChat({ remaining, limit }: { remaining: number; limit: number }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [personal, setPersonal] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; links?: string[] } | null>(null);
  const [left, setLeft] = useState(remaining);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, pending]);

  async function send(text: string) {
    const content = text.trim().slice(0, 2000);
    if (!content || pending) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next); setInput(""); setPending(true); setError(null);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-20).map(({ role, content }) => ({ role, content })), usePersonalData: personal }) });
      const json = await res.json();
      if (!res.ok) { setError({ message: json.error?.message ?? "L'assistant est indisponible.", links: json.error?.links }); setMessages(messages); setInput(content); return; }
      setMessages([...next, { role: "assistant", content: json.reply, sources: json.sources }]);
      setLeft((n) => Math.max(0, n - 1));
    } catch {
      setError({ message: "Connexion impossible. Réessaie." }); setMessages(messages); setInput(content);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface-2 p-3">
        <Toggle id="personal" checked={personal} onChange={(e) => setPersonal(e.target.checked)} label="Autoriser l'accès à mes données ECONOM." description="Abonnements enregistrés, dernière facture analysée et économies : pour des réponses personnalisées. Désactivé, l'assistant ne voit que le catalogue public." />
      </div>
      <div className="space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="animate-rise">
            <p className="text-sm font-bold text-muted mb-2">Essaie par exemple</p>
            <ul className="flex flex-col gap-2">{SUGGESTIONS.map((s) => <li key={s}><button type="button" onClick={() => send(s)} className="pressable w-full rounded-2xl border border-line bg-surface p-3 text-left text-sm font-semibold hover:border-brand">{s}</button></li>)}</ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cx("animate-rise max-w-[92%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap", m.role === "user" ? "ml-auto bg-brand text-on-brand rounded-br-lg" : "bg-surface border border-line rounded-bl-lg")}>
            {m.content}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-3 border-t border-line pt-2 text-xs">
                <p className="font-bold">Sources du catalogue ECONOM.</p>
                <ul className="mt-1 space-y-1">{m.sources.map((s) => <li key={s.url + s.label}><a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline underline-offset-2">{s.label}<IconExternal width={12} height={12} /></a>{s.checkedAt && <span className="text-muted"> — vérifiée le {dateFr(s.checkedAt, { day: "numeric", month: "short", year: "numeric" })}</span>}</li>)}</ul>
              </div>
            )}
          </div>
        ))}
        {pending && <div className="w-20 rounded-3xl rounded-bl-lg border border-line bg-surface px-4 py-4" role="status" aria-label="L'assistant écrit"><span className="flex gap-1.5">{[0, 1, 2].map((n) => <span key={n} className="h-2 w-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: `${n * 120}ms` }} />)}</span></div>}
        <div ref={end} />
      </div>
      {error && <Notice tone="warn">{error.message}{error.links && <span className="mt-2 flex gap-3">{error.links.map((l) => <Link key={l} href={l} className="font-bold underline underline-offset-4">{l === "/aide" ? "Centre d'aide" : "Comparateur"}</Link>)}</span>}</Notice>}
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-24 lg:bottom-4 flex items-end gap-2 rounded-[1.75rem] border-2 border-line bg-surface p-2 shadow-xl focus-within:border-brand">
        <label htmlFor="msg" className="sr-only">Ton message</label>
        <textarea id="msg" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} rows={1} maxLength={2000} placeholder="Pose ta question…" className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base outline-none" />
        <Button type="submit" disabled={pending || !input.trim() || left <= 0} aria-label="Envoyer" className="!min-h-11 !w-11 !px-0"><IconArrow width={20} height={20} /></Button>
      </form>
      <p className="text-center text-xs text-muted">{left} message{left > 1 ? "s" : ""} restant{left > 1 ? "s" : ""} sur {limit} ce mois-ci · L&apos;assistant peut se tromper : vérifie toujours sur le site du fournisseur. Il ne peut ni résilier ni payer à ta place.</p>
    </div>
  );
}
