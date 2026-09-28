// ============= Full-screen image preview (lightbox), Google Drive style =============
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxItem = { src: string; alt: string; title?: string };

/** Full-screen preview overlay. Escape or backdrop click closes; arrow keys move between images. */
export function Lightbox({ items, index, onClose, onNavigate }: { items: LightboxItem[]; index: number; onClose: () => void; onNavigate?: (i: number) => void }) {
  const item = items[index];
  const many = items.length > 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (many && onNavigate) {
        if (e.key === "ArrowLeft") onNavigate((index - 1 + items.length) % items.length);
        if (e.key === "ArrowRight") onNavigate((index + 1) % items.length);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, items.length, many, onClose, onNavigate]);

  if (!item) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.alt || "Image preview"}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="min-w-0">
          {item.title && <p className="truncate text-sm font-semibold">{item.title}</p>}
          {many && <p className="text-[11px] text-white/60">{index + 1} of {items.length} · use ← → keys</p>}
        </div>
        <button aria-label="Close preview" onClick={onClose} className="rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {many && (
          <button aria-label="Previous image" onClick={() => onNavigate?.((index - 1 + items.length) % items.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
            <ChevronLeft className="size-6" />
          </button>
        )}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={item.src} alt={item.alt} onClick={onClose} className="max-h-full max-w-full cursor-zoom-out rounded-lg object-contain shadow-2xl" />
        {many && (
          <button aria-label="Next image" onClick={() => onNavigate?.((index + 1) % items.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
