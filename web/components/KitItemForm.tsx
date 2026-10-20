"use client";
import { useState } from "react";
import type { KitSize } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KIT_SIZES, KIT_SIZE_LABEL } from "@/src/lib/kit-order";
import { ImageLightbox } from "@/components/KitImages";

export type KitItemFormValues = {
  size: KitSize | null;
  sizeNote: string;
  printName: string;
  number: string;
  printOnly: boolean;
};

export const emptyKitItem: KitItemFormValues = {
  size: null,
  sizeNote: "",
  printName: "",
  number: "",
  printOnly: false,
};

export function toKitItemPayload(v: KitItemFormValues) {
  return {
    size: v.printOnly ? null : v.size,
    sizeNote: v.size === "Other" ? v.sizeNote : null,
    printName: v.printName,
    number: v.number === "" ? null : Number(v.number),
    printOnly: v.printOnly,
  };
}

export function itemToFormValues(item: {
  size: KitSize | null;
  sizeNote: string | null;
  printName: string | null;
  number: number | null;
  printOnly: boolean;
}): KitItemFormValues {
  return {
    size: item.size,
    sizeNote: item.sizeNote ?? "",
    printName: item.printName ?? "",
    number: item.number === null ? "" : String(item.number),
    printOnly: item.printOnly,
  };
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

/** Row of toggle buttons, used for the shirt type and the size */
export function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 min-w-11 rounded-md border px-3 text-sm font-medium transition-colors",
            value === o.value
              ? "border-pitch bg-pitch text-white"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function KitItemForm({
  initial = emptyKitItem,
  defaultPrice,
  printOnlyPrice,
  sizeChartUrl = null,
  takenNumbers = [],
  submitLabel,
  onSubmit,
  onCancel,
  children,
  footer,
}: {
  initial?: KitItemFormValues;
  defaultPrice: number;
  /** null hides the print-only option */
  printOnlyPrice: number | null;
  /** Shows a "how to pick a size" link when set */
  sizeChartUrl?: string | null;
  /** Numbers already used by others, for a duplicate warning */
  takenNumbers?: { number: number | null; printName: string | null }[];
  submitLabel: string;
  /** Return true to reset the form */
  onSubmit: (values: KitItemFormValues) => Promise<boolean>;
  onCancel?: () => void;
  /** Extra fields rendered above the shirt fields */
  children?: React.ReactNode;
  /** Extra controls next to the submit button */
  footer?: React.ReactNode;
}) {
  const [v, setV] = useState<KitItemFormValues>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const set = <K extends keyof KitItemFormValues>(
    key: K,
    value: KitItemFormValues[K]
  ) => setV((prev) => ({ ...prev, [key]: value }));

  const clash =
    v.number !== ""
      ? takenNumbers.find((t) => t.number === Number(v.number))
      : undefined;
  const needsSize = !v.printOnly && !v.size;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (await onSubmit(v)) setV(initial);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {children}

      {printOnlyPrice !== null && (
        <Choice
          options={[
            { value: "buy", label: `Mua áo · ${vnd(defaultPrice)}` },
            { value: "print", label: `Chỉ in · ${vnd(printOnlyPrice)}` },
          ]}
          value={v.printOnly ? "print" : "buy"}
          onChange={(t) => set("printOnly", t === "print")}
        />
      )}

      {!v.printOnly && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Size</Label>
            {sizeChartUrl && (
              <button
                type="button"
                className="text-xs font-medium text-pitch hover:underline"
                onClick={() => setShowSizeChart(true)}
              >
                Hướng dẫn chọn size
              </button>
            )}
          </div>
          <Choice
            options={KIT_SIZES.map((s) => ({
              value: s,
              label: KIT_SIZE_LABEL[s],
            }))}
            value={v.size}
            onChange={(s) => set("size", s)}
          />
          {v.size === "Other" && (
            <Input
              value={v.sizeNote}
              onChange={(e) => set("sizeNote", e.target.value)}
              placeholder="Ghi rõ size, VD 3XL"
              required
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div className="space-y-1.5">
          <Label>Tên in</Label>
          <Input
            value={v.printName}
            onChange={(e) => set("printName", e.target.value)}
            maxLength={30}
            placeholder="Không bắt buộc"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Số áo</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={v.number}
            onChange={(e) => set("number", e.target.value)}
          />
        </div>
      </div>
      {clash && (
        <p className="-mt-2 text-xs text-amber-700">
          Số {clash.number} đã có người lấy
          {clash.printName ? ` (${clash.printName})` : ""}, bạn vẫn có thể
          chọn số này.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSaving || needsSize}>
          {isSaving ? "Đang lưu..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Huỷ
          </Button>
        )}
        {footer}
      </div>
      {showSizeChart && sizeChartUrl && (
        <ImageLightbox
          srcs={[sizeChartUrl]}
          alt="Bảng size"
          onClose={() => setShowSizeChart(false)}
        />
      )}
    </form>
  );
}
