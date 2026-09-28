import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { DEFAULT_DESIGN, MOTIFS, PALETTES, PRODUCTS, PAYMENTS, ORDER_STAGES, cartItemSchema, cartTotals, customPaletteSchema, designSchema, motifLayerSchema, orderSchema, productFor, savedSchema, unitPrice, money, type Design, type DesignStarter, type MotifLayer, type CartItem, type SavedDesign, type StudioOrder, type Category, type CustomPalette } from "./catalog";
import { downloadBlob, exportDesign, exportPatternSheet, exportProductRange, importMotifImage as createMotifImage, type PreviewMode } from "./design";
const KEY = "batik-lab-studio-v1";
const cacheSchema = z.object({ version: z.literal(1), design: designSchema, saved: z.array(savedSchema).max(100), cart: z.array(cartItemSchema).max(100), orders: z.array(orderSchema).max(100), palettes: z.array(customPaletteSchema).max(12).default([]) });
const libraryBackupSchema = z.object({ format: z.literal("batik-lab-library"), version: z.literal(1), current: designSchema.optional(), designs: z.array(savedSchema).max(100), palettes: z.array(customPaletteSchema).max(12) });
const id = () => crypto.randomUUID();
const checkoutSchema = z.object({ name: z.string().trim().min(2, "Enter a demo name of at least 2 characters.").max(60), payment: z.enum(PAYMENTS), acknowledged: z.literal(true, { errorMap: () => ({ message: "Confirm that this is a simulated order." }) }) });
export type StudioTab = "studio" | "collection" | "saved" | "bag" | "orders";
export type ProductSort = "featured" | "price-ascending" | "price-descending" | "name";
function readLinkedDesign() {
  const url = new URL(window.location.href);
  const payload = url.searchParams.get("design");
  if (payload === null) return { found: false, design: null };
  url.searchParams.delete("design");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  try {
    const parsed = designSchema.safeParse(JSON.parse(payload));
    return { found: true, design: parsed.success ? parsed.data : null };
  } catch {
    return { found: true, design: null };
  }
}
export function useBatikStudio() {
  const [history, setHistory] = useState<{ past: Design[]; current: Design; future: Design[] }>({ past: [], current: DEFAULT_DESIGN, future: [] });
  const [saved, setSaved] = useState<SavedDesign[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<StudioOrder[]>([]);
  const [customPalettes, setCustomPalettes] = useState<CustomPalette[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<StudioTab>("studio");
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [productSort, setProductSort] = useState<ProductSort>("featured");
  const [mode, setMode] = useState<PreviewMode>("product");
  const [zoom, setZoom] = useState(1);
  const [name, setName] = useState("");
  const [payment, setPayment] = useState<typeof PAYMENTS[number]>(PAYMENTS[0]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCopyError, setShareCopyError] = useState(false);
  const motifImportRequest = useRef(0);
  const design = history.current;
  useEffect(() => {
    try {
      const linked = readLinkedDesign();
      if (linked.design) {
        setHistory({ past: [], current: linked.design, future: [] });
        setNotice(`Shared design opened: ${linked.design.name || "Untitled design"}. Your edits stay in this browser.`);
      } else {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const value = cacheSchema.parse(JSON.parse(raw));
          setHistory({ past: [], current: value.design, future: [] }); setSaved(value.saved); setCart(value.cart); setOrders(value.orders); setCustomPalettes(value.palettes);
        }
        if (linked.found) setNotice("That shared design link is invalid or no longer supported. Your saved studio was kept.");
      }
    } catch { setStorageError("Browser saves could not be loaded. Your existing storage has been preserved; new changes stay in this session."); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, design, saved, cart, orders, palettes: customPalettes })); }
    catch { setStorageError("Browser storage is unavailable or full. Your work stays in this session. Download your designs to keep a copy."); }
  }, [ready, design, saved, cart, orders, customPalettes, storageError]);
  const replace = (next: Design) => {
    motifImportRequest.current += 1;
    setHistory((h) => ({ past: [...h.past, h.current].slice(-60), current: next, future: [] }));
  };
  const change = (patch: Partial<Design>) => {
    if ("motif" in patch && patch.motif !== "custom") motifImportRequest.current += 1;
    setHistory((h) => {
      const next = designSchema.safeParse({ ...h.current, ...patch });
      return next.success ? { past: [...h.past, h.current].slice(-60), current: next.data, future: [] } : h;
    });
  };
  const selectProduct = (productId: string, size?: string, material?: string) => {
    const p = PRODUCTS.find((x) => x.id === productId);
    if (!p) return;
    change({ product: p.id, size: size && p.sizes.includes(size) ? size : p.sizes.includes(design.size) ? design.size : p.sizes[0], material: material && p.materials.includes(material) ? material : p.materials.includes(design.material) ? design.material : p.materials[0] });
    setTab("studio");
  };
  const palette = (index: number) => {
    const p = PALETTES[index]; if (!p) return;
    change({ ink: p.colours[0], accent: p.colours[1], background: p.colours[2], detail: p.colours[3] });
  };
  const importCustomMotif = async (file: File) => {
    const request = ++motifImportRequest.current;
    try {
      const customMotifImage = await createMotifImage(file);
      if (request !== motifImportRequest.current) return;
      change({ motif: "custom", customMotifImage });
      setNotice("Your artwork is now a repeating custom motif. It stays in this browser with your design.");
    } catch (error) {
      if (request !== motifImportRequest.current) return;
      setNotice(error instanceof Error ? error.message : "This image could not be added. Try a PNG, JPEG or WebP file.");
    }
  };
  const removeCustomMotif = () => {
    motifImportRequest.current += 1;
    change({ customMotifImage: "" });
    setNotice("Uploaded artwork removed. Your geometric custom motif is restored.");
  };
  const applyStarter = (starter: DesignStarter) => {
    motifImportRequest.current += 1;
    change(starter.settings);
    setNotice(`${starter.name} recipe applied. Undo takes you back.`);
  };
  const savePalette = () => {
    const colours = [design.ink, design.accent, design.background, design.detail] as CustomPalette["colours"];
    if (customPalettes.some((item) => item.colours.every((colour, index) => colour.toLowerCase() === colours[index].toLowerCase()))) {
      setNotice("These colours are already on your palette shelf.");
      return;
    }
    if (customPalettes.length >= 12) { setNotice("Your palette shelf is full. Remove a palette to make room."); return; }
    const savedPalette = customPaletteSchema.parse({ id: id(), name: `My palette ${customPalettes.length + 1}`, colours });
    setCustomPalettes((items) => [...items, savedPalette]);
    setNotice(`${savedPalette.name} saved to your palette shelf.`);
  };
  const applyCustomPalette = (savedPalette: CustomPalette) => change({ ink: savedPalette.colours[0], accent: savedPalette.colours[1], background: savedPalette.colours[2], detail: savedPalette.colours[3] });
  const removePalette = (paletteId: string) => setCustomPalettes((items) => items.filter((item) => item.id !== paletteId));
  const shuffle = () => {
    motifImportRequest.current += 1;
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const m = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
    change({ motif: m.id, ink: p.colours[0], accent: p.colours[1], background: p.colours[2], detail: p.colours[3], rotation: [0,45,90][Math.floor(Math.random()*3)], name: `${p.name} / ${m.name}` });
    setNotice("A fresh colour story. Undo takes you back.");
  };
  const undo = () => setHistory((h) => h.past.length ? { past: h.past.slice(0,-1), current: h.past[h.past.length-1], future: [h.current, ...h.future] } : h);
  const redo = () => setHistory((h) => h.future.length ? { past: [...h.past, h.current], current: h.future[0], future: h.future.slice(1) } : h);
  const save = () => {
    if (saved.length >= 100) { setNotice("Your shelf has 100 designs. Remove one to make room."); return; }
    setSaved((items) => [{ id: id(), design: { ...design, name: design.name.trim() || "Untitled design" }, date: new Date().toISOString() }, ...items]);
    setNotice("Design saved to your shelf in this browser.");
  };
  const load = (item: SavedDesign) => { replace(item.design); setMode("product"); setTab("studio"); setNotice(`Opened ${item.design.name}.`); };
  const duplicate = (item: SavedDesign) => {
    if (saved.length >= 100) { setNotice("Your shelf is full."); return; }
    setSaved((items) => [{ ...item, id: id(), design: { ...item.design, name: `${item.design.name.slice(0,53)} copy` }, date: new Date().toISOString() }, ...items]);
  };
  const removeSaved = (designId: string) => setSaved((items) => items.filter((x) => x.id !== designId));
  const downloadLibraryBackup = () => {
    const backup = { format: "batik-lab-library", version: 1, current: design, designs: saved, palettes: customPalettes };
    downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), "batik-lab-library.json");
    setNotice("Your saved designs and custom palettes were backed up.");
  };
  const importLibraryBackup = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setNotice("This backup is larger than 5 MB and was not imported."); return; }
    try {
      const parsed = libraryBackupSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) { setNotice("That file is not a supported Batik Lab library backup."); return; }
      const incoming = parsed.data;
      const designsById = new Map([...incoming.designs, ...saved].map((item) => [item.id, item]));
      const palettesById = new Map([...incoming.palettes, ...customPalettes].map((item) => [item.id, item]));
      const mergedDesigns = [...designsById.values()].slice(0, 100);
      const mergedPalettes = [...palettesById.values()].slice(0, 12);
      setSaved(mergedDesigns);
      setCustomPalettes(mergedPalettes);
      if (incoming.current) {
        replace(incoming.current);
        setMode("product");
        setTab("studio");
      }
      const restoredCurrent = incoming.current ? " Active design restored." : "";
      setNotice(`Backup imported: ${Math.max(0, mergedDesigns.length - saved.length)} designs and ${Math.max(0, mergedPalettes.length - customPalettes.length)} palettes added.${restoredCurrent} Your bag and order history were kept.`);
    } catch {
      setNotice("The backup could not be read. Your current library was kept unchanged.");
    }
  };
  const addLayer = () => {
    if (design.layers.length >= 3) { setNotice("This design has three extra motif layers. Adjust or remove one to make room."); return; }
    const positions = [{ x: 4, y: 4 }, { x: 38, y: 4 }, { x: 4, y: 38 }];
    const position = positions[design.layers.length];
    const layer = motifLayerSchema.parse({ id: id(), motif: ["star", "leaf", "ceplok"][design.layers.length], ...position, scale: 0.3, rotation: 0, opacity: 1, colour: "detail" });
    change({ layers: [...design.layers, layer] });
    setNotice("Motif layer added. Shape, placement and ink can be adjusted independently.");
  };
  const updateLayer = (layerId: string, patch: Partial<MotifLayer>) => change({ layers: design.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer) });
  const moveLayer = (layerId: string, direction: -1 | 1) => {
    const index = design.layers.findIndex((layer) => layer.id === layerId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= design.layers.length) return;
    const layers = [...design.layers];
    [layers[index], layers[nextIndex]] = [layers[nextIndex], layers[index]];
    change({ layers });
  };
  const patternPositionAtPoint = (pointX: number, pointY: number) => {
    const radians = -(design.rotation + (design.repeat === "diamond" ? 45 : 0)) * Math.PI / 180;
    const offsetX = pointX - 300;
    const offsetY = pointY - 300;
    const patternX = Math.cos(radians) * offsetX - Math.sin(radians) * offsetY + 300;
    const patternY = Math.sin(radians) * offsetX + Math.cos(radians) * offsetY + 300;
    const tile = design.scale + design.spacing;
    const periodX = design.repeat === "half-drop" ? tile * 2 : tile;
    const periodY = design.repeat === "brick" ? tile * 2 : tile;
    const positiveX = ((patternX % periodX) + periodX) % periodX;
    const positiveY = ((patternY % periodY) + periodY) % periodY;
    const shiftX = design.repeat === "brick" && positiveY >= tile ? tile / 2 : 0;
    const shiftY = design.repeat === "half-drop" && positiveX >= tile ? tile / 2 : 0;
    const cellX = ((positiveX - shiftX + tile) % tile + tile) % tile;
    const cellY = ((positiveY - shiftY + tile) % tile + tile) % tile;
    const scale = design.scale / 60;
    const x = Math.max(-60, Math.min(120, Math.round((cellX - design.spacing / 2) / scale - 30)));
    const y = Math.max(-60, Math.min(120, Math.round((cellY - design.spacing / 2) / scale - 30)));
    return { x, y };
  };
  const placeLayerAtPatternPoint = (layerId: string, pointX: number, pointY: number) => {
    const position = patternPositionAtPoint(pointX, pointY);
    if (layerId === "secondary") change({ secondaryX: position.x, secondaryY: position.y });
    else updateLayer(layerId, position);
  };
  const removeLayer = (layerId: string) => {
    change({ layers: design.layers.filter((layer) => layer.id !== layerId) });
    setNotice("Motif layer removed.");
  };
  const addToCart = () => {
    if (cart.length >= 100) { setNotice("Your bag is full. Remove an item before adding another."); return; }
    setCart((items) => [...items, { id: id(), design: { ...design, name: design.name.trim() || "Untitled design" }, quantity: 1 }]);
    setNotice(`${productFor(design).name} added to your bag. Keep designing or open Bag to check out.`);
  };
  const quantity = (itemId: string, value: number) => setCart((items) => items.map((x) => x.id === itemId ? { ...x, quantity: Math.min(20, Math.max(1, Math.round(value) || 1)) } : x));
  const removeItem = (itemId: string) => setCart((items) => items.filter((x) => x.id !== itemId));
  const editItem = (item: CartItem) => { replace(item.design); setTab("studio"); setNotice("Opened a copy to customise. The item already in your bag stays unchanged."); };
  const totals = cartTotals(cart);
  const checkout = () => {
    const result = checkoutSchema.safeParse({ name, payment, acknowledged });
    if (!cart.length) { setCheckoutError("Add a design to your bag first."); return; }
    if (!result.success) { setCheckoutError(result.error.issues[0].message); return; }
    if (orders.length >= 100) { setCheckoutError("This browser has reached its 100-order demo limit."); return; }
    const order: StudioOrder = { id: `BL-${id().slice(0,8).toUpperCase()}`, date: new Date().toISOString(), items: cart, name: result.data.name, payment, progress: 0, total: totals.total };
    setOrders((items) => [order,...items]); setCart([]); setName(""); setAcknowledged(false); setCheckoutError(""); setTab("orders"); setNotice(`Mock order ${order.id} placed. No payment was taken.`);
  };
  const advance = (orderId: string) => setOrders((items) => items.map((x) => x.id === orderId ? { ...x, progress: Math.min(ORDER_STAGES.length - 1, x.progress + 1) } : x));
  const reorder = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) { setNotice("That order could not be found in this browser."); return; }
    if (cart.length + order.items.length > 100) { setNotice("Your bag does not have room for this full order. Remove an item and try again."); return; }
    setCart((items) => [...items, ...order.items.map((item) => ({ ...item, id: id(), design: { ...item.design } }))]);
    setTab("bag");
    setNotice(`${order.id} added to your bag. Review the designs and current simulated total before checking out.`);
  };
  const receipt = (order: StudioOrder) => {
    const text = ["BATIK LAB — SIMULATED ORDER / NOT A TAX INVOICE", order.id, order.date, `Demo customer: ${order.name}`, `Simulated payment: ${order.payment}`, ...order.items.map((x) => `${x.quantity} × ${productFor(x.design).name} / ${x.design.name} / ${x.design.size} / ${x.design.material}: ${money(unitPrice(x.design)*x.quantity)}`), `Total at checkout: ${money(order.total)}`, "No payment taken. No physical order or delivery."].join("\n");
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${order.id}-receipt.txt`);
  };
  const download = async (format: "svg" | "png") => {
    setExporting(true);
    try { await exportDesign(design, mode, format); setNotice(`${format.toUpperCase()} downloaded. Product previews are design mockups, not manufacturing templates.`); }
    catch { setNotice("Download could not be created. Try SVG or a different browser."); }
    finally { setExporting(false); }
  };
  const downloadProductRange = async (format: "svg" | "png") => {
    setExporting(true);
    try { await exportProductRange(design, format); setNotice(`Product range ${format.toUpperCase()} downloaded with all ${PRODUCTS.length} canvases.`); }
    catch { setNotice("Product-range export could not be created. Try SVG or a different browser."); }
    finally { setExporting(false); }
  };
  const downloadPatternSheet = async (format: "svg" | "png") => {
    setExporting(true);
    try { await exportPatternSheet(design, format); setNotice(`Pattern sheet ${format.toUpperCase()} downloaded. Studio units are illustrative, not production measurements.`); }
    catch { setNotice("Pattern-sheet export could not be created. Try SVG or a different browser."); }
    finally { setExporting(false); }
  };
  const share = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("design", JSON.stringify({ ...design, name: design.name.trim() || "Untitled design" }));
    setShareCopied(false);
    setShareCopyError(false);
    setShareLink(url.toString());
  };
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
    } catch {
      setShareCopied(false);
      setShareCopyError(true);
    }
  };
  const closeShare = () => { setShareLink(""); setShareCopied(false); setShareCopyError(false); };
  const products = PRODUCTS.filter((p) => (category === "All" || p.category === category) && `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  if (productSort === "price-ascending") products.sort((a, b) => a.price - b.price);
  if (productSort === "price-descending") products.sort((a, b) => b.price - a.price);
  if (productSort === "name") products.sort((a, b) => a.name.localeCompare(b.name));
  return {
    design, product: productFor(design), price: unitPrice(design), motif: MOTIFS.find((x) => x.id === design.motif)!, saved, customPalettes, cart, orders, ready, storageError, notice, tab, setTab, category, setCategory, query, setQuery, productSort, setProductSort, mode, setMode, zoom, setZoom, name, setName, payment, setPayment, acknowledged, setAcknowledged, checkoutError, exporting, totals, shareLink, shareCopied, shareCopyError, share, copyShareLink, closeShare, change, selectProduct, palette, applyStarter, savePalette, applyCustomPalette, removePalette, importCustomMotif, removeCustomMotif, shuffle, undo, redo, canUndo: !!history.past.length, canRedo: !!history.future.length, reset: () => replace(DEFAULT_DESIGN), save, load, duplicate, removeSaved, downloadLibraryBackup, importLibraryBackup, addLayer, updateLayer, moveLayer, patternPositionAtPoint, placeLayerAtPatternPoint, removeLayer, addToCart, quantity, removeItem, editItem, checkout, advance, reorder, receipt, download, downloadProductRange, downloadPatternSheet,
    products,
  };
}
export type BatikStudio = ReturnType<typeof useBatikStudio>;
