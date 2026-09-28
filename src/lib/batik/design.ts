import { MOTIFS, PRODUCTS, productFor, type Design } from "./catalog";
const escapeXml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
export async function importMotifImage(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image smaller than 8 MB.");
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    if (image.naturalWidth > 10000 || image.naturalHeight > 10000) throw new Error("This image is too large to process.");
    let webpSupported = true;
    for (const size of [128, 96]) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable in this browser.");
      const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", size === 128 ? 0.62 : 0.48));
      if (blob && blob.type !== "image/webp") webpSupported = false;
      if (blob?.type === "image/webp" && blob.size <= 5900) return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image conversion failed."));
        reader.onerror = () => reject(new Error("Image conversion failed."));
        reader.readAsDataURL(blob);
      });
    }
    if (!webpSupported) throw new Error("Compact image conversion is unavailable in this browser.");
    throw new Error("This image is too detailed to save as a compact repeating motif. Try a simpler image.");
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error("This image could not be opened. Try a PNG, JPEG or WebP file.");
  } finally {
    URL.revokeObjectURL(source);
  }
}
function customMotifSvg(ink: string, accent: string, detail: string, shape: Design["customShape"], center: Design["customCenter"], count: number) {
  const points = Array.from({ length: count * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? 27 : 12;
    const angle = -Math.PI / 2 + index * Math.PI / count;
    return `${30 + Math.cos(angle) * radius},${30 + Math.sin(angle) * radius}`;
  }).join(" ");
  const petals = Array.from({ length: count }, (_, index) => `<ellipse transform="rotate(${index * 360 / count} 30 30)" cx="30" cy="16" rx="7" ry="14"/>`).join("");
  const leaves = Array.from({ length: count }, (_, index) => `<g transform="rotate(${index * 360 / count} 30 30)"><path d="M30 30Q14 15 27 3Q43 14 30 30Z" stroke="${detail}" stroke-width="1.2"/><path d="M30 29L29 9" fill="none" stroke="${accent}" stroke-width="1.5"/></g>`).join("");
  const veins = Array.from({ length: count }, (_, index) => `<path transform="rotate(${index * 360 / count} 30 30)" d="M30 28L30 12" fill="none" stroke="${detail}" stroke-width="1.2"/>`).join("");
  const geometry = shape === "rosette" ? `<g fill="${ink}">${petals}</g><g>${veins}</g>`
    : shape === "diamond" ? `<polygon points="${points}" fill="${ink}" stroke="${detail}" stroke-width="1.8"/><path d="M30 16L44 30L30 44L16 30Z" fill="${accent}"/>`
    : shape === "leaf" ? `<g fill="${ink}">${leaves}</g>`
      : shape === "wave" ? `<g fill="none" stroke-width="3">${Array.from({ length: Math.ceil(count / 2) }, (_, index) => `<circle cx="30" cy="30" r="${10 + index * 7}" stroke="${index % 2 ? detail : accent}"/>`).join("")}</g>`
        : `<polygon points="${points}" fill="${ink}" stroke="${detail}" stroke-width="1.8"/>`;
  const centre = center === "circle" ? `<circle cx="30" cy="30" r="7" fill="${accent}"/>`
    : center === "diamond" ? `<path d="M30 21L39 30L30 39L21 30Z" fill="${accent}"/>`
      : center === "dot" ? `<circle cx="30" cy="30" r="3" fill="${accent}"/>` : "";
  return `${geometry}${centre}`;
}
function motifSvg(motif: Design["motif"], ink: string, accent: string, custom: Pick<Design, "customShape" | "customCenter" | "customCount" | "customMotifImage" | "detail">) {
  const petal = '<ellipse cx="30" cy="15" rx="9" ry="14"/>';
  switch (motif) {
    case "kawung": return `<g fill="${ink}">${[0,90,180,270].map((r) => `<g transform="rotate(${r} 30 30)">${petal}</g>`).join("")}</g><circle cx="30" cy="30" r="4" fill="${accent}"/>`;
    case "hibiscus": return `<g fill="${ink}">${[0,72,144,216,288].map((r) => `<g transform="rotate(${r} 30 30)">${petal}</g>`).join("")}</g><path d="M30 30L43 10" stroke="${accent}" stroke-width="3"/><circle cx="30" cy="30" r="5" fill="${accent}"/>`;
    case "parang": return `<g fill="none" stroke="${ink}" stroke-width="6"><path d="M-10 10Q10-10 30 10T70 10M-10 40Q10 20 30 40T70 40"/></g><path d="M-10 25Q10 5 30 25T70 25M-10 55Q10 35 30 55T70 55" fill="none" stroke="${accent}" stroke-width="3"/>`;
    case "bamboo": return `<path d="M30 3L55 57H5Z" fill="${ink}"/><path d="M30 18L45 50H15Z" fill="${accent}"/><path d="M30 30L35 45H25Z" fill="${ink}"/>`;
    case "mega": return `<g fill="none" stroke="${ink}" stroke-width="3"><path d="M2 45Q-4 28 13 27Q8 5 30 10Q42-2 49 22Q65 22 57 45Z"/><path d="M10 40Q5 32 20 32Q15 17 32 19Q41 12 42 29Q56 29 49 40Z"/></g><path d="M22 37Q20 25 31 28Q39 22 40 37Z" fill="${accent}"/>`;
    case "ceplok": return `<path d="M30 2L42 18L58 30L42 42L30 58L18 42L2 30L18 18Z" fill="${ink}"/><circle cx="30" cy="30" r="13" fill="${accent}"/><path d="M30 20L40 30L30 40L20 30Z" fill="${ink}"/>`;
    case "leaf": return `<path d="M12 50Q-2 12 45 6Q60 43 12 50Z" fill="${ink}"/><path d="M10 54L42 12M20 42L16 22M29 31L46 28" stroke="${accent}" stroke-width="2" fill="none"/>`;
    case "star": return `<path d="M30 1L37 13L51 9L47 23L59 30L47 37L51 51L37 47L30 59L23 47L9 51L13 37L1 30L13 23L9 9L23 13Z" fill="${ink}"/><circle cx="30" cy="30" r="10" fill="${accent}"/>`;
    case "custom": return custom.customMotifImage ? `<image x="3" y="3" width="54" height="54" href="${custom.customMotifImage}" preserveAspectRatio="xMidYMid meet"/>` : customMotifSvg(ink, accent, custom.detail, custom.customShape, custom.customCenter, custom.customCount);
  }
}
export type PreviewMode = "product" | "pattern" | "3d";
export function repeatRotation(d: Design) { return d.rotation + (d.repeat === "diamond" ? 45 : 0); }
export function designSvg(d: Design, mode: PreviewMode = "product") {
  const tile = d.scale + d.spacing;
  const w = d.repeat === "half-drop" ? tile * 2 : tile;
  const h = d.repeat === "brick" ? tile * 2 : tile;
  const motif = motifSvg(d.motif, d.ink, d.accent, d);
  const draw = (x: number, y: number) => `<g transform="translate(${x + d.spacing / 2} ${y + d.spacing / 2}) scale(${d.scale / 60})"><g transform="${d.mirror ? "translate(60 0) scale(-1 1)" : ""}" opacity="${d.opacity}">${motif}</g>${d.secondary !== "none" ? `<g transform="translate(${d.secondaryX} ${d.secondaryY}) rotate(${d.secondaryRotation} 30 30) scale(${d.secondaryScale})" opacity="${d.secondaryOpacity}">${motifSvg(d.secondary, d.detail, d.accent, d)}</g>` : ""}${d.layers.map((layer) => `<g transform="translate(${layer.x} ${layer.y}) rotate(${layer.rotation} 30 30) scale(${layer.scale})" opacity="${layer.opacity}">${motifSvg(layer.motif, layer.colour === "ink" ? d.ink : layer.colour === "accent" ? d.accent : d.detail, layer.colour === "accent" ? d.ink : d.accent, d)}</g>`).join("")}</g>`;
  let tiles = draw(0,0);
  if (d.repeat === "brick") tiles += draw(-tile/2,tile) + draw(tile/2,tile);
  if (d.repeat === "half-drop") tiles += draw(tile,-tile/2) + draw(tile,tile/2);
  const product = productFor(d);
  const patternRect = '<rect width="600" height="600" fill="url(#batik-repeat)"/>';
  const placement = d.placement === "panel" ? '<rect x="230" y="180" width="140" height="270" fill="url(#batik-repeat)"/>' : d.placement === "border" ? '<path d="M0 440H600V530H0Z" fill="url(#batik-repeat)"/>' : patternRect;
  const signatureAnchor = d.monogramFont === "script" ? "cursive" : d.monogramFont === "sans" ? "Arial,sans-serif" : "Georgia,serif";
  const signatureInk = d.monogramColor === "accent" ? d.accent : d.monogramColor === "detail" ? d.detail : d.ink;
  const print = mode === "pattern" ? patternRect : `<g clip-path="url(#product-clip)"><rect width="600" height="600" fill="${d.background}"/>${placement}${d.border ? `<path d="M0 450H600M0 470H600" stroke="${d.detail}" stroke-width="7"/>` : ""}${d.monogram ? `<rect x="${d.textX - 120}" y="${d.textY - d.textSize}" width="240" height="${d.textSize + 22}" rx="4" fill="${d.background}"/><text x="${d.textX}" y="${d.textY}" text-anchor="middle" font-family="${signatureAnchor}" font-size="${d.textSize}" fill="${signatureInk}">${escapeXml(d.monogram)}</text>` : ""}${d.texture ? '<rect width="600" height="600" fill="url(#weave)" opacity=".13"/>' : ""}<rect width="600" height="600" fill="url(#folds)"/></g><path d="${product.path}" fill="none" stroke="#292338" stroke-opacity=".18" stroke-width="2"/><path d="${product.seams}" fill="none" stroke="${d.ink}" stroke-opacity=".4" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 600 600"><title>${escapeXml(d.name)} — ${escapeXml(product.name)}</title><defs><pattern id="batik-repeat" width="${w}" height="${h}" patternUnits="userSpaceOnUse" patternTransform="rotate(${repeatRotation(d)} 300 300)"><rect width="${w}" height="${h}" fill="${d.background}"/>${tiles}</pattern><pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0H4M0 0V4" stroke="#444" stroke-width=".5"/></pattern><linearGradient id="folds"><stop stop-color="#000" stop-opacity=".12"/><stop offset=".35" stop-color="#fff" stop-opacity=".13"/><stop offset=".7" stop-color="#000" stop-opacity=".02"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient><clipPath id="product-clip"><path d="${product.path}" fill-rule="evenodd"/></clipPath></defs>${print}</svg>`;
}
export function designImage(d: Design, mode: PreviewMode = "product") { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(designSvg(d, mode))}`; }
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportDesign(d: Design, mode: PreviewMode, format: "svg" | "png") {
  const svg = designSvg(d, mode);
  const filename = `${d.name.replace(/[^a-z0-9-]/gi, "-") || "batik-design"}-${mode}`;
  if (format === "svg") { downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${filename}.svg`); return; }
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas"); canvas.width = 2400; canvas.height = 2400;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is not supported by this browser.");
  context.drawImage(img, 0, 0, 2400, 2400);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("PNG export failed")), "image/png"));
  downloadBlob(blob, `${filename}.png`);
}

export async function exportPatternSheet(d: Design, format: "svg" | "png") {
  const tile = d.scale + d.spacing;
  const tileWidth = d.repeat === "half-drop" ? tile * 2 : tile;
  const tileHeight = d.repeat === "brick" ? tile * 2 : tile;
  const preview = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(designSvg(d, "pattern"))}`;
  const colours = [d.ink, d.accent, d.background, d.detail];
  const labels = ["Motif ink", "Accent", "Base cloth", "Detail"];
  const repeat = { grid: "Straight repeat", brick: "Half-brick", "half-drop": "Half-drop", diamond: "Diamond lattice" }[d.repeat];
  const swatches = colours.map((colour, index) => {
    const y = 605 + index * 82;
    return `<rect x="850" y="${y}" width="56" height="56" rx="10" fill="${colour}" stroke="#d8d1c8"/><text x="928" y="${y + 24}" fill="#302943" font-family="Arial,sans-serif" font-size="18" font-weight="700">${labels[index]}</text><text x="928" y="${y + 48}" fill="#716b7b" font-family="Arial,sans-serif" font-size="15">${colour.toUpperCase()}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1600" height="1100" viewBox="0 0 1600 1100"><rect width="1600" height="1100" fill="#f2ece3"/><text x="80" y="84" fill="#935242" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="3">BATIK LAB · PATTERN SHEET</text><text x="80" y="146" fill="#292640" font-family="Georgia,serif" font-size="44" font-weight="700">${escapeXml(d.name || "Untitled design")}</text><text x="80" y="184" fill="#716b7b" font-family="Arial,sans-serif" font-size="19">A visual study of motif, rhythm and colour</text><rect x="80" y="230" width="700" height="700" rx="28" fill="#fffaf1" stroke="#ded5ca"/><image x="120" y="270" width="620" height="620" href="${preview}" xlink:href="${preview}" preserveAspectRatio="xMidYMid meet"/><text x="850" y="270" fill="#935242" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="2">MOTIF &amp; RHYTHM</text><text x="850" y="316" fill="#292640" font-family="Georgia,serif" font-size="29">${escapeXml(MOTIFS.find((motif) => motif.id === d.motif)?.name ?? d.motif)}</text><text x="850" y="354" fill="#716b7b" font-family="Arial,sans-serif" font-size="18">${escapeXml(repeat)} · ${tileWidth} × ${tileHeight} studio units</text><text x="850" y="390" fill="#716b7b" font-family="Arial,sans-serif" font-size="18">${d.scale} motif scale · ${d.spacing} spacing · ${repeatRotation(d)}° rotation</text><text x="850" y="478" fill="#935242" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="2">COLOUR STORY</text>${swatches}<text x="80" y="1002" fill="#716b7b" font-family="Arial,sans-serif" font-size="17">Illustrative creative preview · Studio units are not physical measurements or production specifications.</text></svg>`;
  const filename = `${d.name.replace(/[^a-z0-9-]/gi, "-") || "batik-design"}-pattern-sheet`;
  if (format === "svg") {
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${filename}.svg`);
    return;
  }
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 2400;
  canvas.height = 1650;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is not supported by this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Pattern-sheet PNG export failed")), "image/png"));
  downloadBlob(blob, `${filename}.png`);
}

export async function exportProductRange(d: Design, format: "svg" | "png") {
  const columns = 4;
  const cardWidth = 470;
  const cardHeight = 520;
  const gap = 18;
  const margin = 40;
  const headerHeight = 180;
  const rows = Math.ceil(PRODUCTS.length / columns);
  const width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
  const height = headerHeight + margin + rows * cardHeight + (rows - 1) * gap + margin;
  const cards = PRODUCTS.map((product, index) => {
    const x = margin + (index % columns) * (cardWidth + gap);
    const y = headerHeight + margin + Math.floor(index / columns) * (cardHeight + gap);
    const productDesign = { ...d, product: product.id, size: product.sizes[0], material: product.materials[0] };
    const preview = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(designSvg(productDesign, "product"))}`;
    return `<g><rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="22" fill="#fffaf1" stroke="#ded5ca"/><image x="${x + 18}" y="${y + 14}" width="${cardWidth - 36}" height="${cardHeight - 118}" href="${preview}" preserveAspectRatio="xMidYMid meet"/><text x="${x + 24}" y="${y + cardHeight - 68}" fill="#292640" font-family="Arial,sans-serif" font-size="23" font-weight="700">${escapeXml(product.name)}</text><text x="${x + 24}" y="${y + cardHeight - 35}" fill="#777081" font-family="Arial,sans-serif" font-size="16">${escapeXml(product.category)} · from RM${product.price.toFixed(2)}</text></g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f2ece3"/><text x="${margin}" y="72" fill="#292640" font-family="Arial,sans-serif" font-size="46" font-weight="700">A world of your own</text><text x="${margin}" y="119" fill="#716b7b" font-family="Arial,sans-serif" font-size="22">${escapeXml(d.name || "Untitled design")} · one batik story, ${PRODUCTS.length} ways to wear it</text>${cards}</svg>`;
  const filename = `${d.name.replace(/[^a-z0-9-]/gi, "-") || "batik-design"}-product-range`;
  if (format === "svg") {
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${filename}.svg`);
    return;
  }
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 2400;
  canvas.height = Math.round(2400 * height / width);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is not supported by this browser.");
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Product-range PNG export failed")), "image/png"));
  downloadBlob(blob, `${filename}.png`);
}
