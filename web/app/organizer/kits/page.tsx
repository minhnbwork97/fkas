"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KIT_ORDER_STATUS_LABEL,
  type KitOrderSummary,
} from "@/src/lib/kit-order";

const PIN_KEY = "fkas_admin_pin";
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

type KitOrderListItem = {
  id: string;
  name: string;
  status: keyof typeof KIT_ORDER_STATUS_LABEL;
  summary: KitOrderSummary;
};

export default function OrganizerKitsPage() {
  const router = useRouter();
  const [items, setItems] = useState<KitOrderListItem[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const pin = localStorage.getItem(PIN_KEY);
    if (!pin) {
      router.replace("/organizer/login");
      return;
    }
    fetch(`/api/kit-orders?adminPin=${encodeURIComponent(pin)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `Lỗi ${r.status}`);
        setItems(d.kitOrders ?? []);
      })
      .catch((e: unknown) =>
        setLoadError(
          e instanceof Error ? e.message : "Không tải được danh sách đợt áo"
        )
      );
  }, [router]);

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Áo Đội</h1>
        <Button size="sm" onClick={() => router.push("/organizer/kits/new")}>
          <Plus /> Tạo đợt
        </Button>
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {!items && !loadError && <Skeleton className="h-40 w-full rounded-xl" />}
      {items && items.length === 0 && (
        <p className="text-sm text-gray-500">Chưa có đợt làm áo nào.</p>
      )}
      {items && items.length > 0 && (
        <ul className="rounded-xl border bg-white divide-y">
          {items.map(({ id, name, status, summary }) => {
            const pct =
              summary.totalDue > 0
                ? (summary.totalPaid / summary.totalDue) * 100
                : 0;
            return (
              <li key={id}>
                <Link
                  href={`/organizer/kits/${id}`}
                  className="block px-4 py-3 space-y-2 hover:bg-gray-50"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-gray-500 shrink-0">
                      {KIT_ORDER_STATUS_LABEL[status]}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-green-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {summary.itemCount} áo · đã thu {vnd(summary.totalPaid)} /{" "}
                    {vnd(summary.totalDue)}
                    {summary.totalRemaining > 0 && (
                      <span className="text-amber-700">
                        {" "}
                        · thiếu {vnd(summary.totalRemaining)}
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
