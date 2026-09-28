import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader } from "@/components/app/kit";
import { AssetCard, Dropzone, StorageNote } from "@/components/app/Assets";
import { useAssets } from "@/lib/project/assets";
import { SECTIONS } from "@/lib/project/sections";
import type { SectionId } from "@/lib/project/types";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "Project assets | Tech Ventura" },
      { name: "description", content: "Shared library of images and documents for every project task, visible to all five teammates." },
      { property: "og:title", content: "Project assets | Tech Ventura" },
      { property: "og:description", content: "Shared library of images and documents for every project task, visible to all five teammates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssetsPage,
});

function AssetsPage() {
  const { assets, ready, signedIn } = useAssets();
  const [section, setSection] = useState<SectionId>("s1");
  const [filter, setFilter] = useState<"all" | SectionId>("all");
  const [kind, setKind] = useState<"all" | "image" | "document" | "video" | "audio">("all");
  const list = assets.filter((a) => (filter === "all" || a.section_id === filter) && (kind === "all" || a.kind === kind));
  const sel = "rounded-md border border-input bg-background px-2 py-1.5 text-sm";
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <PageHeader eyebrow="Shared files" title="Project assets" description="Upload images, documents, video and audio for any of the eight tasks. Everyone signed in sees the same files. Images marked for the presentation appear in that part of the deck automatically." />
      <Card className="mt-6" title="Upload" subtitle="Choose which task the files belong to, then drop or pick as many files as you need.">
        <label className="mb-3 flex items-center gap-2 text-sm">
          Task
          <select aria-label="Upload task" className={sel} value={section} onChange={(e) => setSection(e.target.value as SectionId)}>
            {SECTIONS.map((s) => <option key={s.id} value={s.id}>Hour {s.hour}: {s.title}</option>)}
          </select>
        </label>
        <Dropzone slot={`library.${section}`} section={section} />
        <div className="mt-3"><StorageNote /></div>
      </Card>
      {signedIn && (
        <Card className="mt-4" title={`Library (${list.length} of ${assets.length})`} action={
          <div className="flex gap-2">
            <select aria-label="Filter task" className={sel} value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="all">All tasks</option>
              {SECTIONS.map((s) => <option key={s.id} value={s.id}>Hour {s.hour}</option>)}
            </select>
            <select aria-label="Filter type" className={sel} value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="all">All types</option><option value="image">Images</option><option value="document">Documents</option><option value="video">Video</option><option value="audio">Audio</option>
            </select>
          </div>
        }>
          {!ready ? <p className="text-sm text-muted-foreground">Loading shared files…</p> : list.length === 0 ? <p className="text-sm text-muted-foreground">No files yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{list.map((a, i) => <AssetCard key={a.id} a={a} list={list} index={i} showSection />)}</div>
          )}
        </Card>
      )}
    </div>
  );
}
