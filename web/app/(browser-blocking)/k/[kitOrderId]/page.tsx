"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { KitSize } from "@prisma/client";
import { PitchMarkings } from "@/components/PitchMarkings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KitItemForm,
  itemToFormValues,
  toKitItemPayload,
} from "@/components/KitItemForm";
import { formatDeadline, kitImageUrl, sizeText } from "@/src/lib/kit-order";
import { KitGallery, type KitImage } from "@/components/KitImages";
import { getDeviceId } from "@/src/lib/deviceFingerprint";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

type MyItem = {
  id: string;
  size: KitSize | null;
  sizeNote: string | null;
  printName: string | null;
  number: number | null;
  printOnly: boolean;
  amount: number;
  paid: boolean;
  selfReportedAt: string | null;
};

type PublicData = {
  order: {
    id: string;
    name: string;
    description: string | null;
    defaultPrice: number;
    printOnlyPrice: number | null;
    deadline: string | null;
    status: "Collecting" | "Ordered" | "Delivered";
    registrationOpen: boolean;
  };
  images: KitImage[];
  registrations: Registration[];
  player: { id: string; name: string } | null;
  myItem: MyItem | null;
  qrCodeUrl: string | null;
};

type Registration = {
  id: string;
  name: string;
  size: KitSize | null;
  sizeNote: string | null;
  printName: string | null;
  number: number | null;
  mine: boolean;
};

type Identity = { deviceId?: string; phone?: string };

export default function KitRegistrationPage() {
  const { kitOrderId } = useParams<{ kitOrderId: string }>();
  const [data, setData] = useState<PublicData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [identity, setIdentity] = useState<Identity>({});
  const [phone, setPhone] = useState("");
  const [checkedPhone, setCheckedPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const load = useCallback(
    async (id: Identity) => {
      const qs = new URLSearchParams(id as Record<string, string>);
      const res = await fetch(`/api/kit-orders/${kitOrderId}/public?${qs}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `Lỗi ${res.status}`);
      setData(d);
      return d as PublicData;
    },
    [kitOrderId]
  );

  // Recognise the player from this device first
  useEffect(() => {
    const deviceId = getDeviceId();
    const id = deviceId ? { deviceId } : {};
    load(id)
      .then((d) => d.player && setIdentity(id))
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Lỗi tải dữ liệu")
      );
  }, [load]);

  // Fall back to phone lookup, debounced
  useEffect(() => {
    if (identity.deviceId || identity.phone) return;
    const trimmed = phone.trim();
    if (trimmed.length < 8) return;
    const t = setTimeout(async () => {
      try {
        const d = await load({ phone: trimmed });
        if (d.player) setIdentity({ phone: trimmed });
      } catch {
      } finally {
        setCheckedPhone(trimmed);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [phone, identity, load]);

  const call = async (
    method: string,
    path: string,
    body: object | null,
    success: string
  ) => {
    const qs =
      body === null
        ? `?${new URLSearchParams(identity as Record<string, string>)}`
        : "";
    try {
      const res = await fetch(`/api/kit-orders/${kitOrderId}/${path}${qs}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === null ? undefined : JSON.stringify({ ...identity, ...body }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Lỗi ${res.status}`);
      toast.success(success);
      await load(identity);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      return false;
    }
  };

  if (loadError) {
    return (
      <main className="max-w-md mx-auto p-6">
        <p className="text-sm text-red-600">{loadError}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="max-w-md mx-auto p-4 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </main>
    );
  }

  const { order, player, myItem } = data;
  const canEdit = order.registrationOpen && myItem !== null && !myItem.paid;
  const sizeChart = data.images.find((i) => i.kind === "SizeChart");

  const form = (
    <KitItemForm
      initial={myItem ? itemToFormValues(myItem) : undefined}
      defaultPrice={order.defaultPrice}
      printOnlyPrice={order.printOnlyPrice}
      sizeChartUrl={sizeChart ? kitImageUrl(order.id, sizeChart.id) : null}
      takenNumbers={data.registrations.filter((r) => !r.mine)}
      submitLabel={myItem ? "Lưu" : "Đăng ký"}
      onCancel={myItem ? () => setIsEditing(false) : undefined}
      onSubmit={async (v) => {
        const ok = await call(
          "PUT",
          "my-item",
          toKitItemPayload(v),
          myItem ? "Đã lưu" : "Đã đăng ký áo"
        );
        if (ok) setIsEditing(false);
        return false;
      }}
    />
  );

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <header className="pitch-surface relative overflow-hidden rounded-2xl px-5 py-5 border-b-4 border-floodlight">
        <PitchMarkings className="text-white/20" />
        <p className="relative kit-label text-floodlight">Áo đội</p>
        <h1 className="relative text-2xl uppercase !text-white">{order.name}</h1>
        {order.deadline && (
          <p className="relative mt-1 text-sm text-white/80">
            Hạn đăng ký {formatDeadline(order.deadline)}
          </p>
        )}
      </header>

      <KitGallery kitOrderId={order.id} images={data.images} />

      <section className="rounded-2xl border bg-white p-5 space-y-5">
        {order.description && (
          <p className="text-sm whitespace-pre-line text-gray-600">
            {order.description}
          </p>
        )}

        {!player ? (
          <div className="space-y-1.5">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại của bạn"
            />
            {checkedPhone && checkedPhone === phone.trim() && (
              <p className="text-xs text-gray-500">
                Không tìm thấy số này trong đội. Liên hệ BTC để được thêm.
              </p>
            )}
          </div>
        ) : !myItem || isEditing ? (
          order.registrationOpen ? (
            <>
              <p className="text-sm text-gray-600">
                Chào <span className="font-semibold text-gray-900">{player.name}</span>
              </p>
              {form}
            </>
          ) : (
            <p className="text-sm text-gray-600">
              {order.status === "Collecting"
                ? "Đã hết hạn đăng ký."
                : "Đợt này đã đóng đăng ký."}
            </p>
          )
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{player.name}</p>
                <p className="scoreboard text-3xl text-gray-900">
                  {sizeText(myItem)}
                  {myItem.number !== null && ` · ${myItem.number}`}
                </p>
                <p className="text-sm text-gray-700">
                  {myItem.printName || "Không in tên"}
                </p>
              </div>
              <StatusPill item={myItem} />
            </div>
            {canEdit && (
              <div className="flex gap-4 text-sm">
                <button
                  className="font-medium text-pitch underline-offset-4 hover:underline"
                  onClick={() => setIsEditing(true)}
                >
                  Sửa
                </button>
                <button
                  className="text-gray-500 underline-offset-4 hover:underline"
                  onClick={() => {
                    if (window.confirm("Huỷ đăng ký áo?")) {
                      call("DELETE", "my-item", null, "Đã huỷ đăng ký");
                    }
                  }}
                >
                  Huỷ đăng ký
                </button>
              </div>
            )}

            {!myItem.paid && (
              <div className="border-t pt-5 space-y-3 text-center">
                <p className="text-sm text-gray-500">Số tiền cần đóng</p>
                <p className="scoreboard text-4xl text-gray-900">
                  {vnd(myItem.amount)}
                </p>
                {data.qrCodeUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.qrCodeUrl}
                    alt="QR chuyển khoản tiền áo"
                    className="mx-auto w-60 h-60"
                  />
                )}
                {myItem.selfReportedAt ? (
                  <p className="text-sm text-gray-600">
                    Bạn đã báo chuyển khoản, BTC sẽ xác nhận khi nhận được
                    tiền.
                  </p>
                ) : (
                  <Button
                    className="w-full h-11"
                    disabled={isReporting}
                    onClick={async () => {
                      setIsReporting(true);
                      await call("POST", "self-report", {}, "Đã báo BTC");
                      setIsReporting(false);
                    }}
                  >
                    Tôi đã chuyển khoản
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border bg-white">
        <h2 className="flex items-baseline justify-between px-5 pt-4 pb-2 text-base font-semibold">
          Đã đăng ký
          <span className="text-sm font-normal text-gray-500">
            {data.registrations.length} người
          </span>
        </h2>
        {data.registrations.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-gray-500">Chưa có ai đăng ký.</p>
        ) : (
          <ul className="divide-y">
            {data.registrations.map((r) => (
              <li
                key={r.id}
                className={`flex items-center gap-3 px-5 py-2.5 ${
                  r.mine ? "bg-floodlight/15" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.name}
                    {r.mine && (
                      <span className="ml-1 font-normal text-gray-500">(bạn)</span>
                    )}
                  </p>
                  {r.printName && (
                    <p className="truncate text-xs text-gray-500">{r.printName}</p>
                  )}
                </div>
                <span className="shrink-0 text-sm text-gray-700">{sizeText(r)}</span>
                <span className="scoreboard w-8 shrink-0 text-right text-lg text-gray-900">
                  {r.number ?? "–"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusPill({ item }: { item: MyItem }) {
  const [label, cls] = item.paid
    ? ["Đã đóng", "bg-green-50 text-green-700"]
    : item.selfReportedAt
    ? ["Chờ xác nhận", "bg-blue-50 text-blue-700"]
    : ["Chưa đóng", "bg-amber-50 text-amber-700"];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
