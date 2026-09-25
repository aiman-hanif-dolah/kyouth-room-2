import { useState } from "react";
import { Check, ChevronLeft, Minus, Plus, Package, Printer, Truck, Sparkles } from "lucide-react";
import { useProject, rm } from "@/lib/project/store";
import { BatikPattern, MOTIFS, PRODUCTS, ProductPreview, type MotifKey, type ProductKind } from "./Batik";
import { Badge, Button } from "./kit";
import { cn } from "@/lib/utils";

type Step = "design" | "product" | "checkout" | "tracking";
const STEPS: { key: Step; label: string }[] = [
  { key: "design", label: "Design" },
  { key: "product", label: "Product" },
  { key: "checkout", label: "Checkout" },
  { key: "tracking", label: "Track" },
];

export function priceFor(kind: ProductKind, qty: number) {
  const base = PRODUCTS.find((p) => p.key === kind)!.price;
  const subtotal = base * qty;
  const discount = qty >= 3 ? subtotal * 0.1 : 0;
  const shipping = subtotal - discount >= 150 ? 0 : 8;
  return { base, subtotal, discount, shipping, total: subtotal - discount + shipping };
}

/** Working interactive prototype of the selected product (placeholder concept). */
export function ProductDemo() {
  const { state } = useProject();
  const palette = state.company.palette.length >= 2 ? state.company.palette : [{ id: "a", name: "Dark", hex: "#1e2a78" }, { id: "b", name: "Light", hex: "#f4efe6" }];
  const [step, setStep] = useState<Step>("design");
  const [motif, setMotif] = useState<MotifKey>("parang");
  const [fgId, setFg] = useState(palette[0].id);
  const [bgId, setBg] = useState(palette[palette.length - 1].id);
  const [accentId, setAccent] = useState(palette[1].id);
  const [scale, setScale] = useState(1);
  const [kind, setKind] = useState<ProductKind>("tote");
  const [size, setSize] = useState("Standard");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [pay, setPay] = useState("FPX online banking");
  const [progress, setProgress] = useState(0);

  const hex = (id: string) => palette.find((p) => p.id === id)?.hex ?? palette[0].hex;
  const fg = hex(fgId), bg = hex(bgId), accent = hex(accentId);
  const product = PRODUCTS.find((p) => p.key === kind)!;
  const price = priceFor(kind, qty);
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const orderNo = "BL-" + (1000 + motif.length * 37 + qty * 11 + kind.length * 5);

  const Swatches = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div>
      <p className="mb-1.5 text-[11px] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {palette.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={value === p.id} aria-label={p.name} title={p.name} onClick={() => onChange(p.id)}
            className={cn("size-7 rounded-full border-2 transition-transform", value === p.id ? "scale-110 border-ring" : "border-transparent")} style={{ background: p.hex }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border-strong bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand-soft" />
          <span className="text-sm font-medium">{state.company.productName}</span>
          <Badge tone="warning">Prototype, mock orders only</Badge>
        </div>
        <ol className="hidden items-center gap-1 sm:flex">
          {STEPS.map((s, i) => (
            <li key={s.key} className={cn("rounded-full px-2.5 py-0.5 text-[11px]", i === stepIndex ? "bg-brand text-brand-foreground" : i < stepIndex ? "text-success" : "text-muted-foreground")}>
              {i < stepIndex ? "✓ " : `${i + 1}. `}{s.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid md:grid-cols-[1fr_320px]">
        <div className="relative grid min-h-[340px] place-items-center bg-card p-6">
          {step === "design" ? (
            <div className="aspect-square w-full max-w-[320px] overflow-hidden rounded-xl border border-border">
              <BatikPattern motif={motif} fg={fg} bg={bg} accent={accent} scale={scale} />
            </div>
          ) : step === "tracking" ? (
            <div className="w-full max-w-sm space-y-3">
              {[{ icon: Check, label: "Order confirmed" }, { icon: Printer, label: "Printing at partner shop, Klang" }, { icon: Package, label: "Quality checked and packed" }, { icon: Truck, label: "Out for delivery" }].map((s, i) => (
                <div key={s.label} className={cn("flex items-center gap-3 rounded-lg border p-3 transition-colors", i <= progress ? "border-success/40 bg-success/5" : "border-border")}>
                  <s.icon className={cn("size-4", i <= progress ? "text-success" : "text-muted-foreground")} />
                  <span className={cn("text-sm", i > progress && "text-muted-foreground")}>{s.label}</span>
                </div>
              ))}
              <Button size="sm" disabled={progress >= 3} onClick={() => setProgress((p) => Math.min(3, p + 1))}>Simulate next update</Button>
              {progress >= 3 && <p className="text-xs text-success">Delivered in the demo. In real life target is 5 to 7 days.</p>}
            </div>
          ) : (
            <div className="h-[300px] w-[260px]">
              <ProductPreview kind={kind} motif={motif} fg={fg} bg={bg} accent={accent} scale={scale} />
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-border p-4 md:border-l md:border-t-0">
          {step === "design" && (
            <>
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">Motif</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {MOTIFS.map((m) => (
                    <button key={m.key} type="button" aria-pressed={motif === m.key} onClick={() => setMotif(m.key)} className={cn("overflow-hidden rounded-lg border text-left transition-colors", motif === m.key ? "border-brand" : "border-border hover:border-border-strong")}>
                      <div className="h-12"><BatikPattern motif={m.key} fg={fg} bg={bg} accent={accent} scale={0.6} /></div>
                      <p className="px-2 py-1 text-xs">{m.name}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{MOTIFS.find((m) => m.key === motif)!.meaning}</p>
              </div>
              <Swatches label="Motif colour" value={fgId} onChange={setFg} />
              <Swatches label="Accent" value={accentId} onChange={setAccent} />
              <Swatches label="Background" value={bgId} onChange={setBg} />
              <label className="block text-[11px] text-muted-foreground">
                Pattern scale {scale.toFixed(1)}×
                <input type="range" min={0.5} max={2} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="mt-1 w-full accent-[var(--brand)]" />
              </label>
              <Button variant="primary" className="w-full" onClick={() => setStep("product")}>Put it on a product</Button>
            </>
          )}
          {step === "product" && (
            <>
              <div className="space-y-1.5">
                {PRODUCTS.map((p) => (
                  <button key={p.key} type="button" aria-pressed={kind === p.key} onClick={() => { setKind(p.key); setSize(p.sizes[Math.floor(p.sizes.length / 2)]); }} className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm", kind === p.key ? "border-brand bg-brand/5" : "border-border hover:border-border-strong")}>
                    {p.name}<span className="tabular-nums text-muted-foreground">{rm(p.price)}</span>
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((s) => (
                    <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={cn("rounded-md border px-2.5 py-1 text-xs", size === s ? "border-brand" : "border-border")}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Quantity (10% off at 3+)</span>
                <div className="flex items-center gap-1">
                  <Button size="sm" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><Minus className="size-3" /></Button>
                  <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
                  <Button size="sm" aria-label="Increase quantity" disabled={qty >= 20} onClick={() => setQty(qty + 1)}><Plus className="size-3" /></Button>
                </div>
              </div>
              <PriceBox price={price} />
              <div className="flex gap-2">
                <Button onClick={() => setStep("design")}><ChevronLeft className="size-4" /></Button>
                <Button variant="primary" className="flex-1" onClick={() => setStep("checkout")}>Checkout</Button>
              </div>
            </>
          )}
          {step === "checkout" && (
            <>
              <p className="text-sm">{qty} × {product.name} ({size}), {MOTIFS.find((m) => m.key === motif)!.name}</p>
              <label className="block text-[11px] text-muted-foreground">
                Name for delivery
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nurul" className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground" />
              </label>
              <label className="block text-[11px] text-muted-foreground">
                Payment (simulated)
                <select value={pay} onChange={(e) => setPay(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground">
                  <option>FPX online banking</option><option>Touch 'n Go eWallet</option><option>Card</option>
                </select>
              </label>
              <PriceBox price={price} />
              <div className="flex gap-2">
                <Button onClick={() => setStep("product")}><ChevronLeft className="size-4" /></Button>
                <Button variant="primary" className="flex-1" disabled={!name.trim()} title={!name.trim() ? "Enter a name first" : undefined} onClick={() => { setProgress(0); setStep("tracking"); }}>Place mock order</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">No real payment is taken. This is a prototype.</p>
            </>
          )}
          {step === "tracking" && (
            <>
              <p className="text-xs text-muted-foreground">Order {orderNo}</p>
              <p className="text-lg">Terima kasih, {name}!</p>
              <p className="text-sm text-subtle">{rm(price.total)} via {pay}</p>
              <Button variant="primary" className="w-full" onClick={() => { setStep("design"); setQty(1); setName(""); }}>Design another</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceBox({ price }: { price: ReturnType<typeof priceFor> }) {
  return (
    <dl className="space-y-1 rounded-lg bg-elevated p-3 text-xs tabular-nums">
      <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{rm(price.subtotal)}</dd></div>
      {price.discount > 0 && <div className="flex justify-between text-success"><dt>Bulk discount</dt><dd>-{rm(price.discount)}</dd></div>}
      <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{price.shipping ? rm(price.shipping) : "Free"}</dd></div>
      <div className="flex justify-between border-t border-border-strong pt-1 text-sm font-medium"><dt>Total</dt><dd>{rm(price.total)}</dd></div>
    </dl>
  );
}
