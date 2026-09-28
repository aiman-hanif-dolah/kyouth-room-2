import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, ExternalLink, FileText, RefreshCw, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { suggestAssetMeta } from "@/lib/project/ai.functions";
import { ACCEPT, IMAGE_ACCEPT, MAX_FILE_MB, SLOT_LABEL, fileExt, fmtSize, isImageName, useAssets, type Asset } from "@/lib/project/assets";
import { SECTIONS } from "@/lib/project/sections";
import type { SectionId } from "@/lib/project/types";
import { Badge, Button, ImageSlot } from "./kit";
import { Lightbox, type LightboxItem } from "./Lightbox";
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

export function LockedToUpload() {
  return (
    <div className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
      This is the shared team library. Switch to <strong>Edit</strong> (top of the menu, passcode needed) to upload or change files.
    </div>
  );
}

/** Drop zone + upload progress for any slot. Supports multi-select and drag and drop. */
export function Dropzone({ slot, section, imagesOnly, label }: { slot: string; section: SectionId; imagesOnly?: boolean; label?: string }) {
  const { upload, jobs, dismissJob, canEdit } = useAssets();
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  if (!canEdit) return <LockedToUpload />;
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

function Thumb({ a, url, className, onClick }: { a: Asset; url?: string; className?: string; onClick?: () => void }) {
  if (a.kind === "image" && url) {
    const ratio = a.width && a.height ? `${a.width} / ${a.height}` : "4 / 3";
    return (
      <div className={cn("flex items-center justify-center overflow-hidden rounded-md bg-elevated/50", className)}>
        {onClick ? (
          <button type="button" onClick={onClick} aria-label="View full size" className="block w-full cursor-zoom-in">
            <img src={url} alt={a.alt_text || a.caption || a.file_name} style={{ aspectRatio: ratio }} className="max-h-56 w-full object-contain" />
          </button>
        ) : (
          <img src={url} alt={a.alt_text || a.caption || a.file_name} style={{ aspectRatio: ratio }} className="max-h-56 w-full object-contain" />
        )}
      </div>
    );
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
  const { urls, updateAsset, removeAsset, replaceAsset, moveAsset, canEdit, chooseMainLogo } = useAssets();
  const [confirm, setConfirm] = useState(false);
  const [view, setView] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [aiError, setAiError] = useState("");
  const rep = useRef<HTMLInputElement>(null);
  const url = urls[a.id];
  const Prev = vertical ? ArrowUp : ArrowLeft, Next = vertical ? ArrowDown : ArrowRight;
  const suggest = async () => {
    setSuggesting(true);
    setAiError("");
    try {
      const r = await suggestAssetMeta({ data: { storagePath: a.storage_path, fileName: a.file_name, slotLabel: SLOT_LABEL(a.slot) } });
      const patch: Partial<Asset> = { tags: r.tags };
      if (r.caption) patch.caption = r.caption;
      if (r.altText && a.kind === "image") patch.alt_text = r.altText;
      await updateAsset(a.id, patch);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  };
  // Every image in this gallery becomes a slide of the full-screen preview.
  const images: LightboxItem[] = list
    .filter((x) => x.kind === "image" && urls[x.id])
    .map((x) => ({ src: urls[x.id], alt: x.alt_text || x.caption || x.file_name, title: x.file_name }));
  const openPreview = () => {
    if (!url || a.kind !== "image") return;
    const i = images.findIndex((im) => im.src === url);
    if (i >= 0) setView(i);
  };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2.5" data-testid="asset-card">
      <Thumb a={a} url={url} {...(a.kind === "image" && url ? { onClick: openPreview } : {})} />
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="min-w-0 flex-1 truncate text-foreground" title={a.file_name}>{a.file_name}</span>
        <span className="shrink-0 text-muted-foreground">{fmtSize(a.size_bytes)}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge tone={a.kind === "image" ? "brand" : "neutral"}>{KIND_LABEL[a.kind] ?? "Document"}</Badge>
        {a.category === "primary-logo" && <Badge tone="brand">Main logo</Badge>}
        {showSection && <Badge>{SLOT_LABEL(a.slot)}</Badge>}
      </div>
      {a.kind === "image" && canEdit && (
        <div className="space-y-1">
          <Button size="sm" variant="ghost" disabled={suggesting} onClick={suggest} aria-label="Suggest caption, alt text and tags with AI">
            <Sparkles className="size-3.5" /> {suggesting ? "Thinking…" : "Suggest with AI"}
          </Button>
          <p className="text-[11px] text-muted-foreground">Fills caption, alt text and tags with a suggestion. Check and tweak before saving elsewhere.</p>
          {aiError && <p className="text-[11px] text-destructive">{aiError}</p>}
        </div>
      )}
      {a.kind === "image" && canEdit && (
        a.category === "primary-logo" ? (
          <Button size="sm" onClick={() => chooseMainLogo(null)} aria-label="Remove as main logo">Remove as main logo</Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => chooseMainLogo(a.id)} aria-label="Set as main logo">Set as main logo</Button>
        )
      )}
      {a.category === "primary-logo" && (
        <p className="text-[11px] text-muted-foreground">This is the project's main logo. It is used as the browser tab icon, app icon and share preview image.</p>
      )}
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
      {view !== null && <Lightbox items={images} index={view} onClose={() => setView(null)} onNavigate={setView} />}
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
  const { upload, urls, jobs, canEdit } = useAssets();
  const ref = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
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
  const resolved = resolveSlotUrl(item.url, urls);
  return (
    <div>
      <ImageSlot
        item={{ ...item, url: resolved }}
        onChange={onChange}
        {...(aspect ? { aspect } : {})}
        {...(resolved ? { onView: () => setPreview(true) } : {})}
        onUpload={canEdit ? () => ref.current?.click() : undefined}
        isUploading={busy}
      />
      {canEdit ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5">
          <input
            ref={ref}
            type="file"
            multiple
            accept={IMAGE_ACCEPT}
            className="hidden"
            data-testid={`slot-upload-${slot}`}
            onChange={(e) => {
              send(e.target.files);
              e.target.value = "";
            }}
          />
          {onDelete && (
            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" aria-label="Delete visual" onClick={onDelete}>
              <Trash2 className="size-3.5" /> Delete card
            </Button>
          )}
          {rejected.length > 0 && <p className="w-full text-[11px] text-destructive">Only images go here: {rejected.join(", ")} skipped.</p>}
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">Switch to Edit mode (passcode) to upload an image directly.</p>
      )}
      {preview && resolved && (
        <Lightbox items={[{ src: resolved, alt: item.caption || "Uploaded visual", title: item.caption }]} index={0} onClose={() => setPreview(false)} />
      )}
    </div>
  );
}
