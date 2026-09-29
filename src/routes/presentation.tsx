import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Pause, Play, Printer, RotateCcw, X, StickyNote, ArrowLeft } from "lucide-react";
import { useProject, memberName } from "@/lib/project/store";
import { buildCompanyProfileSlides, buildSlides } from "@/components/app/presentationSlides";
import { useAssets } from "@/lib/project/assets";
import { Badge, Button, Card, PageHeader, NumField } from "@/components/app/kit";
import { cn } from "@/lib/utils";
import { move, RowControls } from "@/components/app/kit";

export const Route = createFileRoute("/presentation")({
  head: () => ({
    meta: [
      { title: "40-minute presentation | Tech Ventura" },
      { name: "description", content: "Live presentation compiled from the Tech Ventura workspace, with timing, speakers and rehearsal controls." },
      { property: "og:title", content: "40-minute presentation | Tech Ventura" },
      { property: "og:description", content: "Live presentation compiled from the Tech Ventura workspace, with timing, speakers and rehearsal controls." },
    ],
  }),
  component: PresentationPage,
});

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function PresentationPage() {
  const { state, update, canEdit } = useProject();
  const u = (fn: (d: typeof state) => void) => update(fn, "s7");
  const media = useAssets();
  const [deckMode, setDeckMode] = useState<"talk" | "profile">("talk");
  const talkSlides = buildSlides(state, true, media);
  const profileSlides = buildCompanyProfileSlides(state, media);
  const slides = deckMode === "profile" ? profileSlides : talkSlides;
  const total = state.presentation.reduce((a, p) => a + p.minutes, 0);
  const [presenting, setPresenting] = useState(false);
  const [start, setStart] = useState(0);
  const [printing, setPrinting] = useState(false);

  // print view stays open until closed by user

  return (
    <>
      <div className="no-print">
        <PageHeader eyebrow={deckMode === "profile" ? "Hour 2 · Company profile" : "Hours 7 and 8"} title={deckMode === "profile" ? "Company profile · 8 slides" : "40-minute presentation"} description={deckMode === "profile" ? "A separate, project-backed profile deck. It stays distinct from the timed 40-minute presentation." : "Slides are generated live from the workspace. Edit a section and the presentation updates. Only timing, speakers and speaker notes are edited here."}>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPrinting(true)}><Printer className="size-4" /> Print view</Button>
            <Button variant="primary" onClick={() => { setStart(0); setPresenting(true); }}><Play className="size-4" /> Present {deckMode === "profile" ? "profile" : "talk"}</Button>
          </div>
        </PageHeader>

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Choose presentation deck">
          <Button variant={deckMode === "talk" ? "primary" : "secondary"} aria-pressed={deckMode === "talk"} onClick={() => setDeckMode("talk")}>40-minute talk · {talkSlides.length} slides</Button>
          <Button variant={deckMode === "profile" ? "primary" : "secondary"} aria-pressed={deckMode === "profile"} onClick={() => setDeckMode("profile")}>Company profile · {profileSlides.length} slides</Button>
        </div>

        {deckMode === "talk" && <Card title="Outline and timing" subtitle="Required order: company, business plan, product demo, marketing, demographics, AI prompt engineering (main highlight)." action={<Badge tone={total === 40 ? "success" : "danger"}>{total} / 40 min</Badge>}>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-elevated">
            {state.presentation.map((p, i) => (
              <div key={p.key} title={`${p.title}: ${p.minutes} min`} className={cn("h-full border-r border-background", p.key === "prompts" ? "bg-brand" : i % 2 ? "bg-border-strong" : "bg-muted-foreground/50")} style={{ width: `${(p.minutes / Math.max(total, 40)) * 100}%` }} />
            ))}
          </div>
          <div className="space-y-2">
            {state.presentation.map((p, i) => (
              <div key={p.key} className={cn("grid gap-3 rounded-lg border bg-background p-3 lg:grid-cols-[200px_80px_1fr_1fr_auto]", p.key === "prompts" ? "border-brand/50" : "border-border")}>
                <div>
                  <p className="text-sm font-medium">{i + 1}. {p.title}</p>
                  <button type="button" className="mt-1 text-xs text-brand-soft hover:underline" onClick={() => { setStart(slides.findIndex((s) => s.part === p.key)); setPresenting(true); }}>Present from here</button>
                </div>
                <div><p className="mb-1 text-[11px] text-muted-foreground">Minutes</p><NumField label={`Minutes for ${p.title}`} value={p.minutes} onChange={(v) => u((d) => { d.presentation[i].minutes = v; })} /></div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Speakers">
                    {state.members.map((m) => {
                      const on = p.speakerIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={on}
                          disabled={!canEdit}
                          onClick={() => canEdit && u((d) => { const a = d.presentation[i].speakerIds; d.presentation[i].speakerIds = on ? a.filter((x) => x !== m.id) : [...a, m.id]; })}
                          className={cn("rounded-full border px-2 py-0.5 text-[11px]", on ? "border-brand bg-brand/15 text-foreground" : "border-border-strong text-muted-foreground", !canEdit && "cursor-default")}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    aria-label="Key points"
                    value={p.keyPoints}
                    readOnly={!canEdit}
                    disabled={!canEdit}
                    onChange={(e) => u((d) => { d.presentation[i].keyPoints = e.target.value; })}
                    placeholder={canEdit ? "Key points" : ""}
                    className={cn("w-full rounded-md border border-input bg-card px-2 py-1 text-xs", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
                  />
                  <input
                    aria-label="Transition"
                    value={p.transition}
                    readOnly={!canEdit}
                    disabled={!canEdit}
                    onChange={(e) => u((d) => { d.presentation[i].transition = e.target.value; })}
                    placeholder={canEdit ? "Transition line" : ""}
                    className={cn("w-full rounded-md border border-input bg-card px-2 py-1 text-xs italic", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default")}
                  />
                </div>
                <textarea
                  aria-label={`Speaker notes for ${p.title}`}
                  rows={3}
                  value={p.speakerNotes}
                  readOnly={!canEdit}
                  disabled={!canEdit}
                  onChange={(e) => u((d) => { d.presentation[i].speakerNotes = e.target.value; })}
                  placeholder={canEdit ? "Speaker notes (editable)" : ""}
                  className={cn("w-full rounded-md border border-input bg-card p-2 text-xs", !canEdit && "border-transparent bg-transparent px-0 shadow-none cursor-default resize-none")}
                />
                <RowControls index={i} length={state.presentation.length} onMove={(dir) => u((d) => move(d.presentation, i, dir))} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Parts cannot be deleted because each is required by the brief. Set minutes to change emphasis.</p>
        </Card>}

        {deckMode === "profile" && <Card className="mb-6" title="Profile audit notes" subtitle="The target market and USP are labelled as hypotheses. Founder roles and bios are fictional; the CHRO bio conflict, finance-workstream owner and contact details are marked [DETAIL NEEDED]. The cover uses the uploaded primary logo when available; otherwise, it marks the logo [DETAIL NEEDED]." />}
        <h2 className="mb-3 mt-10 text-xl font-normal tracking-tight">{deckMode === "profile" ? "Company profile slide preview" : "Slide preview"} ({slides.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((s, i) => (
            <button key={`${deckMode}-${i}`} type="button" onClick={() => { setStart(i); setPresenting(true); }} className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-brand">
              <p className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")} · {deckMode === "profile" ? "Company profile" : state.presentation.find((p) => p.key === s.part)?.title}</p>
              <p className="mt-1 text-sm group-hover:text-brand-soft">{s.title}</p>
            </button>
          ))}
        </div>
      </div>

      {printing && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background">
          <div className="no-print flex items-center justify-between border-b border-border bg-card px-6 py-3">
            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" onClick={() => setPrinting(false)}>
                <ArrowLeft className="size-4" /> Back to outline
              </Button>
              <span className="text-xs text-muted-foreground">
              A4 Pamphlet View · {slides.length} slides formatted for print and presentation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer className="size-4" /> Print / Save PDF
              </Button>
              <Button size="sm" variant="ghost" aria-label="Close print view" onClick={() => setPrinting(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="print-view-container flex-1 overflow-auto bg-neutral-900/60 p-4 md:p-8">
            <div className="mx-auto max-w-[1100px] space-y-6">
              {(deckMode === "profile" ? buildCompanyProfileSlides(state, media) : buildSlides(state, false, media)).map((s, i) => (
                <section
                  key={i}
                  className="print-slide deck-stage rounded-xl border border-border/80 shadow-2xl"
                  data-tone={s.tone}
                >
                  <p className="deck-header">
                    <span>{state.company.name} · {s.title}</span>
                    <span>Slide {i + 1} / {slides.length}</span>
                  </p>
                  <div className="flex-1">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {presenting && <Presenter start={start} mode={deckMode} onClose={() => setPresenting(false)} />}
    </>
  );
}

function Presenter({ start, mode, onClose }: { start: number; mode: "talk" | "profile"; onClose: () => void }) {
  const { state } = useProject();
  const media = useAssets();
  const slides = mode === "profile" ? buildCompanyProfileSlides(state, media) : buildSlides(state, true, media);
  const [i, setI] = useState(Math.max(0, start));
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [notes, setNotes] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const idx = Math.min(i, slides.length - 1);
  const slide = slides[idx];
  const part = state.presentation.find((p) => p.key === slide.part)!;
  const planned = mode === "profile" ? part.minutes * 60 : state.presentation.reduce((a, p) => a + p.minutes, 0) * 60;
  const partStart = mode === "profile" ? 0 : state.presentation.slice(0, state.presentation.indexOf(part)).reduce((a, p) => a + p.minutes, 0) * 60;
  const next = useCallback(() => { setDirection("forward"); setI((x) => Math.min(slides.length - 1, x + 1)); }, [slides.length]);
  const prev = useCallback(() => { setDirection("backward"); setI((x) => Math.max(0, x - 1)); }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
      if (e.key.toLowerCase() === "n") setNotes((n) => !n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const behind = elapsed > partStart + part.minutes * 60;
  const canFs = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  return (
    <div ref={ref} className="fixed inset-0 z-[90] flex flex-col bg-background" role="dialog" aria-label="Presentation mode">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 text-xs">
        <span className="text-muted-foreground">{mode === "profile" ? `Company profile · ${slide.title}` : `${part.title} · ${part.speakerIds.map((id) => memberName(state, id)).join(", ") || "No speaker"}`}</span>
        <span className="text-muted-foreground">Updated {new Date(state.updatedAt).toLocaleString("en-MY")}</span>
        <div className="ml-auto flex items-center gap-1">
          <span className={cn("font-mono tabular-nums", behind ? "text-destructive" : "text-foreground")} aria-live="off">{fmt(elapsed)} / {fmt(planned)}</span>
          <Button size="sm" variant="ghost" aria-label={running ? "Pause timer" : "Start timer"} onClick={() => setRunning(!running)}>{running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}</Button>
          <Button size="sm" variant="ghost" aria-label="Reset timer" onClick={() => { setElapsed(0); setRunning(false); }}><RotateCcw className="size-3.5" /></Button>
          <Button size="sm" variant="ghost" aria-pressed={notes} onClick={() => setNotes(!notes)}><StickyNote className="size-3.5" /> Notes</Button>
          <Button size="sm" variant="ghost" disabled={!canFs} title={!canFs ? "Full screen not supported here" : undefined} onClick={() => (document.fullscreenElement ? document.exitFullscreen() : ref.current?.requestFullscreen())}><Maximize className="size-3.5" /></Button>
          <Button size="sm" variant="ghost" aria-label="Exit presentation" onClick={onClose}><X className="size-4" /></Button>
        </div>
      </div>
      <div className="h-0.5 bg-elevated"><div className="h-full bg-brand transition-all" style={{ width: `${((idx + 1) / slides.length) * 100}%` }} /></div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto">
          <div key={`${mode}-${idx}`} className={`deck-stage deck-enter-${direction}`} data-tone={slide.tone}>
            <div className="mx-auto max-w-[1400px]">
              <p className="deck-header"><span>{state.company.name} / {mode === "profile" ? "Company profile" : part.title}</span><span>{String(idx + 1).padStart(2, "0")} / {slides.length}</span></p>
              {idx !== 0 && <h2 className="deck-title">{slide.title}</h2>}
              {slide.body}
            </div>
          </div>
        </div>
        {notes && (
          <aside className="w-80 shrink-0 overflow-auto border-l border-border bg-card p-4 text-sm">
            <p className="text-xs text-muted-foreground">Planned {part.minutes} min</p><details className="mt-4"><summary className="cursor-pointer text-brand-soft">Section reference & uploaded visuals</summary><div className="mt-4">{slide.detail}</div></details>
            <p className="mt-3 text-xs font-medium text-muted-foreground">Key points</p>
            <p className="text-subtle">{part.keyPoints || "None"}</p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">Speaker notes</p>
            <p className="whitespace-pre-line text-subtle">{part.speakerNotes || "No notes yet. Add them in the outline."}</p>
            {part.transition && <><p className="mt-3 text-xs font-medium text-muted-foreground">Transition</p><p className="italic text-brand-soft">"{part.transition}"</p></>}
          </aside>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <Button size="sm" onClick={prev} disabled={idx === 0}><ChevronLeft className="size-4" /> Previous</Button>
        <span className="hidden text-xs text-muted-foreground sm:block">Arrow keys to navigate · N for notes · Esc to exit</span>
        <Button size="sm" variant="primary" onClick={next} disabled={idx === slides.length - 1}>Next <ChevronRight className="size-4" /></Button>
      </div>
    </div>
  );
}
