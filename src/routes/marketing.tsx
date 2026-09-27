import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useProject, uid } from "@/lib/project/store";
import { AssetGallery, StorageNote } from "@/components/app/Assets";
import { Area, Badge, Button, Card, CopyButton, ImageSlot, PageHeader, RowControls, move, AiNotConnected } from "@/components/app/kit";
import { SectionTaskPanel } from "@/components/app/SectionTask";
import type { Platform } from "@/lib/project/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marketing")({
  head: () => ({
    meta: [
      { title: "Social media marketing plan | Tech Ventura" },
      { name: "description", content: "Strategy, content pillars, schedule and 13 draft posts for Instagram, TikTok, Facebook and LinkedIn." },
      { property: "og:title", content: "Social media marketing plan | Tech Ventura" },
      { property: "og:description", content: "Strategy, content pillars, schedule and 13 draft posts for Instagram, TikTok, Facebook and LinkedIn." },
    ],
  }),
  component: MarketingPage,
});

export const PLATFORMS: { key: Platform; label: string; need: number; kind: string }[] = [
  { key: "instagram", label: "Instagram", need: 5, kind: "post" },
  { key: "tiktok", label: "TikTok", need: 3, kind: "script" },
  { key: "facebook", label: "Facebook", need: 3, kind: "ad" },
  { key: "linkedin", label: "LinkedIn", need: 2, kind: "post" },
];

function MarketingPage() {
  const { state, update } = useProject();
  const m = state.marketing;
  const u = (fn: (d: typeof m) => void) => update((d) => fn(d.marketing), "s6");
  const [tab, setTab] = useState<Platform>("instagram");
  const list = m.samples.map((s, i) => ({ s, i })).filter(({ s }) => s.platform === tab);
  const plat = PLATFORMS.find((p) => p.key === tab)!;

  return (
    <>
      <PageHeader eyebrow="Hour 6" title="Social media marketing plan" description={`Campaign for ${state.company.productName}, in a warm Malaysian voice. Targets and budgets are assumptions.`}>
        <AiNotConnected />
      </PageHeader>
      <SectionTaskPanel sections={["s6"]} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Strategy" className="lg:col-span-1"><Area label="Social media strategy" rows={8} value={m.strategy} onChange={(v) => u((d) => { d.strategy = v; })} /></Card>
        <Card title="Influencer strategy"><Area label="Influencer plan" rows={8} value={m.influencer} onChange={(v) => u((d) => { d.influencer = v; })} /></Card>
        <Card title="Paid advertising"><Area label="Paid ads plan" rows={8} value={m.paid} onChange={(v) => u((d) => { d.paid = v; })} /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Content pillars" action={<Button size="sm" onClick={() => u((d) => { d.pillars.push({ id: uid(), title: "", description: "" }); })}><Plus className="size-3.5" /> Pillar</Button>}>
          <div className="space-y-2">
            {m.pillars.map((p, i) => (
              <div key={p.id} className="flex gap-2 rounded-lg border border-border bg-background p-2">
                <div className="flex-1">
                  <input aria-label="Pillar title" value={p.title} onChange={(e) => u((d) => { d.pillars[i].title = e.target.value; })} className="w-full bg-transparent text-sm font-medium focus:outline-none" />
                  <input aria-label="Pillar description" value={p.description} onChange={(e) => u((d) => { d.pillars[i].description = e.target.value; })} className="w-full bg-transparent text-xs text-muted-foreground focus:outline-none" />
                </div>
                <RowControls index={i} length={m.pillars.length} onMove={(dir) => u((d) => move(d.pillars, i, dir))} onDelete={() => u((d) => { d.pillars.splice(i, 1); })} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Weekly posting schedule" action={<Button size="sm" onClick={() => u((d) => { d.schedule.push({ id: uid(), day: "", platform: "", content: "" }); })}><Plus className="size-3.5" /> Slot</Button>}>
          <div className="space-y-1">
            {m.schedule.map((r, i) => (
              <div key={r.id} className="grid grid-cols-[90px_90px_1fr_auto] items-center gap-1 border-b border-border py-1 text-sm">
                <input aria-label="Day" value={r.day} onChange={(e) => u((d) => { d.schedule[i].day = e.target.value; })} className="bg-transparent focus:outline-none" />
                <input aria-label="Platform" value={r.platform} onChange={(e) => u((d) => { d.schedule[i].platform = e.target.value; })} className="bg-transparent text-brand-soft focus:outline-none" />
                <input aria-label="Content" value={r.content} onChange={(e) => u((d) => { d.schedule[i].content = e.target.value; })} className="bg-transparent text-subtle focus:outline-none" />
                <RowControls index={i} length={m.schedule.length} onMove={(dir) => u((d) => move(d.schedule, i, dir))} onDelete={() => u((d) => { d.schedule.splice(i, 1); })} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-xl font-normal tracking-tight">Content samples</h2>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {PLATFORMS.map((p) => {
          const n = m.samples.filter((s) => s.platform === p.key).length;
          return (
            <button key={p.key} role="tab" aria-selected={tab === p.key} type="button" onClick={() => setTab(p.key)} className={cn("flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm", tab === p.key ? "border-brand bg-brand/10" : "border-border-strong text-muted-foreground")}>
              {p.label}
              <Badge tone={n >= p.need ? "success" : "danger"}>{n}/{p.need}</Badge>
            </button>
          );
        })}
        <Button size="sm" className="ml-auto" onClick={() => u((d) => { d.samples.push({ id: uid(), platform: tab, title: `New ${plat.label} ${plat.kind}`, body: "", cta: "", imagePrompt: "", imageUrl: "" }); })}><Plus className="size-3.5" /> Add {plat.label} {plat.kind}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map(({ s, i }, k) => (
          <Card key={s.id} className="p-0">
            <div className="grid gap-0 md:grid-cols-[220px_1fr]">
              <div className="border-b border-border p-3 md:border-b-0 md:border-r">
                <ImageSlot aspect={tab === "tiktok" ? "aspect-[9/16] max-h-64 mx-auto" : "aspect-square"} item={{ id: s.id, url: s.imageUrl, caption: s.title, prompt: s.imagePrompt }} onChange={(v) => u((d) => { d.samples[i].imageUrl = v.url; d.samples[i].imagePrompt = v.prompt; d.samples[i].title = v.caption; })} />
                <div className="mt-3"><AssetGallery slot={`marketing.sample.${s.id}`} section="s6" imagesOnly cols="grid-cols-1" /></div>
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="brand">{plat.label} {plat.kind} {k + 1}</Badge>
                  <RowControls index={k} length={list.length} onMove={(dir) => u((d) => { const j = list[k + dir]?.i; if (j !== undefined) [d.samples[i], d.samples[j]] = [d.samples[j], d.samples[i]]; })} onDelete={() => u((d) => { d.samples.splice(i, 1); })} />
                </div>
                <input aria-label="Title" value={s.title} onChange={(e) => u((d) => { d.samples[i].title = e.target.value; })} className="w-full bg-transparent text-base font-medium focus:outline-none" />
                <textarea aria-label="Body" rows={tab === "tiktok" ? 7 : 4} value={s.body} onChange={(e) => u((d) => { d.samples[i].body = e.target.value; })} className="w-full resize-y rounded-md border border-input bg-background p-2 text-sm leading-relaxed" />
                {!s.body.trim() && <p className="text-[11px] text-warning">Not completed yet</p>}
                <input aria-label="Call to action" value={s.cta} placeholder="CTA / hashtags" onChange={(e) => u((d) => { d.samples[i].cta = e.target.value; })} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-brand-soft" />
                <div className="flex justify-end"><CopyButton text={`${s.title}\n\n${s.body}\n\n${s.cta}`} label="Copy post" /></div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4" title="Campaign visuals" subtitle="Extra ad creatives, mockups or briefs for the whole campaign.">
        <AssetGallery slot="marketing.visuals" section="s6" />
        <div className="mt-3"><StorageNote /></div>
      </Card>
    </>
  );
}
