"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Download, Plus } from "lucide-react";
import type { KitOrderStatus, KitSize } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Choice,
  KitItemForm,
  itemToFormValues,
  toKitItemPayload,
} from "@/components/KitItemForm";
import { KitImageManager, type KitImage } from "@/components/KitImages";
import {
  KIT_ORDER_STATUS_LABEL,
  KIT_SIZES,
  kitImageUrl,
  sizeText,
  type KitOrderSummary,
} from "@/src/lib/kit-order";

const PIN_KEY = "fkas_admin_pin";
const pin = () => localStorage.getItem(PIN_KEY) || "";
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

type KitItem = {
  id: string;
  playerId: string | null;
  displayName: string;
  size: KitSize | null;
  sizeNote: string | null;
  printName: string | null;
  number: number | null;
  printOnly: boolean;
  amount: number;
  priceOverridden: boolean;
  paid: boolean;
  selfReportedAt: string | null;
};

type KitOrderDetail = {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: number;
  printOnlyPrice: number | null;
  deadline: string | null;
  status: KitOrderStatus;
  summary: KitOrderSummary;
  items: KitItem[];
  images: KitImage[];
};

type Filter = "all" | "unpaid" | "paid";

async function send(url: string, method: string, body?: object) {
  const withPin =
    method === "DELETE"
      ? `${url}?adminPin=${encodeURIComponent(pin())}`
      : url;
  const res = await fetch(withPin, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify({ adminPin: pin(), ...body }) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

export default function KitOrderDetailPage() {
  const router = useRouter();
  const { kitOrderId } = useParams<{ kitOrderId: string }>();
  const [order, setOrder] = useState<KitOrderDetail | null>(null);
  const [players, setPlayers] = useState<
    { id: string; name: string; phone: string | null }[]
  >([]);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const orderUrl = `/api/kit-orders/${kitOrderId}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${orderUrl}?adminPin=${encodeURIComponent(pin())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
      setOrder(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    }
  }, [orderUrl]);

  useEffect(() => {
    if (!localStorage.getItem(PIN_KEY)) {
      router.replace("/organizer/login");
      return;
    }
    load();
    fetch(`/api/players?adminPin=${encodeURIComponent(pin())}`)
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => {});
  }, [load, router]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      await load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      return false;
    }
  };

  const visibleItems = useMemo(() => {
    const items = order?.items ?? [];
    if (filter === "unpaid") return items.filter((i) => !i.paid);
    if (filter === "paid") return items.filter((i) => i.paid);
    return items;
  }, [order, filter]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };

  if (loadError) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <p className="text-sm text-red-600">{loadError}</p>
      </main>
    );
  }
  if (!order) {
    return (
      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  const { summary } = order;
  const itemUrl = (id: string) => `${orderUrl}/items/${id}`;
  const registerLink = `${location.origin}/k/${order.id}`;

  const exportCsv = () => {
    // Sorted by size then number, the order a supplier works through
    const rank = (i: KitItem) => (i.size ? KIT_SIZES.indexOf(i.size) : 99);
    const rows = [...order.items]
      .sort((a, b) => rank(a) - rank(b) || (a.number ?? 999) - (b.number ?? 999))
      .map((i, idx) => [
        idx + 1,
        i.displayName,
        sizeText(i),
        i.printName ?? "",
        i.number ?? "",
        i.amount,
        i.paid ? "Đã thu" : i.selfReportedAt ? "Báo đã CK" : "Chưa thu",
      ]);
    downloadCsv(`${order.name}.csv`, [
      ["STT", "Người đặt", "Size", "Tên in", "Số áo", "Số tiền", "Trạng thái"],
      ...rows,
    ]);
  };

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Title */}
      <div className="space-y-1">
        <Link
          href="/organizer/kits"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="size-4" /> Áo đội
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{order.name}</h1>
          <Select
            value={order.status}
            onValueChange={(status) =>
              run(() => send(orderUrl, "PATCH", { status }), "Đã cập nhật")
            }
          >
            <SelectTrigger className="w-auto shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KIT_ORDER_STATUS_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!isEditingInfo && (
          <p className="text-sm text-gray-500">
            {vnd(order.defaultPrice)}/áo
            {order.printOnlyPrice !== null &&
              ` · chỉ in ${vnd(order.printOnlyPrice)}`}
            {order.deadline &&
              ` · hạn ${new Date(order.deadline).toLocaleDateString("vi-VN")}`}
            {" · "}
            <button
              className="font-medium text-pitch hover:underline"
              onClick={() => setIsEditingInfo(true)}
            >
              Sửa
            </button>
          </p>
        )}
      </div>

      {isEditingInfo && (
        <section className="rounded-xl border bg-white p-4">
          <OrderInfoForm
            order={order}
            onCancel={() => setIsEditingInfo(false)}
            onSave={async (patch) => {
              if (await run(() => send(orderUrl, "PATCH", patch), "Đã lưu")) {
                setIsEditingInfo(false);
              }
            }}
            onDelete={() => {
              if (!window.confirm(`Xoá đợt "${order.name}"?`)) return;
              run(async () => {
                await send(orderUrl, "DELETE");
                router.push("/organizer/kits");
              }, "Đã xoá đợt");
            }}
          />
        </section>
      )}

      {/* Money */}
      <section className="rounded-xl border bg-white">
        <div className="grid grid-cols-3 divide-x">
          <Money label="Phải thu" value={summary.totalDue} />
          <Money label="Đã thu" value={summary.totalPaid} className="text-green-700" />
          <Money
            label="Còn thiếu"
            value={summary.totalRemaining}
            className={summary.totalRemaining > 0 ? "text-amber-700" : ""}
          />
        </div>
        <div className="border-t px-4 py-3 text-sm text-gray-600 space-y-1">
          <p>{summary.itemCount > 0 ? sizeLine(summary) : "Chưa có ai đăng ký"}</p>
          {summary.duplicateNumbers.length > 0 && (
            <p className="text-amber-700">
              Trùng số: {summary.duplicateNumbers.join(", ")}
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copy(registerLink, "link đăng ký")}>
          Copy link đăng ký
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={summary.itemCount === 0}
          onClick={exportCsv}
        >
          <Download /> Xuất CSV
        </Button>
      </div>

      {/* List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Choice<Filter>
            options={[
              { value: "all", label: `Tất cả ${summary.itemCount}` },
              { value: "unpaid", label: `Chưa thu ${summary.unpaidCount}` },
              { value: "paid", label: `Đã thu ${summary.paidCount}` },
            ]}
            value={filter}
            onChange={setFilter}
          />
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus /> Thêm
            </Button>
          )}
        </div>

        {isAdding && (
          <AddItemForm
            order={order}
            players={players.filter(
              (p) => !order.items.some((i) => i.playerId === p.id)
            )}
            onCancel={() => setIsAdding(false)}
            onSubmit={async (payload) => {
              const ok = await run(
                () => send(`${orderUrl}/items`, "POST", payload),
                "Đã thêm áo"
              );
              if (ok) setIsAdding(false);
              return ok;
            }}
          />
        )}

        <ul className="rounded-xl border bg-white divide-y">
          {visibleItems.length === 0 && (
            <li className="p-4 text-sm text-gray-500">Không có áo nào.</li>
          )}
          {visibleItems.map((item) =>
            openId === item.id ? (
              <li key={item.id} className="p-4">
                <EditItemForm
                  item={item}
                  order={order}
                  onCancel={() => setOpenId(null)}
                  onSubmit={async (payload) => {
                    const ok = await run(
                      () => send(itemUrl(item.id), "PATCH", payload),
                      "Đã lưu"
                    );
                    if (ok) setOpenId(null);
                    return ok;
                  }}
                  onDelete={() => {
                    if (!window.confirm(`Xoá áo của ${item.displayName}?`)) return;
                    run(() => send(itemUrl(item.id), "DELETE"), "Đã xoá");
                  }}
                />
              </li>
            ) : (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setOpenId(item.id)}
                >
                  <p className="truncate font-medium">
                    {item.displayName}
                    {!item.playerId && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        ngoài đội
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {sizeText(item)} · {item.printName || "không tên"} ·{" "}
                    <span
                      className={
                        item.number !== null &&
                        summary.duplicateNumbers.includes(item.number)
                          ? "text-amber-700"
                          : ""
                      }
                    >
                      #{item.number ?? "-"}
                    </span>
                  </p>
                </button>
                <span className="text-sm tabular-nums text-gray-700">
                  {vnd(item.amount)}
                </span>
                <PaidToggle
                  item={item}
                  onToggle={() => {
                    if (
                      item.paid &&
                      !window.confirm(`Bỏ đánh dấu đã thu của ${item.displayName}?`)
                    )
                      return;
                    run(
                      () => send(itemUrl(item.id), "PATCH", { paid: !item.paid }),
                      item.paid ? "Đã bỏ đánh dấu" : `Đã thu ${vnd(item.amount)}`
                    );
                  }}
                />
              </li>
            )
          )}
        </ul>
        <p className="text-xs text-gray-400">
          Bấm vào tên để sửa. Bấm trạng thái để đánh dấu đã thu.
        </p>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <KitImageManager
          kitOrderId={order.id}
          images={order.images}
          adminPin={pin()}
          onChange={load}
        />
      </section>
    </main>
  );
}

/** CSV with a BOM so Excel reads the Vietnamese text as UTF-8 */
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sizeChartUrlOf(order: KitOrderDetail): string | null {
  const chart = order.images.find((i) => i.kind === "SizeChart");
  return chart ? kitImageUrl(order.id, chart.id) : null;
}

function sizeLine(s: KitOrderSummary): string {
  const parts = KIT_SIZES.filter((k) => k !== "Other" && s.sizeCounts[k] > 0).map(
    (k) => `${k} ${s.sizeCounts[k]}`
  );
  for (const [note, n] of Object.entries(s.otherSizeCounts)) parts.push(`${note} ${n}`);
  if (s.printOnlyCount > 0) parts.push(`Chỉ in ${s.printOnlyCount}`);
  return `${s.itemCount} áo: ${parts.join(" · ")}`;
}

function Money({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`scoreboard text-lg sm:text-2xl ${className}`}>{vnd(value)}</p>
    </div>
  );
}

function PaidToggle({ item, onToggle }: { item: KitItem; onToggle: () => void }) {
  const [label, cls] = item.paid
    ? ["Đã thu", "bg-green-600 text-white border-green-600"]
    : item.selfReportedAt
    ? ["Báo đã CK", "bg-blue-50 text-blue-700 border-blue-200"]
    : ["Chưa thu", "bg-white text-amber-700 border-amber-300"];
  return (
    <button
      onClick={onToggle}
      title={item.paid ? "Bỏ đánh dấu đã thu" : "Đánh dấu đã thu"}
      className={`w-24 shrink-0 rounded-full border py-1 text-xs font-semibold ${cls}`}
    >
      {label}
    </button>
  );
}

type ItemPayload = ReturnType<typeof toKitItemPayload> & {
  amount: number | null;
  playerId?: string | null;
  guestName?: string;
};

function PriceField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Giá riêng</Label>
      <CurrencyInput
        value={value}
        onValueChange={onChange}
        placeholder="Để trống = giá của đợt"
      />
    </div>
  );
}

function AddItemForm({
  order,
  players,
  onSubmit,
  onCancel,
}: {
  order: KitOrderDetail;
  players: { id: string; name: string; phone: string | null }[];
  onSubmit: (payload: ItemPayload) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [playerId, setPlayerId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div className="rounded-xl border bg-white p-4">
      <KitItemForm
        defaultPrice={order.defaultPrice}
        printOnlyPrice={order.printOnlyPrice}
        sizeChartUrl={sizeChartUrlOf(order)}
        takenNumbers={order.items}
        submitLabel="Thêm"
        onCancel={onCancel}
        onSubmit={(v) =>
          onSubmit({
            ...toKitItemPayload(v),
            playerId: playerId || null,
            guestName,
            amount: amount ? parseInt(amount, 10) : null,
          })
        }
      >
        <div className="space-y-1.5">
          <Label>Người đặt</Label>
          <Autocomplete
            options={players.map((p) => ({
              value: p.id,
              label: p.name,
              secondary: p.phone ?? undefined,
            }))}
            value={playerId}
            onValueChange={setPlayerId}
            placeholder="Tìm cầu thủ..."
          />
          {!playerId && (
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Hoặc nhập tên người ngoài đội"
            />
          )}
        </div>
        <PriceField value={amount} onChange={setAmount} />
      </KitItemForm>
    </div>
  );
}

function EditItemForm({
  item,
  order,
  onSubmit,
  onCancel,
  onDelete,
}: {
  item: KitItem;
  order: KitOrderDetail;
  onSubmit: (payload: ItemPayload) => Promise<boolean>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [amount, setAmount] = useState(
    item.priceOverridden ? String(item.amount) : ""
  );
  return (
    <KitItemForm
      initial={itemToFormValues(item)}
      defaultPrice={order.defaultPrice}
      printOnlyPrice={order.printOnlyPrice}
      sizeChartUrl={sizeChartUrlOf(order)}
      takenNumbers={order.items.filter((i) => i.id !== item.id)}
      submitLabel="Lưu"
      onCancel={onCancel}
      // Empty price = back to the order price
      onSubmit={(v) =>
        onSubmit({
          ...toKitItemPayload(v),
          amount: amount ? parseInt(amount, 10) : null,
        })
      }
      footer={
        !item.paid && (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-red-600"
            onClick={onDelete}
          >
            Xoá
          </Button>
        )
      }
    >
      <p className="font-semibold">{item.displayName}</p>
      <PriceField value={amount} onChange={setAmount} />
    </KitItemForm>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function OrderInfoForm({
  order,
  onSave,
  onCancel,
  onDelete,
}: {
  order: KitOrderDetail;
  onSave: (patch: object) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(order.name);
  const [description, setDescription] = useState(order.description ?? "");
  const [defaultPrice, setDefaultPrice] = useState(String(order.defaultPrice));
  const [printOnlyPrice, setPrintOnlyPrice] = useState(
    order.printOnlyPrice === null ? "" : String(order.printOnlyPrice)
  );
  const [deadline, setDeadline] = useState(toLocalInput(order.deadline));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name,
          description,
          defaultPrice: parseInt(defaultPrice, 10),
          printOnlyPrice: printOnlyPrice ? parseInt(printOnlyPrice, 10) : null,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Tên đợt</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Giá áo</Label>
          <CurrencyInput value={defaultPrice} onValueChange={setDefaultPrice} />
        </div>
        <div className="space-y-1.5">
          <Label>Giá chỉ in</Label>
          <CurrencyInput
            value={printOnlyPrice}
            onValueChange={setPrintOnlyPrice}
            placeholder="Không nhận"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Hạn đăng ký</Label>
        <Input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Mô tả</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mẫu áo, màu, nhà may..."
        />
      </div>
      <p className="text-xs text-gray-500">
        Đổi giá chỉ áp dụng cho áo chưa thu tiền và không có giá riêng.
      </p>
      <div className="flex items-center gap-2">
        <Button type="submit">Lưu</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Huỷ
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="ml-auto text-red-600"
          onClick={onDelete}
        >
          Xoá đợt
        </Button>
      </div>
    </form>
  );
}
