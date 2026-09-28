import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEditMode } from "./editmode";
import { createAssetUpload, deleteAsset, insertAsset, updateAssetMeta } from "./write.functions";
import type { SectionId } from "./types";

export const BUCKET = "project-assets";
export const MAX_FILE_MB = 20;

export interface Asset {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: "image" | "document" | "video" | "audio";
  width: number | null;
  height: number | null;
  section_id: SectionId;
  slot: string;
  caption: string;
  alt_text: string;
  tags: string[];
  category: string;
  in_presentation: boolean;
  sort_order: number;
  uploader_member_id: string;
  created_at: string;
}

export interface UploadJob {
  id: string;
  name: string;
  slot: string;
  progress: number;
  error: string;
  done: boolean;
}

const IMAGE_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml" };
const DOC_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const VIDEO_EXT: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/x-m4v" };
const AUDIO_EXT: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac" };
/** Browser-reported MIME types we accept per extension (empty type is allowed, many OSes omit it). */
const MIME_OK: Record<string, string[]> = {
  mp4: ["video/mp4"], webm: ["video/webm", "audio/webm"], mov: ["video/quicktime"], m4v: ["video/x-m4v", "video/mp4"],
  mp3: ["audio/mpeg", "audio/mp3"], wav: ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"], m4a: ["audio/mp4", "audio/x-m4a", "audio/m4a"], aac: ["audio/aac", "audio/x-aac", "audio/aacp"],
};
const kindOf = (e: string): Asset["kind"] => (IMAGE_EXT[e] ? "image" : VIDEO_EXT[e] ? "video" : AUDIO_EXT[e] ? "audio" : "document");
export const ACCEPT = [...Object.keys(IMAGE_EXT), ...Object.keys(DOC_EXT), ...Object.keys(VIDEO_EXT), ...Object.keys(AUDIO_EXT)].map((e) => "." + e).join(",");
export const IMAGE_ACCEPT = Object.keys(IMAGE_EXT).map((e) => "." + e).join(",");
/** True when the filename has an image extension we accept. */
export const isImageName = (name: string) => !!IMAGE_EXT[name.split(".").pop()?.toLowerCase() ?? ""];

export const SLOT_SECTION: Record<string, SectionId> = { "company.logo": "s1", "company.moodboard": "s1", "product.mockups": "s4", "marketing.visuals": "s6" };
export const slotSection = (slot: string, fallback: SectionId = "s1"): SectionId => SLOT_SECTION[slot] ?? (slot.startsWith("marketing.") ? "s6" : fallback);

export const SLOT_LABEL = (slot: string) =>
  slot === "company.logo" ? "Company logo" : slot === "company.moodboard" ? "Mood board" : slot === "product.mockups" ? "Product mockups" : slot === "marketing.visuals" ? "Marketing visuals" : slot.startsWith("marketing.sample.") ? "Social sample" : "Task library";

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Returns an error message, or "" if the file is acceptable. */
async function validate(file: File): Promise<string> {
  const e = ext(file.name);
  if (!IMAGE_EXT[e] && !DOC_EXT[e] && !VIDEO_EXT[e] && !AUDIO_EXT[e]) return `${file.name}: file type .${e || "?"} is not supported. Use PNG, JPG, WEBP, GIF, SVG, PDF, DOC/DOCX, PPT/PPTX, MP4, WEBM, MOV, M4V, MP3, WAV, M4A or AAC.`;
  if (MIME_OK[e] && file.type && !MIME_OK[e].includes(file.type)) return `${file.name}: the file says it is ${file.type}, which does not match .${e}. Re-export it and try again.`;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `${file.name}: ${(file.size / 1048576).toFixed(1)} MB is over the ${MAX_FILE_MB} MB per-file limit.`;
  if (file.size === 0) return `${file.name}: file is empty.`;
  if (e === "svg") {
    const text = await file.text();
    if (/<script|\son\w+\s*=|javascript:|<foreignObject/i.test(text)) return `${file.name}: this SVG contains scripts or embedded code, so it was blocked for safety. Export it as PNG instead.`;
  }
  return "";
}

function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((res) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { res({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 }); URL.revokeObjectURL(url); };
    img.onerror = () => { res(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

function putWithProgress(url: string, file: File, type: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && onProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Upload failed (${xhr.status})`;
      try { const j = JSON.parse(xhr.responseText); msg = j.message || j.error || msg; } catch { /* ignore */ }
      if (/quota|exceed|too large|payload/i.test(msg)) msg += ". The storage limit may have been reached.";
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and try again."));
    xhr.send(file);
  });
}

interface Ctx {
  assets: Asset[];
  urls: Record<string, string>;
  ready: boolean;
  canEdit: boolean;
  error: string;
  jobs: UploadJob[];
  upload: (files: File[], opts: { slot: string; section: SectionId; memberId?: string }) => Promise<string[]>;
  updateAsset: (id: string, patch: Partial<Asset>) => Promise<void>;
  removeAsset: (a: Asset) => Promise<void>;
  replaceAsset: (a: Asset, file: File) => Promise<void>;
  moveAsset: (list: Asset[], index: number, dir: -1 | 1) => Promise<void>;
  dismissJob: (id: string) => void;
}

const g = globalThis as unknown as { __tvAssetsCtx?: React.Context<Ctx | null> };
const AssetsContext = g.__tvAssetsCtx ?? (g.__tvAssetsCtx = createContext<Ctx | null>(null));

const byOrder = (a: Asset, b: Asset) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);

export function AssetsProvider({ children }: { children: ReactNode }) {
  const { canEdit } = useEditMode();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const urlByPath = useRef<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("project_assets").select("*").order("sort_order");
    if (e) { setError(e.message); return; }
    setAssets(((data ?? []) as unknown as Asset[]).sort(byOrder));
    setReady(true);
    setError("");
  }, []);

  // Everyone can see the shared library; only Edit mode can change it.
  useEffect(() => {
    load();
    const ch = supabase
      .channel("project-assets")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_assets" }, () => load())
      .subscribe();
    const refresh = setInterval(() => { urlByPath.current = {}; setUrls({}); load(); }, 45 * 60 * 1000);
    return () => { supabase.removeChannel(ch); clearInterval(refresh); };
  }, [load]);

  // Private files: fetch short-lived signed links for any new paths.
  useEffect(() => {
    const missing = assets.filter((a) => !urlByPath.current[a.storage_path]).map((a) => a.storage_path);
    if (!missing.length) {
      setUrls(Object.fromEntries(assets.map((a) => [a.id, urlByPath.current[a.storage_path] ?? ""])));
      return;
    }
    supabase.storage.from(BUCKET).createSignedUrls(missing, 3600).then(({ data }) => {
      for (const d of data ?? []) if (d.path && d.signedUrl) urlByPath.current[d.path] = d.signedUrl;
      setUrls(Object.fromEntries(assets.map((a) => [a.id, urlByPath.current[a.storage_path] ?? ""])));
    });
  }, [assets]);

  const setJob = (id: string, patch: Partial<UploadJob>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const sendFile = async (file: File, jobId: string) => {
    const e = ext(file.name);
    const type = IMAGE_EXT[e] ?? DOC_EXT[e] ?? VIDEO_EXT[e] ?? AUDIO_EXT[e] ?? file.type;
    const { path, signedUrl } = await createAssetUpload({ data: { fileName: file.name } });
    await putWithProgress(signedUrl, file, type, (p) => setJob(jobId, { progress: p }));
    const dims = IMAGE_EXT[e] ? await imageSize(file) : null;
    return { path, type, kind: kindOf(e), dims };
  };

  const upload: Ctx["upload"] = async (files, { slot, section, memberId }) => {
    if (!canEdit) return [];
    const base = Date.now();
    const created = await Promise.all(
      files.map(async (file, i) => {
        const jobId = crypto.randomUUID();
        setJobs((js) => [...js, { id: jobId, name: file.name, slot, progress: 0, error: "", done: false }]);
        const bad = await validate(file);
        if (bad) { setJob(jobId, { error: bad }); return null; }
        try {
          const r = await sendFile(file, jobId);
          const { id } = await insertAsset({
            data: {
              storage_path: r.path, file_name: file.name, mime_type: r.type, size_bytes: file.size, kind: r.kind,
              width: r.dims?.w ?? null, height: r.dims?.h ?? null, section_id: section, slot,
              in_presentation: r.kind === "image", sort_order: base + i, uploader_member_id: memberId ?? "",
            },
          });
          setJob(jobId, { progress: 100, done: true });
          setTimeout(() => setJobs((js) => js.filter((j) => j.id !== jobId)), 2500);
          return id;
        } catch (err) {
          setJob(jobId, { error: `${file.name}: ${(err as Error).message}` });
          return null;
        }
      }),
    );
    await load();
    return created.filter((id): id is string => !!id);
  };

  const updateAsset: Ctx["updateAsset"] = async (id, patch) => {
    setAssets((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)).sort(byOrder));
    try {
      await updateAssetMeta({ data: { id, patch: patch as Record<string, unknown> } });
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  const removeAsset: Ctx["removeAsset"] = async (a) => {
    setAssets((as) => as.filter((x) => x.id !== a.id));
    try {
      await deleteAsset({ data: { id: a.id, storagePath: a.storage_path } });
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  const replaceAsset: Ctx["replaceAsset"] = async (a, file) => {
    const jobId = crypto.randomUUID();
    setJobs((js) => [...js, { id: jobId, name: file.name, slot: a.slot, progress: 0, error: "", done: false }]);
    const bad = await validate(file);
    if (bad) return setJob(jobId, { error: bad });
    try {
      const r = await sendFile(file, jobId);
      await updateAssetMeta({
        data: {
          id: a.id,
          patch: { storage_path: r.path, file_name: file.name, mime_type: r.type, size_bytes: file.size, kind: r.kind, width: r.dims?.w ?? null, height: r.dims?.h ?? null },
          removePath: a.storage_path,
        },
      });
      setJob(jobId, { progress: 100, done: true });
      setTimeout(() => setJobs((js) => js.filter((j) => j.id !== jobId)), 2500);
      await load();
    } catch (err) {
      setJob(jobId, { error: `${file.name}: ${(err as Error).message}` });
    }
  };

  const moveAsset: Ctx["moveAsset"] = async (list, index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[index], b = list[j];
    let ao = b.sort_order, bo = a.sort_order;
    if (ao === bo) { ao = bo + dir; }
    await Promise.all([updateAsset(a.id, { sort_order: ao }), updateAsset(b.id, { sort_order: bo })]);
  };

  const value = useMemo<Ctx>(
    () => ({ assets, urls, ready, canEdit, error, jobs, upload, updateAsset, removeAsset, replaceAsset, moveAsset, dismissJob: (id) => setJobs((js) => js.filter((j) => j.id !== id)) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assets, urls, ready, canEdit, error, jobs],
  );
  return <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>;
}

export function useAssets() {
  const c = useContext(AssetsContext);
  if (!c) throw new Error("useAssets must be used within AssetsProvider");
  return c;
}

export const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
export const fileExt = ext;
