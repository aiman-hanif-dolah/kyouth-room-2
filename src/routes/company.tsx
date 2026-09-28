import { createFileRoute } from "@tanstack/react-router";
import { Plus, Star } from "lucide-react";
import { useProject, uid } from "@/lib/project/store";
import { AssetGallery, SlotImageSlot, StorageNote } from "@/components/app/Assets";
import { Area, Badge, Button, Card, Field, Fictional, newImage, PageHeader, RowControls, StringList, move, AiNotConnected } from "@/components/app/kit";
import { SectionTaskPanel } from "@/components/app/SectionTask";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company")({
  head: () => ({
    meta: [
      { title: "Company identity and profile | Tech Ventura" },
      { name: "description", content: "Ideas, concept comparison, brand identity, founders and company profile for Tech Ventura." },
      { property: "og:title", content: "Company identity and profile | Tech Ventura" },
      { property: "og:description", content: "Ideas, concept comparison, brand identity, founders and company profile for Tech Ventura." },
    ],
  }),
  component: CompanyPage,
});

function CompanyPage() {
  const { state, update } = useProject();
  const c = state.company;
  const u1 = (fn: (d: typeof c) => void) => update((d) => fn(d.company), "s1");
  const u2 = (fn: (d: typeof c) => void) => update((d) => fn(d.company), "s2");
  const selected = c.concepts.find((x) => x.id === c.selectedConceptId);

  return (
    <>
      <PageHeader eyebrow="Hours 1 and 2" title="Company identity and profile" description="From 10 raw ideas to one selected concept, then the identity pack and company profile.">
        <AiNotConnected />
      </PageHeader>
      <SectionTaskPanel sections={["s1", "s2"]} />

      <Card title="1. Brainstorm: 10 company ideas" subtitle="Tick shortlist to carry an idea into the pros and cons comparison." action={<Button size="sm" onClick={() => u1((d) => { d.ideas.push({ id: uid(), name: "", summary: "", pros: "", cons: "", shortlisted: false }); })}><Plus className="size-3.5" /> Add idea</Button>}>
        <div className="space-y-2">
          {c.ideas.map((idea, i) => (
            <div key={idea.id} className="grid gap-2 rounded-lg border border-border bg-background p-3 md:grid-cols-[28px_160px_1fr_auto]">
              <span className="pt-2 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <input aria-label="Idea name" value={idea.name} onChange={(e) => u1((d) => { d.ideas[i].name = e.target.value; })} className="rounded-md border border-input bg-card px-2 py-1.5 text-sm" />
              <input aria-label="Idea summary" value={idea.summary} onChange={(e) => u1((d) => { d.ideas[i].summary = e.target.value; })} className="rounded-md border border-input bg-card px-2 py-1.5 text-sm" />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={idea.shortlisted} onChange={(e) => u1((d) => { d.ideas[i].shortlisted = e.target.checked; })} className="accent-[var(--brand)]" /> Shortlist
                </label>
                <RowControls index={i} length={c.ideas.length} onMove={(dir) => u1((d) => move(d.ideas, i, dir))} onDelete={() => u1((d) => { d.ideas.splice(i, 1); })} />
              </div>
              {idea.shortlisted && (
                <div className="grid gap-2 md:col-span-4 md:grid-cols-2 md:pl-[36px]">
                  <input aria-label="Pros" placeholder="Pros" value={idea.pros} onChange={(e) => u1((d) => { d.ideas[i].pros = e.target.value; })} className="rounded-md border border-success/30 bg-card px-2 py-1.5 text-xs" />
                  <input aria-label="Cons" placeholder="Cons" value={idea.cons} onChange={(e) => u1((d) => { d.ideas[i].cons = e.target.value; })} className="rounded-md border border-destructive/30 bg-card px-2 py-1.5 text-xs" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4" title="2. Five concept options compared" subtitle="Scores are the group's judgement (1 to 5). Click Select to choose the concept used across the project.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {c.concepts.map((k, i) => {
            const on = k.id === c.selectedConceptId;
            const total = k.appeal + k.feasibility + k.prototype;
            return (
              <div key={k.id} className={cn("rounded-lg border bg-background p-4", on ? "border-brand shadow-ring" : "border-border")}>
                <div className="flex items-center justify-between gap-2">
                  <input aria-label="Concept name" value={k.name} onChange={(e) => u1((d) => { d.concepts[i].name = e.target.value; })} className="min-w-0 flex-1 bg-transparent text-base font-medium focus:outline-none" />
                  {on ? <Badge tone="brand"><Star className="size-3" /> Selected</Badge> : <Button size="sm" onClick={() => u1((d) => { d.selectedConceptId = k.id; d.productName = k.name; })}>Select</Button>}
                </div>
                <textarea aria-label="Pitch" rows={2} value={k.pitch} onChange={(e) => u1((d) => { d.concepts[i].pitch = e.target.value; })} className="mt-2 w-full resize-none bg-transparent text-xs text-subtle focus:outline-none" />
                <dl className="mt-2 space-y-1.5 text-xs">
                  <div><dt className="text-muted-foreground">Target customers</dt><dd><input aria-label="Target customers" value={k.customers} onChange={(e) => u1((d) => { d.concepts[i].customers = e.target.value; })} className="w-full bg-transparent focus:outline-none" /></dd></div>
                  <div><dt className="text-muted-foreground">Monetisation</dt><dd><input aria-label="Monetisation" value={k.monetisation} onChange={(e) => u1((d) => { d.concepts[i].monetisation = e.target.value; })} className="w-full bg-transparent focus:outline-none" /></dd></div>
                </dl>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["appeal", "feasibility", "prototype"] as const).map((key) => (
                    <label key={key} className="text-[11px] text-muted-foreground">
                      {key === "prototype" ? "Prototype" : key[0].toUpperCase() + key.slice(1)}
                      <select value={k[key]} onChange={(e) => u1((d) => { d.concepts[i][key] = Number(e.target.value); })} className="mt-0.5 w-full rounded-md border border-input bg-card px-1.5 py-1 text-sm text-foreground">
                        {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-right text-xs tabular-nums text-muted-foreground">Total {total}/15</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
            <p className="text-xs text-muted-foreground">Selected concept</p>
            <p className="mt-1 text-xl">{selected?.name ?? "None"}</p>
            <div className="mt-2 flex gap-1"><Badge tone="warning">Placeholder</Badge><Fictional /></div>
          </div>
          <Area label="Why this concept was selected" value={c.rationale} onChange={(v) => u1((d) => { d.rationale = v; })} />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="3. Identity pack">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company name" value={c.name} onChange={(v) => u1((d) => { d.name = v; })} hint="Fixed by the group: Tech Ventura" />
            <Field label="Product name" value={c.productName} onChange={(v) => u1((d) => { d.productName = v; })} />
          </div>
          <div className="mt-3 space-y-3">
            <Field label="Tagline" value={c.tagline} onChange={(v) => u1((d) => { d.tagline = v; })} />
            <Area label="Mission" rows={2} value={c.mission} onChange={(v) => u1((d) => { d.mission = v; })} />
            <Area label="Vision" rows={2} value={c.vision} onChange={(v) => u1((d) => { d.vision = v; })} />
            <StringList label="Core values" items={c.values} onChange={(v) => u1((d) => { d.values = v; })} />
          </div>
        </Card>
        <Card title="4. Brand palette" action={<Button size="sm" onClick={() => u1((d) => { d.palette.push({ id: uid(), name: "New colour", hex: "#888888" }); })}><Plus className="size-3.5" /> Colour</Button>}>
          <div className="grid gap-2 sm:grid-cols-2">
            {c.palette.map((sw, i) => (
              <div key={sw.id} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                <input type="color" aria-label={`${sw.name} colour`} value={sw.hex} onChange={(e) => u1((d) => { d.palette[i].hex = e.target.value; })} className="size-10 cursor-pointer rounded border-0 bg-transparent" />
                <div className="min-w-0 flex-1">
                  <input aria-label="Colour name" value={sw.name} onChange={(e) => u1((d) => { d.palette[i].name = e.target.value; })} className="w-full bg-transparent text-sm focus:outline-none" />
                  <p className="font-mono text-[11px] text-muted-foreground">{sw.hex}</p>
                </div>
                <Button size="sm" variant="danger" aria-label="Remove colour" onClick={() => u1((d) => { d.palette.splice(i, 1); })}>×</Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-14 overflow-hidden rounded-lg">
            {c.palette.map((sw) => <div key={sw.id} className="flex-1" style={{ background: sw.hex }} />)}
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="5. Logo and mood board" subtitle="Image generation is not connected here. Upload your images directly on each card (they also land in the galleries below), or copy the prompt into your image tool and paste a link.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Logo</p>
            <SlotImageSlot item={c.logo} aspect="aspect-square" slot="company.logo" section="s1" onChange={(v) => u1((d) => { d.logo = v; })} />
          </div>
          {c.moodboard.map((m, i) => (
            <div key={m.id}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Mood board {i + 1}</p>
              <SlotImageSlot item={m} aspect="aspect-square" slot="company.moodboard" section="s1" onChange={(v) => u1((d) => { d.moodboard[i] = v; })} onDelete={() => u1((d) => { d.moodboard.splice(i, 1); })} />
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3" onClick={() => u1((d) => { d.moodboard.push(newImage()); })}><Plus className="size-3.5" /> Mood board prompt</Button>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <AssetGallery slot="company.logo" section="s1" title="Logo files" imagesOnly cols="grid-cols-1" />
          <AssetGallery slot="company.moodboard" section="s1" title="Mood board uploads" />
        </div>
        <div className="mt-3"><StorageNote /></div>
      </Card>

      <h2 className="mb-3 mt-10 text-xl font-normal tracking-tight">Company profile (Hour 2)</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Background and founding story" action={<Fictional />}>
          <div className="space-y-3">
            <Area label="Company background" value={c.background} onChange={(v) => u2((d) => { d.background = v; })} />
            <Area label="Founding story" rows={5} value={c.foundingStory} onChange={(v) => u2((d) => { d.foundingStory = v; })} />
          </div>
        </Card>
        <Card title="Structure, services and USP">
          <div className="space-y-3">
            <Area label="Organisational structure" value={c.orgStructure} onChange={(v) => u2((d) => { d.orgStructure = v; })} />
            <Area label="Products and services" rows={4} value={c.services} onChange={(v) => u2((d) => { d.services = v; })} />
            <Area label="Unique selling proposition" rows={2} value={c.usp} onChange={(v) => u2((d) => { d.usp = v; })} />
          </div>
        </Card>
      </div>
      <Card className="mt-4" title="Founders" subtitle="Invented people must keep the (fictional) label until replaced with real, consenting group members." action={<Button size="sm" onClick={() => u2((d) => { d.founders.push({ id: uid(), name: "New founder (fictional)", role: "", bio: "" }); })}><Plus className="size-3.5" /> Founder</Button>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {c.founders.map((f, i) => (
            <div key={f.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-elevated text-sm">{f.name.slice(0, 1)}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <input aria-label="Founder name" value={f.name} onChange={(e) => u2((d) => { d.founders[i].name = e.target.value; })} className="w-full bg-transparent text-sm font-medium focus:outline-none" />
                  <input aria-label="Founder role" value={f.role} onChange={(e) => u2((d) => { d.founders[i].role = e.target.value; })} className="w-full bg-transparent text-xs text-brand-soft focus:outline-none" />
                </div>
                <RowControls index={i} length={c.founders.length} onMove={(dir) => u2((d) => move(d.founders, i, dir))} onDelete={() => u2((d) => { d.founders.splice(i, 1); })} />
              </div>
              <textarea aria-label="Founder bio" rows={3} value={f.bio} onChange={(e) => u2((d) => { d.founders[i].bio = e.target.value; })} className="mt-2 w-full resize-none rounded-md border border-input bg-card p-2 text-xs text-subtle" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
