import { useEffect, useState } from "react";
import { z } from "zod";
import { DEFAULT_DESIGN, MOTIFS, PALETTES, PRODUCTS, PAYMENTS, ORDER_STAGES, cartItemSchema, cartTotals, designSchema, orderSchema, productFor, savedSchema, unitPrice, money, type Design, type CartItem, type SavedDesign, type StudioOrder, type Category } from "./catalog";
import { downloadBlob, exportDesign, type PreviewMode } from "./design";
const KEY = "batik-lab-studio-v1";
const cacheSchema = z.object({ version: z.literal(1), design: designSchema, saved: z.array(savedSchema).max(100), cart: z.array(cartItemSchema).max(100), orders: z.array(orderSchema).max(100) });
const id = () => crypto.randomUUID();
const checkoutSchema = z.object({ name: z.string().trim().min(2, "Enter a demo name of at least 2 characters.").max(60), payment: z.enum(PAYMENTS), acknowledged: z.literal(true, { errorMap: () => ({ message: "Confirm that this is a simulated order." }) }) });
export type StudioTab = "studio" | "collection" | "saved" | "bag" | "orders";
export function useBatikStudio() {
  const [history, setHistory] = useState<{ past: Design[]; current: Design; future: Design[] }>({ past: [], current: DEFAULT_DESIGN, future: [] });
  const [saved, setSaved] = useState<SavedDesign[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<StudioOrder[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<StudioTab>("studio");
  const [category, setCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<PreviewMode>("product");
  const [zoom, setZoom] = useState(1);
  const [name, setName] = useState("");
  const [payment, setPayment] = useState<typeof PAYMENTS[number]>(PAYMENTS[0]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [exporting, setExporting] = useState(false);
  const design = history.current;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const value = cacheSchema.parse(JSON.parse(raw));
        setHistory({ past: [], current: value.design, future: [] }); setSaved(value.saved); setCart(value.cart); setOrders(value.orders);
      }
    } catch { setStorageError("Browser saves could not be loaded. Your existing storage has been preserved; new changes stay in this session."); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, design, saved, cart, orders })); }
    catch { setStorageError("Browser storage is unavailable or full. Your work stays in this session. Download your designs to keep a copy."); }
  }, [ready, design, saved, cart, orders, storageError]);
  const replace = (next: Design) => setHistory((h) => ({ past: [...h.past, h.current].slice(-60), current: next, future: [] }));
  const change = (patch: Partial<Design>) => setHistory((h) => {
    const next = designSchema.safeParse({ ...h.current, ...patch });
    return next.success ? { past: [...h.past, h.current].slice(-60), current: next.data, future: [] } : h;
  });
  const selectProduct = (productId: string) => {
    const p = PRODUCTS.find((x) => x.id === productId);
    if (!p) return;
    change({ product: p.id, size: p.sizes.includes(design.size) ? design.size : p.sizes[0], material: p.materials.includes(design.material) ? design.material : p.materials[0] });
    setTab("studio");
  };
  const palette = (index: number) => {
    const p = PALETTES[index]; if (!p) return;
    change({ ink: p.colours[0], accent: p.colours[1], background: p.colours[2], detail: p.colours[3] });
  };
  const shuffle = () => {
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
  return { design, product: productFor(design), price: unitPrice(design), motif: MOTIFS.find((x) => x.id === design.motif)!, saved, cart, orders, ready, storageError, notice, tab, setTab, category, setCategory, query, setQuery, mode, setMode, zoom, setZoom, name, setName, payment, setPayment, acknowledged, setAcknowledged, checkoutError, exporting, totals, change, selectProduct, palette, shuffle, undo, redo, canUndo: !!history.past.length, canRedo: !!history.future.length, reset: () => replace(DEFAULT_DESIGN), save, load, duplicate, removeSaved, addToCart, quantity, removeItem, editItem, checkout, advance, receipt, download, products: PRODUCTS.filter((p) => (category === "All" || p.category === category) && `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase())) };
}
export type BatikStudio = ReturnType<typeof useBatikStudio>;
