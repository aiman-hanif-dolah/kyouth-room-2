import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, ExternalLink, FileText, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { ACCEPT, IMAGE_ACCEPT, MAX_FILE_MB, SLOT_LABEL, fileExt, fmtSize, isImageName, useAssets, type Asset } from "@/lib/project/assets";
import { SECTIONS } from "@/lib/project/sections";
import type { SectionId } from "@/lib/project/types";
import { Badge, Button, ImageSlot } from "./kit";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

const KIND_LABEL: Record<string, string> = { image: "Image", document: "Document", video: "Video", audio: "Audio" };

export function StorageNote() {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      No limit on how many files you add. Supported: images (PNG, JPG, WEBP, GIF, SVG), documents (PDF, Word, PowerPoint), video (MP4, WEBM, MOV, M4V) and audio (MP3, WAV, M4A, AAC). Each file can be up to {MAX_FILE_MB} MB (compress longer videos), and the whole project shares the storage allowance of this workspace's cloud plan, so very large or many files can eventually hit that allowance.
    </p>
  );
}

export function SignInToUpload() {
  return (
    <div className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
      Sign in to upload and see the team's shared files. <Link to="/auth" className="text-brand-soft underline">Sign in</Link>
    </div>
  );
}

/** Drop zone + upload progress for any slot. Supports multi-select and drag and drop. */
export function Dropzone({ slot, section, imagesOnly, label }: { slot: string; section: SectionId; imagesOnly?: boolean; label?: string }) {
  const { upload, jobs, dismissJob, signedIn } = useAssets();
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  if (!signedIn) return <SignInToUpload />;
  const mine = jobs.filter((j) => j.slot === slot);
  const send = (list: FileList | null) => {
    if (!list || !list.length) return;
    let files = Array.from(list);
    if (imagesOnly) {
      // Drag-and-drop bypasses the input's accept attribute, so enforce image-only here too.
      const bad = files.filter((f) => !isImageName(f.name)).map((f) => f.name);
      files = files.filter((f) => isImageName(f.name));
      setRejected(bad);
    } else setRejected([]);
    if (files.length) upload(files, { slot, section });
  };
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label ?? "Upload files"}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files); }}
        className={cn("flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors", over ? "border-brand bg-brand/10" : "border-border-strong hover:bg-elevated/50")}
      >
        <UploadCloud className="size-5" />
        <span className="text-foreground">{label ?? "Drop files here or click to choose"}</span>
        <span>{imagesOnly ? "PNG, JPG, WEBP, GIF, SVG" : "Images, documents, video, audio"} · select as many as you need · up to {MAX_FILE_MB} MB each</span>
      </div>
      {rejected.length > 0 && (
        <p className="mt-1.5 text-[11px] text-destructive">
          Only images go here: {rejected.join(", ")} {rejected.length === 1 ? "was" : "were"} skipped. Use the Project assets library for video, audio and documents.
        </p>
      )}
      <input ref={ref} type="file" multiple accept={imagesOnly ? IMAGE_ACCEPT : ACCEPT} className="hidden" data-testid={`upload-${slot}`} onChange={(e) => { send(e.target.files); e.target.value = ""; }} />
      {mine.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {mine.map((j) => (
            <li key={j.id} className="rounded-md border border-border p-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("truncate", j.error && "text-destructive")}>{j.error || j.name}</span>
                <span className="shrink-0 text-muted-foreground">{j.error ? "" : j.done ? "Uploaded" : `${j.progress}%`}</span>
                {j.error && <button aria-label="Dismiss" onClick={() => dismissJob(j.id)}><X className="size-3" /></button>}
              </div>
              {!j.error && <div className="mt-1 h-1 overflow-hidden rounded bg-elevated"><div className="h-full bg-brand transition-all" style={{ width: `${j.progress}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumb({ a, url, className }: { a: Asset; url?: string; className?: string }) {
  if (a.kind === "image" && url) {
    const ratio = a.width && a.height ? `${a.width} / ${a.height}` : "4 / 3";
    return <div className={cn("flex items-center justify-center overflow-hidden rounded-md bg-elevated/50", className)}><img src={url} alt={a.alt_text || a.caption || a.file_name} style={{ aspectRatio: ratio }} className="max-h-56 w-full object-contain" /></div>;
  }
  if (a.kind === "video" && url) {
    return <div className={cn("overflow-hidden rounded-md bg-elevated/50", className)}><video src={url} controls preload="metadata" playsInline className="max-h-56 w-full" aria-label={a.caption || a.file_name}>Your browser cannot play this video. Use Download.</video></div>;
  }
  if (a.kind === "audio" && url) {
    return <div className={cn("flex h-28 flex-col justify-center gap-2 rounded-md bg-elevated/50 p-2", className)}><span className="font-mono text-[11px] uppercase text-muted-foreground">{fileExt(a.file_name)} audio</span><audio src={url} controls preload="metadata" className="w-full" aria-label={a.caption || a.file_name}>Your browser cannot play this audio. Use Download.</audio></div>;
  }
  return (
    <div className={cn("flex h-28 flex-col items-center justify-center gap-1 rounded-md bg-elevated/50 text-muted-foreground", className)}>
      <FileText className="size-6" />
      <span className="font-mono text-[11px] uppercase">{fileExt(a.file_name)}</span>
    </div>
  );
}

function BlurInput({ value, onSave, label, placeholder }: { value: string; onSave: (v: string) => void; label: string; placeholder?: string }) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setV(value); }
  return <input aria-label={label} placeholder={placeholder ?? label} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} className={inputCls} />;
}

export function AssetCard({ a, list, index, showSection, vertical }: { a: Asset; list: Asset[]; index: number; showSection?: boolean; vertical?: boolean }) {
  const { urls, updateAsset, removeAsset, replaceAsset, moveAsset } = useAssets();
  const [confirm, setConfirm] = useState(false);
  const rep = useRef<HTMLInputElement>(null);
  const url = urls[a.id];
  const Prev = vertical ? ArrowUp : ArrowLeft, Next = vertical ? ArrowDown : ArrowRight;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2.5" data-testid="asset-card">
      <Thumb a={a} url={url} />
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="min-w-0 flex-1 truncate text-foreground" title={a.file_name}>{a.file_name}</span>
        <span className="shrink-0 text-muted-foreground">{fmtSize(a.size_bytes)}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge tone={a.kind === "image" ? "brand" : "neutral"}>{KIND_LABEL[a.kind] ?? "Document"}</Badge>
        {showSection && <Badge>{SLOT_LABEL(a.slot)}</Badge>}
      </div>
      <BlurInput label="Caption" value={a.caption} onSave={(v) => updateAsset(a.id, { caption: v })} />
      {a.kind === "image" && <BlurInput label="Alt text" placeholder="Alt text (describe the image)" value={a.alt_text} onSave={(v) => updateAsset(a.id, { alt_text: v })} />}
      <BlurInput label="Tags" placeholder="Tags, comma separated" value={a.tags.join(", ")} onSave={(v) => updateAsset(a.id, { tags: v.split(",").map((t) => t.trim()).filter(Boolean) })} />
      {showSection && (
        <select aria-label="Task" value={a.section_id} onChange={(e) => updateAsset(a.id, { section_id: e.target.value as SectionId })} className={inputCls}>
          {SECTIONS.map((s) => <option key={s.id} value={s.id}>Hour {s.hour}: {s.title}</option>)}
        </select>
      )}
      {(a.kind === "video" || a.kind === "audio") && <p className="text-[11px] text-muted-foreground">Not embedded in slides. Play it from here or download it during the presentation.</p>}
      {a.kind === "image" && (
        <label className="flex items-center gap-2 text-[11px] text-subtle">
          <input type="checkbox" checked={a.in_presentation} onChange={(e) => updateAsset(a.id, { in_presentation: e.target.checked })} /> Show in presentation
        </label>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant="ghost" aria-label="Move earlier" disabled={index === 0} onClick={() => moveAsset(list, index, -1)}><Prev className="size-3.5" /></Button>
        <Button size="sm" variant="ghost" aria-label="Move later" disabled={index === list.length - 1} onClick={() => moveAsset(list, index, 1)}><Next className="size-3.5" /></Button>
        {url && <a href={url} target="_blank" rel="noreferrer" aria-label="Open" className="rounded p-1.5 text-muted-foreground hover:text-foreground"><ExternalLink className="size-3.5" /></a>}
        {url && <a href={`${url}&download=${encodeURIComponent(a.file_name)}`} aria-label="Download" className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Download className="size-3.5" /></a>}
        <Button size="sm" variant="ghost" aria-label="Replace file" onClick={() => rep.current?.click()}><RefreshCw className="size-3.5" /></Button>
        <input ref={rep} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceAsset(a, f); e.target.value = ""; }} />
        {confirm ? (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-destructive">
            Delete?
            <Button size="sm" variant="danger" onClick={() => removeAsset(a)}>Yes</Button>
            <Button size="sm" onClick={() => setConfirm(false)}>No</Button>
          </span>
        ) : (
          <Button size="sm" variant="danger" className="ml-auto" aria-label="Delete file" onClick={() => setConfirm(true)}><Trash2 className="size-3.5" /></Button>
        )}
      </div>
    </div>
  );
}

/** Gallery for one slot: upload area plus every file attached to that slot, in order. */
export function AssetGallery({ slot, section, title, imagesOnly, cols = "sm:grid-cols-2 lg:grid-cols-3", children }: { slot: string; section: SectionId; title?: string; imagesOnly?: boolean; cols?: string; children?: ReactNode }) {
  const { assets, error } = useAssets();
  const list = assets.filter((a) => a.slot === slot);
  return (
    <div className="space-y-3" data-testid={`gallery-${slot}`}>
      {title && <p className="text-xs font-medium uppercase tracking-wider text-brand-soft">{title} <span className="text-muted-foreground">({list.length})</span></p>}
      {children}
      <Dropzone slot={slot} section={section} imagesOnly={!!imagesOnly} />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {list.length > 0 && <div className={cn("grid gap-3", cols)}>{list.map((a, i) => <AssetCard key={a.id} a={a} list={list} index={i} />)}</div>}
    </div>
  );
}

/** Resolve an image slot URL: "asset:<id>" references a shared upload, anything else is a plain link. */
export function resolveSlotUrl(url: string, urls: Record<string, string>): string {
  if (url.startsWith("asset:")) return urls[url.slice(6)] ?? "";
  return url;
}

/** ImageSlot with a direct upload button: files go to this slot's shared gallery and the first one is linked into the slot. */
export function SlotImageSlot({ item, onChange, onDelete, aspect, slot, section }: { item: { id: string; url: string; caption: string; prompt: string }; onChange: (v: { id: string; url: string; caption: string; prompt: string }) => void; onDelete?: () => void; aspect?: string; slot: string; section: SectionId }) {
  const { upload, urls, jobs, signedIn } = useAssets();
  const ref = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const busy = jobs.some((j) => j.slot === slot && !j.done && !j.error);
  const send = async (list: FileList | null) => {
    if (!list || !list.length) return;
    const bad = Array.from(list).filter((f) => !isImageName(f.name)).map((f) => f.name);
    const files = Array.from(list).filter((f) => isImageName(f.name));
    setRejected(bad);
    if (!files.length) return;
    const ids = await upload(files, { slot, section });
    if (ids.length) onChange({ ...item, url: `asset:${ids[0]}` });
  };
  return (
    <div>
      <ImageSlot item={{ ...item, url: resolveSlotUrl(item.url, urls) }} onChange={onChange} {...(onDelete ? { onDelete } : {})} {...(aspect ? { aspect } : {})} />
      {signedIn ? (
        <div className="mt-2">
          <Button size="sm" variant="brand" disabled={busy} onClick={() => ref.current?.click()}>
            <UploadCloud className="size-3.5" /> {busy ? "Uploading…" : item.url ? "Upload a different image" : "Upload image"}
          </Button>
          <input ref={ref} type="file" multiple accept={IMAGE_ACCEPT} className="hidden" data-testid={`slot-upload-${slot}`} onChange={(e) => { send(e.target.files); e.target.value = ""; }} />
          {rejected.length > 0 && <p className="mt-1 text-[11px] text-destructive">Only images go here: {rejected.join(", ")} skipped.</p>}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground"><Link to="/auth" className="text-brand-soft underline">Sign in</Link> to upload an image directly.</p>
      )}
    </div>
  );
}
