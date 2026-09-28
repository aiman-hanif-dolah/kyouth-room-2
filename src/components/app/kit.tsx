import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Check, Copy, ImagePlus, Link2, Plus, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject, uid } from "@/lib/project/store";
import { STATUS_LABEL, type SectionId, type Status, type ImageItem } from "@/lib/project/types";

let fieldCounter = 0;
function useFieldId() {
  const ref = useRef<string>("");
  if (!ref.current) ref.current = `f${++fieldCounter}`;
  return ref.current;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "brand"; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/85",
        variant === "brand" && "bg-brand text-brand-foreground hover:bg-brand/85",
        variant === "secondary" && "border border-border-strong bg-card text-foreground hover:bg-elevated",
        variant === "ghost" && "text-muted-foreground hover:bg-accent hover:text-foreground",
        variant === "danger" && "text-destructive hover:bg-destructive/10",
        className,
      )}
    />
  );
}

export function Card({ className, children, title, action, subtitle }: { className?: string; children: ReactNode; title?: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-panel", className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h3 className="text-[15px] font-medium tracking-tight">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-soft">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-normal tracking-[-0.9px] md:text-[42px] md:leading-[1.15]">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </header>
  );
}

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "neutral" && "border-border-strong text-muted-foreground",
        tone === "brand" && "border-brand/40 bg-brand/10 text-brand-soft",
        tone === "success" && "border-success/40 bg-success/10 text-success",
        tone === "warning" && "border-warning/40 bg-warning/10 text-warning",
        tone === "danger" && "border-destructive/40 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {children}
    </span>
  );
}

export const Fictional = () => <Badge tone="warning">Fictional</Badge>;
export const Assumption = () => <Badge tone="warning">Assumption</Badge>;

export function ProvenanceBadge({ section }: { section: SectionId }) {
  const { state } = useProject();
  if (state.tasks[section].verified) return <Badge tone="success">Verified by group</Badge>;
  if (state.touched[section]) return <Badge tone="brand">Edited by group</Badge>;
  return <Badge>Starter draft (fictional)</Badge>;
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

export function Field({ label, value, onChange, placeholder, type = "text", className, hint }: { label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; hint?: string }) {
  const id = useFieldId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Area({ label, value, onChange, rows = 3, placeholder, className, optional }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; className?: string; optional?: boolean }) {
  const id = useFieldId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "resize-y leading-relaxed")} />
      {!optional && !value.trim() && <p className="mt-1 text-[11px] text-warning">Not completed yet</p>}
    </div>
  );
}

export function NumField({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  const [raw, setRaw] = useState(String(value));
  const id = useFieldId();
  useEffect(() => setRaw(String(value)), [value]);
  const invalid = raw.trim() === "" || Number.isNaN(Number(raw)) || Number(raw) < min;
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={raw}
        aria-invalid={invalid}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value.trim() !== "" && !Number.isNaN(n) && n >= min) onChange(n);
        }}
        className={cn(inputCls, "h-8 px-2 text-right tabular-nums", invalid && "border-destructive focus:border-destructive")}
      />
      {invalid && <p className="mt-0.5 text-[10px] text-destructive">Enter a number ≥ {min}</p>}
    </div>
  );
}

export function Select<T extends string>({ label, value, onChange, options, className }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  const id = useFieldId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(inputCls, "h-9 py-0")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Editable list of strings */
export function StringList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5">
            <input
              aria-label={`${label} item ${i + 1}`}
              value={it}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className={cn(inputCls, "h-8 py-1")}
            />
            <Button size="sm" variant="ghost" aria-label="Remove item" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="ghost" className="mt-1.5" onClick={() => onChange([...items, ""])}>
        <Plus className="size-3.5" /> Add
      </Button>
    </div>
  );
}

export function RowControls({ index, length, onMove, onDelete }: { index: number; length: number; onMove: (dir: -1 | 1) => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <Button size="sm" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
        <ArrowUp className="size-3.5" />
      </Button>
      <Button size="sm" variant="ghost" aria-label="Move down" disabled={index === length - 1} onClick={() => onMove(1)}>
        <ArrowDown className="size-3.5" />
      </Button>
      {onDelete && (
        <Button size="sm" variant="danger" aria-label="Delete" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

export function move<T>(arr: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

export function CopyButton({ text, label = "Copy prompt" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {done ? "Copied" : label}
    </Button>
  );
}

export function AiNotConnected({ what = "AI drafting" }: { what?: string }) {
  return (
    <Button size="sm" variant="ghost" disabled title="No AI model is connected to this workspace yet. Copy a prompt from the Prompt Library into your AI tool instead.">
      {what}: not connected
    </Button>
  );
}

/** Prompt slot: copyable image prompt, optional pasted image link. Uploads go to the shared asset galleries. */
export function ImageSlot({ item, onChange, onDelete, aspect = "aspect-[4/3]" }: { item: ImageItem; onChange: (v: ImageItem) => void; onDelete?: () => void; aspect?: string }) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className={cn("relative mb-3 overflow-hidden rounded-md border border-dashed border-border-strong bg-elevated/50", aspect)}>
        {item.url ? (
          <img src={item.url} alt={item.caption || "Uploaded visual"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-3 text-center text-xs text-muted-foreground">
            <ImagePlus className="size-5" />
            No image yet. Upload directly with the button below, or paste a link.
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.url && (
          <Button size="sm" variant="ghost" onClick={() => onChange({ ...item, url: "" })}>
            Clear
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="danger" onClick={onDelete} aria-label="Delete visual">
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="mt-2 flex gap-1.5">
        <input aria-label="Image URL" placeholder="https://… image link" value={url} onChange={(e) => setUrl(e.target.value)} className={cn(inputCls, "h-8 py-1 text-xs")} />
        <Button size="sm" disabled={!/^https?:\/\//.test(url)} onClick={() => { onChange({ ...item, url }); setUrl(""); }}>
          <Link2 className="size-3.5" /> Use
        </Button>
      </div>
      {err && <p className="mt-1 text-[11px] text-destructive">{err}</p>}
      <input aria-label="Caption" value={item.caption} placeholder="Caption" onChange={(e) => onChange({ ...item, caption: e.target.value })} className={cn(inputCls, "mt-2 h-8 py-1 text-xs")} />
      <div className="mt-2">
        <textarea aria-label="Image generation prompt" rows={2} value={item.prompt} onChange={(e) => onChange({ ...item, prompt: e.target.value })} className={cn(inputCls, "text-xs")} />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Prompt for your image tool</span>
          <CopyButton text={item.prompt} />
        </div>
      </div>
    </div>
  );
}

export const newImage = (): ImageItem => ({ id: uid(), url: "", caption: "", prompt: "" });

const STATUS_TONE: Record<Status, Tone> = { not_started: "neutral", in_progress: "brand", ready_for_review: "warning", complete: "success" };
export const StatusBadge = ({ status }: { status: Status }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-elevated", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}
