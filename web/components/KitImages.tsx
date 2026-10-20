"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resizeImage } from "@/src/lib/image-resize";
import { kitImageUrl } from "@/src/lib/kit-order";

export type KitImage = { id: string; kind: "Preview" | "SizeChart" };

/**
 * Full-screen viewer. Swipe (or ←/→, or the arrows on desktop) to move
 * between images; tap outside the image, ✕ or Esc to close.
 */
export function ImageLightbox({
  srcs,
  startIndex = 0,
  alt,
  onClose,
}: {
  srcs: string[];
  startIndex?: number;
  alt: string;
  onClose: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(srcs.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  // Open on the tapped image, without animating there
  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
  }, [startIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep the page behind from scrolling
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const many = srcs.length > 1;
  const arrow =
    "absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-0 sm:block";

  // Portal: the viewer can be opened from inside a <form>
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {srcs.map((src, i) => (
          <div
            key={src}
            onClick={(e) => e.target === e.currentTarget && onClose()}
            className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4 pt-14"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={many ? `${alt} ${i + 1}` : alt}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 text-white">
        <span className="text-sm tabular-nums text-white/80">
          {many && `${index + 1} / ${srcs.length}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 hover:bg-white/20"
          aria-label="Đóng"
        >
          <X className="size-5" />
        </button>
      </div>

      {many && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className={`${arrow} left-3`}
            aria-label="Ảnh trước"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === srcs.length - 1}
            className={`${arrow} right-3`}
            aria-label="Ảnh sau"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

/** Row of medium thumbnails for the registration page; tap to view large */
export function KitGallery({
  kitOrderId,
  images,
}: {
  kitOrderId: string;
  images: KitImage[];
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const srcs = images
    .filter((i) => i.kind === "Preview")
    .map((i) => kitImageUrl(kitOrderId, i.id));
  if (srcs.length === 0) return null;

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {srcs.map((src, i) => (
          <button
            key={src}
            onClick={() => setOpenAt(i)}
            className="size-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5"
            aria-label={`Xem ảnh ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Ảnh minh hoạ áo"
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>
      {openAt !== null && (
        <ImageLightbox
          srcs={srcs}
          startIndex={openAt}
          alt="Ảnh minh hoạ áo"
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}

/** Organizer: add/remove preview photos and set the size chart */
export function KitImageManager({
  kitOrderId,
  images,
  adminPin,
  onChange,
}: {
  kitOrderId: string;
  images: KitImage[];
  adminPin: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<"Preview" | "SizeChart" | null>(null);
  const previewInput = useRef<HTMLInputElement>(null);
  const chartInput = useRef<HTMLInputElement>(null);
  const sizeChart = images.find((i) => i.kind === "SizeChart");
  // Local copy so a drag shows its result before the server confirms
  const [previews, setPreviews] = useState(() =>
    images.filter((i) => i.kind === "Preview")
  );
  useEffect(() => {
    setPreviews(images.filter((i) => i.kind === "Preview"));
  }, [images]);

  const sensors = useSensors(
    // Mouse: start after a small move so clicks on ✕ still work
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: press and hold, so swiping still scrolls the page
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorder = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = previews.findIndex((i) => i.id === active.id);
    const to = previews.findIndex((i) => i.id === over.id);
    const next = arrayMove(previews, from, to);
    setPreviews(next);
    const res = await fetch(`/api/kit-orders/${kitOrderId}/images`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPin, ids: next.map((i) => i.id) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Không lưu được thứ tự ảnh");
      onChange();
    }
  };

  const upload = async (kind: "Preview" | "SizeChart", files: FileList | null) => {
    if (!files?.length) return;
    setBusy(kind);
    try {
      for (const file of Array.from(files)) {
        const blob = await resizeImage(file);
        const form = new FormData();
        form.append("adminPin", adminPin);
        form.append("kind", kind);
        form.append("file", new File([blob], "image.jpg", { type: "image/jpeg" }));
        const res = await fetch(`/api/kit-orders/${kitOrderId}/images`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `Lỗi ${res.status}`);
        }
      }
      toast.success("Đã tải ảnh lên");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tải được ảnh");
    } finally {
      setBusy(null);
      onChange();
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Xoá ảnh này?")) return;
    const res = await fetch(
      `${kitImageUrl(kitOrderId, id)}?adminPin=${encodeURIComponent(adminPin)}`,
      { method: "DELETE" }
    );
    if (!res.ok) toast.error("Không xoá được ảnh");
    onChange();
  };


  const addTile = (kind: "Preview" | "SizeChart", label: string) => (
    <button
      onClick={() => (kind === "Preview" ? previewInput : chartInput).current?.click()}
      disabled={busy !== null}
      className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-500 disabled:opacity-50"
    >
      <ImagePlus className="size-5" />
      {busy === kind ? "Đang tải..." : label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Ảnh minh hoạ</p>
          {previews.length > 1 && (
            <p className="text-xs text-gray-400">Kéo thả để sắp xếp</p>
          )}
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={reorder}
        >
          <SortableContext
            items={previews.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {previews.map((img) => (
                <SortableThumb
                  key={img.id}
                  src={kitImageUrl(kitOrderId, img.id)}
                  id={img.id}
                  onRemove={() => remove(img.id)}
                />
              ))}
              {addTile("Preview", "Thêm ảnh")}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Bảng size</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {sizeChart ? (
            <Thumb
              src={kitImageUrl(kitOrderId, sizeChart.id)}
              alt="Bảng size"
              onRemove={() => remove(sizeChart.id)}
            />
          ) : (
            addTile("SizeChart", "Thêm bảng size")
          )}
        </div>
        {sizeChart && (
          <Button
            size="sm"
            variant="ghost"
            className="px-0 text-pitch"
            disabled={busy !== null}
            onClick={() => chartInput.current?.click()}
          >
            {busy === "SizeChart" ? "Đang tải..." : "Đổi ảnh bảng size"}
          </Button>
        )}
      </div>
      <input
        ref={previewInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload("Preview", e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={chartInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          upload("SizeChart", e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Thumb({
  src,
  alt,
  onRemove,
}: {
  src: string;
  alt: string;
  onRemove: () => void;
}) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="aspect-square w-full rounded-lg object-cover bg-gray-100"
      />
      <button
        onClick={onRemove}
        // Keep the press from starting a drag
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
        aria-label="Xoá ảnh"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function SortableThumb({
  id,
  src,
  onRemove,
}: {
  id: string;
  src: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`cursor-grab select-none active:cursor-grabbing ${
        isDragging ? "relative z-10 opacity-80 shadow-lg" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <Thumb src={src} alt="Ảnh minh hoạ áo" onRemove={onRemove} />
    </div>
  );
}
