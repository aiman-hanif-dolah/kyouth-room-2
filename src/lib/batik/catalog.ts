import { z } from "zod";
export const MOTIFS = [
  { id: "kawung", name: "Kawung", note: "An interlocking four-petal rhythm." },
  { id: "parang", name: "Parang", note: "Flowing diagonal waves." },
  { id: "hibiscus", name: "Bunga raya", note: "A celebration of the hibiscus." },
  { id: "bamboo", name: "Pucuk rebung", note: "Geometric bamboo-shoot forms." },
  { id: "mega", name: "Cloud drift", note: "Layered, flowing cloud contours." },
  { id: "ceplok", name: "Ceplok bloom", note: "A floral geometric medallion." },
  { id: "leaf", name: "Daun", note: "A light botanical repeat." },
  { id: "star", name: "Bintang", note: "An eight-point geometric star." },
  { id: "custom", name: "Your motif", note: "Build a signature repeat from shape, rhythm and colour." },
] as const;
export const PALETTES = [
  { name: "Midnight gold", colours: ["#252663", "#e9b65c", "#f4eddb", "#cd765b"] },
  { name: "Raya garden", colours: ["#205b49", "#d5ac55", "#f4eddb", "#bb647b"] },
  { name: "Coral coast", colours: ["#a54842", "#e7a773", "#fff1dc", "#327d87"] },
  { name: "Blue hour", colours: ["#164766", "#529caa", "#e6f0ec", "#d3a866"] },
  { name: "Orchid dusk", colours: ["#66395d", "#b38bb3", "#f3e9ee", "#d6ac71"] },
  { name: "Earth & ink", colours: ["#363b32", "#a88452", "#e4dbca", "#a5523f"] },
] as const;
export const CATEGORIES = ["All", "Wear", "Carry", "Home", "Fabric"] as const;
export type Category = typeof CATEGORIES[number];
export interface StudioProduct { id: string; name: string; category: Category; price: number; sizes: string[]; materials: string[]; description: string; path: string; seams: string }
const wearSizes = ["XS", "S", "M", "L", "XL", "2XL"];
export const PRODUCTS: StudioProduct[] = [
  { id: "tote", name: "Everyday tote", category: "Carry", price: 49, sizes: ["Standard", "Large"], materials: ["Canvas", "Linen blend"], description: "A little culture, everywhere you go.", path: "M160 170H440L420 520H180Z M220 170V115C220 35 380 35 380 115V170H350V115C350 75 250 75 250 115V170Z", seams: "M180 190H420M195 505H405" },
  { id: "tee", name: "Signature tee", category: "Wear", price: 69, sizes: wearSizes, materials: ["Cotton", "Linen blend"], description: "Your new everyday statement.", path: "M220 100L170 120L70 220L145 270L180 230V520H420V230L455 270L530 220L430 120L380 100Q300 180 220 100Z", seams: "M220 100Q300 195 380 100M190 505H410" },
  { id: "shirt", name: "Resort shirt", category: "Wear", price: 129, sizes: wearSizes, materials: ["Cotton", "Linen blend"], description: "Easy tailoring. Unmistakably yours.", path: "M240 85L170 115L85 225L155 265L185 225V515H415V225L445 265L515 225L430 115L360 85L300 140Z", seams: "M240 85L260 175L300 140L340 175L360 85M300 140V515M320 235H380V285H320Z" },
  { id: "kimono", name: "Batik kimono jacket", category: "Wear", price: 189, sizes: wearSizes, materials: ["Cotton", "Linen blend"], description: "An open layer with room for your own rhythm.", path: "M230 75L165 105L65 235L145 285L190 225V520H410V225L455 285L535 235L435 105L370 75L300 145Z M270 85L300 180L330 85L300 520Z", seams: "M230 75L300 180L370 75M195 505H405M190 225L215 260M410 260L435 225" },
  { id: "headwrap", name: "Batik headwrap", category: "Wear", price: 45, sizes: ["Short", "Long"], materials: ["Cotton", "Satin"], description: "A joyful finishing touch, tied your way.", path: "M100 205Q170 90 300 145Q430 90 500 205L465 385Q375 325 300 390Q225 325 135 385Z", seams: "M120 220Q205 125 300 175Q395 125 480 220M145 365Q230 310 300 370Q370 310 455 365" },
  { id: "kurung", name: "Baju kurung", category: "Wear", price: 219, sizes: wearSizes, materials: ["Cotton", "Satin"], description: "A modern occasion, a familiar silhouette.", path: "M250 75L175 105L110 330L165 350L210 200L180 365H420L390 200L435 350L490 330L425 105L350 75Q300 125 250 75Z M210 380H390L430 550H170Z", seams: "M250 75Q300 145 350 75M200 348H400M230 390L215 535M370 390L385 535" },
  { id: "kebaya", name: "Kebaya set", category: "Wear", price: 239, sizes: wearSizes, materials: ["Cotton", "Satin"], description: "Elegant lines with your own colour story.", path: "M255 70L185 110L100 340L160 360L215 220L195 350L300 320L405 350L385 220L440 360L500 340L415 110L345 70L300 180Z M220 370H380L415 550H185Z", seams: "M255 70L300 180L300 320M345 70L300 180M235 390L220 535" },
  { id: "scarf", name: "Satin scarf", category: "Wear", price: 89, sizes: ["90 × 90 cm", "180 × 60 cm"], materials: ["Satin", "Cotton"], description: "A soft frame for your favourite motif.", path: "M95 100Q300 65 505 100V485Q300 450 95 485Z", seams: "M110 115Q300 80 490 115V468Q300 435 110 468Z" },
  { id: "sarong", name: "Batik sarong", category: "Wear", price: 109, sizes: ["Standard", "Long"], materials: ["Cotton", "Satin"], description: "A generous canvas for an expressive repeat.", path: "M185 80Q300 105 415 80L450 545Q300 520 150 545Z", seams: "M205 110L190 515M375 110L390 515M185 120Q300 145 415 120" },
  { id: "pouch", name: "Zip pouch", category: "Carry", price: 35, sizes: ["Small", "Large"], materials: ["Canvas", "Cotton"], description: "The small details deserve good design too.", path: "M110 215Q300 190 490 215L460 435Q300 460 140 435Z", seams: "M120 230Q300 205 480 230M450 212L450 258" },
  { id: "laptop-sleeve", name: "Laptop sleeve", category: "Carry", price: 79, sizes: ["13 inch", "15 inch"], materials: ["Canvas", "Linen blend"], description: "Carry your everyday essentials in a one-off print.", path: "M75 185Q75 155 110 155H490Q525 155 525 190V435Q525 465 495 465H105Q75 465 75 435Z", seams: "M95 220H505M112 242H488M95 440H505" },
  { id: "notebook", name: "Creative journal", category: "Carry", price: 39, sizes: ["A5", "A4"], materials: ["Canvas", "Cotton"], description: "Wrap your next big idea in batik.", path: "M155 100H430Q445 100 445 115V505H155Q140 505 140 490V115Q140 100 155 100Z", seams: "M170 100V505M410 100V505M180 485H425" },
  { id: "cushion", name: "Cushion cover", category: "Home", price: 59, sizes: ["45 × 45 cm", "60 × 60 cm"], materials: ["Cotton", "Canvas", "Linen blend"], description: "Bring a little colour home.", path: "M100 125Q300 145 500 125Q470 310 500 495Q300 475 100 495Q130 310 100 125Z", seams: "M120 145Q300 163 480 145Q452 310 480 475Q300 457 120 475Q148 310 120 145Z" },
  { id: "runner", name: "Table runner", category: "Home", price: 79, sizes: ["140 × 35 cm", "200 × 35 cm"], materials: ["Cotton", "Linen blend"], description: "Set the table with a story.", path: "M225 55H375L415 520L300 570L185 520Z", seams: "M240 70H360L398 505L300 548L202 505Z" },
  { id: "fabric", name: "Fabric by the metre", category: "Fabric", price: 45, sizes: ["1 metre", "2 metres", "3 metres"], materials: ["Cotton", "Satin", "Linen blend"], description: "For the things only you can imagine.", path: "M100 90Q300 60 500 90V510Q300 540 100 510Z", seams: "M115 105Q300 75 485 105M115 495Q300 525 485 495" },
  { id: "apron", name: "Maker’s apron", category: "Wear", price: 89, sizes: wearSizes, materials: ["Cotton", "Linen blend"], description: "A practical layer for making, cooking and creating.", path: "M220 95H380L405 225L480 285L435 535H165L120 285L195 225Z M250 95V70C250 30 350 30 350 70V95Z", seams: "M220 110L240 220M380 110L360 220M175 300H425M190 505H410" },
  { id: "bucket-hat", name: "Pattern bucket hat", category: "Wear", price: 69, sizes: ["S", "M", "L"], materials: ["Cotton", "Canvas"], description: "A little shade with a lot of personality.", path: "M205 130Q300 75 395 130L430 300Q300 345 170 300Z M105 300Q300 375 495 300L470 365Q300 435 130 365Z", seams: "M205 165Q300 115 395 165M115 315Q300 390 485 315" },
  { id: "placemats", name: "Table ritual placemats", category: "Home", price: 49, sizes: ["Set of 2", "Set of 4"], materials: ["Cotton", "Linen blend"], description: "Make the everyday table feel considered.", path: "M55 175H260V425H55ZM285 175H490V425H285Z", seams: "M70 190H245V410H70ZM300 190H475V410H300Z" },
  { id: "tapestry", name: "Wall tapestry", category: "Home", price: 149, sizes: ["90 × 120 cm", "120 × 180 cm"], materials: ["Cotton", "Linen blend"], description: "Give a favourite wall its own story.", path: "M135 115H465V475Q300 545 135 475Z", seams: "M150 130H450V462Q300 522 150 462ZM135 145H465" },
];
export const motifShapeSchema = z.enum(["rosette", "diamond", "leaf", "wave", "star"]);
export const motifCenterSchema = z.enum(["circle", "diamond", "dot", "none"]);
export const motifLayerSchema = z.object({ id: z.string().uuid(), motif: z.enum(["kawung", "parang", "hibiscus", "bamboo", "mega", "ceplok", "leaf", "star", "custom"]), x: z.number().min(-60).max(120), y: z.number().min(-60).max(120), scale: z.number().min(0.15).max(1), rotation: z.number().min(0).max(360), opacity: z.number().min(0.1).max(1), colour: z.enum(["ink", "detail", "accent"]) });
export const designSchema = z.object({
  name: z.string().max(60), product: z.string(), size: z.string(), material: z.string(),
  motif: z.enum(["kawung", "parang", "hibiscus", "bamboo", "mega", "ceplok", "leaf", "star", "custom"]),
  customShape: motifShapeSchema.default("rosette"), customCenter: motifCenterSchema.default("circle"), customCount: z.number().int().min(4).max(12).default(8),
  customMotifImage: z.string().max(8000).regex(/^(?:|data:image\/webp;base64,[A-Za-z0-9+/]+={0,2})$/).default(""),
  customMotifPalette: z.tuple([z.string().regex(/^#[0-9a-f]{6}$/i), z.string().regex(/^#[0-9a-f]{6}$/i), z.string().regex(/^#[0-9a-f]{6}$/i), z.string().regex(/^#[0-9a-f]{6}$/i)]).optional(),
  secondary: z.enum(["none", "kawung", "parang", "hibiscus", "bamboo", "mega", "ceplok", "leaf", "star", "custom"]),
  secondaryScale: z.number().min(0.15).max(1).default(0.38), secondaryX: z.number().min(-60).max(120).default(34), secondaryY: z.number().min(-60).max(120).default(34), secondaryRotation: z.number().min(0).max(360).default(0), secondaryOpacity: z.number().min(0.1).max(1).default(1),
  layers: z.array(motifLayerSchema).max(3).default([]),
  ink: z.string().regex(/^#[0-9a-f]{6}$/i), accent: z.string().regex(/^#[0-9a-f]{6}$/i), background: z.string().regex(/^#[0-9a-f]{6}$/i), detail: z.string().regex(/^#[0-9a-f]{6}$/i),
  scale: z.number().min(24).max(120), spacing: z.number().min(0).max(32), rotation: z.number().min(0).max(360), opacity: z.number().min(0.15).max(1),
  repeat: z.enum(["grid", "brick", "half-drop", "diamond"]), mirror: z.boolean(), mirrorVertical: z.boolean().default(false), placement: z.enum(["all", "panel", "border"]), border: z.boolean(), texture: z.boolean(),
  monogram: z.string().max(16), monogramFont: z.enum(["serif", "sans", "script"]).default("serif"), monogramColor: z.enum(["ink", "detail", "accent"]).default("ink"), textSize: z.number().min(14).max(54), textX: z.number().min(120).max(480).default(300), textY: z.number().min(180).max(450),
}).refine((d) => { const p = PRODUCTS.find((x) => x.id === d.product); return !!p && p.sizes.includes(d.size) && p.materials.includes(d.material); }, "Invalid product options");
const paletteColourSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
export const customPaletteSchema = z.object({ id: z.string().uuid(), name: z.string().min(1).max(30), colours: z.tuple([paletteColourSchema, paletteColourSchema, paletteColourSchema, paletteColourSchema]) });
export type Design = z.infer<typeof designSchema>;
export type MotifLayer = z.infer<typeof motifLayerSchema>;
export type CustomPalette = z.infer<typeof customPaletteSchema>;
export interface DesignStarter { name: string; description: string; settings: Partial<Design> }
export const DEFAULT_DESIGN: Design = { name: "Midnight bloom", product: "tote", size: "Standard", material: "Canvas", motif: "kawung", customShape: "rosette", customCenter: "circle", customCount: 8, customMotifImage: "", secondary: "none", secondaryScale: 0.38, secondaryX: 34, secondaryY: 34, secondaryRotation: 0, secondaryOpacity: 1, layers: [], ink: "#252663", accent: "#e9b65c", background: "#f4eddb", detail: "#cd765b", scale: 60, spacing: 6, rotation: 0, opacity: 1, repeat: "grid", mirror: false, mirrorVertical: false, placement: "all", border: false, texture: true, monogram: "", monogramFont: "serif", monogramColor: "ink", textSize: 28, textX: 300, textY: 320 };
export const DESIGN_STARTERS: DesignStarter[] = [
  { name: "Garden court", description: "Hibiscus, leaf and warm gold.", settings: { motif: "hibiscus", repeat: "grid", scale: 72, spacing: 8, rotation: 0, ink: "#205b49", accent: "#d5ac55", background: "#f4eddb", detail: "#bb647b", secondary: "leaf", secondaryScale: 0.32, secondaryX: 48, secondaryY: 42, secondaryRotation: 0, secondaryOpacity: 0.85, layers: [], opacity: 1, mirror: false, placement: "all", border: false, texture: true } },
  { name: "Parang tide", description: "A flowing repeat in coastal blues.", settings: { motif: "parang", repeat: "brick", scale: 58, spacing: 5, rotation: 45, ink: "#164766", accent: "#d3a866", background: "#e6f0ec", detail: "#529caa", secondary: "none", layers: [], opacity: 1, mirror: false, placement: "all", border: false, texture: true } },
  { name: "Cloud silk", description: "Layered clouds with a dusk glow.", settings: { motif: "mega", repeat: "half-drop", scale: 78, spacing: 7, rotation: 15, ink: "#66395d", accent: "#d6ac71", background: "#f3e9ee", detail: "#b38bb3", secondary: "star", secondaryScale: 0.28, secondaryX: 60, secondaryY: 42, secondaryRotation: 15, secondaryOpacity: 0.8, layers: [], opacity: 1, mirror: false, placement: "all", border: false, texture: true } },
  { name: "Monsoon lattice", description: "Pucuk rebung meets earth and ink.", settings: { motif: "bamboo", repeat: "diamond", scale: 68, spacing: 9, rotation: 0, ink: "#363b32", accent: "#a88452", background: "#e4dbca", detail: "#a5523f", secondary: "ceplok", secondaryScale: 0.26, secondaryX: 46, secondaryY: 52, secondaryRotation: 45, secondaryOpacity: 0.75, layers: [], opacity: 1, mirror: false, placement: "all", border: false, texture: true } },
];
export const ORDER_STAGES = ["Order confirmed", "Printing your design", "Quality check & packing", "Out for delivery", "Delivered"];
export const PAYMENTS = ["FPX online banking", "Touch 'n Go eWallet", "Card"] as const;
export const money = (amount: number) => `RM${amount.toFixed(2)}`;
export const productFor = (d: Design) => PRODUCTS.find((p) => p.id === d.product) ?? PRODUCTS[0];
export function productSizeScale(d: Pick<Design, "product" | "size">) {
  const product = PRODUCTS.find((item) => item.id === d.product) ?? PRODUCTS[0];
  const sizeIndex = Math.max(0, product.sizes.indexOf(d.size));
  if (product.category === "Wear" && product.sizes === wearSizes) {
    const fit = 0.92 + sizeIndex * 0.04;
    return { x: fit, y: 0.96 + sizeIndex * 0.016, z: fit };
  }
  switch (product.id) {
    case "tote": return d.size === "Large" ? { x: 1.16, y: 1.1, z: 1.12 } : { x: 1, y: 1, z: 1 };
    case "scarf": return sizeIndex === 0 ? { x: 1, y: 0.72, z: 0.72 } : { x: 1.5, y: 0.9, z: 0.9 };
    case "pouch": return d.size === "Large" ? { x: 1.18, y: 1.12, z: 1.08 } : { x: 1, y: 1, z: 1 };
    case "laptop-sleeve": return d.size === "15 inch" ? { x: 1.14, y: 1.12, z: 1.05 } : { x: 1, y: 1, z: 1 };
    case "headwrap": return d.size === "Long" ? { x: 1.32, y: 1.08, z: 1 } : { x: 1, y: 1, z: 1 };
    case "notebook": return d.size === "A4" ? { x: 1.25, y: 1.2, z: 1.08 } : { x: 1, y: 1, z: 1 };
    case "cushion": return d.size.startsWith("60") ? { x: 1.28, y: 1.28, z: 1.15 } : { x: 1, y: 1, z: 1 };
    case "runner": return sizeIndex === 1 ? { x: 1, y: 1, z: 1.42 } : { x: 1, y: 1, z: 1 };
    case "fabric": return { x: 1, y: 1 + sizeIndex * 0.22, z: 1 };
    case "placemats": return d.size === "Set of 4" ? { x: 1.18, y: 1, z: 1 } : { x: 1, y: 1, z: 1 };
    case "tapestry": return sizeIndex === 1 ? { x: 1.16, y: 1.32, z: 1 } : { x: 1, y: 1, z: 1 };
    default: return { x: 1, y: 1, z: 1 };
  }
}
export function unitPrice(d: Design) {
  const p = productFor(d);
  const sizeIndex = Math.max(0, p.sizes.indexOf(d.size));
  const sizeExtra = p.category === "Wear" && p.sizes === wearSizes ? 0 : sizeIndex * (p.id === "fabric" ? p.price : 15);
  const materialExtra = d.material === "Satin" ? 12 : d.material === "Linen blend" ? 18 : 0;
  return p.price + sizeExtra + materialExtra;
}
export const cartItemSchema = z.object({ id: z.string(), design: designSchema, quantity: z.number().int().min(1).max(20) });
export type CartItem = z.infer<typeof cartItemSchema>;
export function cartTotals(items: CartItem[]) {
  const units = items.reduce((n, x) => n + x.quantity, 0);
  const subtotal = items.reduce((n, x) => n + unitPrice(x.design) * x.quantity, 0);
  const discount = units >= 3 ? Math.round(subtotal * 10) / 100 : 0;
  const shipping = !units || subtotal - discount >= 150 ? 0 : 8;
  return { units, subtotal, discount, shipping, total: subtotal - discount + shipping };
}
export const savedSchema = z.object({ id: z.string(), design: designSchema, date: z.string() });
export const orderSchema = z.object({ id: z.string(), date: z.string(), items: z.array(cartItemSchema), name: z.string(), payment: z.string(), progress: z.number().int().min(0).max(4), total: z.number().nonnegative() });
export type SavedDesign = z.infer<typeof savedSchema>;
export type StudioOrder = z.infer<typeof orderSchema>;
