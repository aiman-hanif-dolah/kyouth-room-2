import { useId } from "react";

export type MotifKey = "parang" | "kawung" | "bungaraya" | "pucukrebung";
export const MOTIFS: { key: MotifKey; name: string; meaning: string }[] = [
  { key: "parang", name: "Parang", meaning: "Unbroken diagonal waves: persistence" },
  { key: "kawung", name: "Kawung", meaning: "Four-petal palm fruit: harmony" },
  { key: "bungaraya", name: "Bunga Raya", meaning: "Hibiscus: national pride" },
  { key: "pucukrebung", name: "Pucuk Rebung", meaning: "Bamboo shoots: growth" },
];

function Tile({ motif, fg, accent }: { motif: MotifKey; fg: string; accent: string }) {
  switch (motif) {
    case "parang":
      return (
        <g fill="none" stroke={fg} strokeWidth="5" strokeLinecap="round">
          <path d="M-10 30 Q10 10 30 30 T70 30" transform="rotate(-45 20 20)" />
          <path d="M-10 50 Q10 30 30 50 T70 50" transform="rotate(-45 20 20)" stroke={accent} strokeWidth="3" />
          <circle cx="8" cy="8" r="2.5" fill={accent} stroke="none" />
          <circle cx="32" cy="32" r="2.5" fill={accent} stroke="none" />
        </g>
      );
    case "kawung":
      return (
        <g>
          {[[20, 8], [32, 20], [20, 32], [8, 20]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="7" ry="11" fill={fg} transform={`rotate(${i % 2 ? 90 : 0} ${x} ${y})`} />
          ))}
          <circle cx="20" cy="20" r="3" fill={accent} />
          <circle cx="0" cy="0" r="3" fill={accent} />
          <circle cx="40" cy="40" r="3" fill={accent} />
        </g>
      );
    case "bungaraya":
      return (
        <g>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="20" cy="11" rx="6" ry="9" fill={fg} transform={`rotate(${r} 20 20)`} />
          ))}
          <circle cx="20" cy="20" r="3.5" fill={accent} />
          <path d="M20 20 L26 12" stroke={accent} strokeWidth="1.5" />
        </g>
      );
    case "pucukrebung":
      return (
        <g>
          <path d="M20 2 L34 38 L6 38 Z" fill={fg} />
          <path d="M20 12 L28 34 L12 34 Z" fill={accent} />
          <path d="M20 20 L24 32 L16 32 Z" fill={fg} />
        </g>
      );
  }
}

/** A repeating batik-style pattern fill. Colours come from the project palette. */
export function BatikPattern({ motif, fg, bg, accent, scale = 1, className }: { motif: MotifKey; fg: string; bg: string; accent: string; scale?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const size = 40 * scale;
  return (
    <svg className={className} width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`scale(${scale})`}>
          <rect width="40" height="40" fill={bg} />
          <Tile motif={motif} fg={fg} accent={accent} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export type ProductKind = "tote" | "tee" | "scarf";
export const PRODUCTS: { key: ProductKind; name: string; price: number; sizes: string[] }[] = [
  { key: "tote", name: "Canvas tote", price: 49, sizes: ["Standard"] },
  { key: "tee", name: "Cotton tee", price: 69, sizes: ["XS", "S", "M", "L", "XL"] },
  { key: "scarf", name: "Satin scarf", price: 89, sizes: ["90 × 90 cm", "180 × 60 cm"] },
];

const SHAPES: Record<ProductKind, string> = {
  tote: "M60 70 Q60 20 100 20 Q140 20 140 70 L130 70 Q130 32 100 32 Q70 32 70 70 Z M40 70 L160 70 L150 220 L50 220 Z",
  tee: "M70 30 L50 40 L20 80 L45 95 L55 80 L55 220 L145 220 L145 80 L155 95 L180 80 L150 40 L130 30 Q100 55 70 30 Z",
  scarf: "M30 40 Q100 20 170 40 L170 170 Q100 150 30 170 Z M150 170 L160 225 L140 225 Z M50 170 L60 225 L40 225 Z",
};

/** Product silhouette clipped with the pattern */
export function ProductPreview({ kind, motif, fg, bg, accent, scale }: { kind: ProductKind; motif: MotifKey; fg: string; bg: string; accent: string; scale: number }) {
  const clip = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]" role="img" aria-label={`Preview of ${kind} with ${motif} pattern`}>
      <defs>
        <clipPath id={clip}>
          <path d={SHAPES[kind]} fillRule="evenodd" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <foreignObject width="200" height="240">
          <div style={{ width: 200, height: 240 }}>
            <BatikPattern motif={motif} fg={fg} bg={bg} accent={accent} scale={scale} />
          </div>
        </foreignObject>
      </g>
      <path d={SHAPES[kind]} fillRule="evenodd" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
    </svg>
  );
}
