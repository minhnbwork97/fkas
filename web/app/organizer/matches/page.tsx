"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MatchStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PIN_KEY = "fkas_admin_pin";
const PAGE_SIZE = 10;

type MatchListItem = {
  id: string;
  dateTime: string;
  type: "Internal" | "VsTeam";
  fieldCost: number | null;
  status: MatchStatus;
  link: string;
};

export default function OrganizerMatchesPage() {
  const router = useRouter();
  const [items, setItems] = useState<MatchListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const pin = localStorage.getItem(PIN_KEY);
    if (!pin) {
      router.replace("/organizer/login");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    fetch(`/api/matches?page=${page}&pageSize=${PAGE_SIZE}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `Lỗi ${r.status}`);
        return d;
      })
      .then((d) => {
        if (cancelled) return;
        setItems(d.matches ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
        // A deleted match can leave us past the last page
        if (d.totalPages && page > d.totalPages) setPage(d.totalPages);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setItems([]);
        setLoadError(
          e instanceof Error ? e.message : "Không tải được danh sách trận đấu"
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router, page]);

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Danh Sách Trận Đấu</h1>
      <div>
        <Button onClick={() => router.push("/organizer/create")}>
          Tạo Trận Đấu
        </Button>
      </div>
      <div className="grid gap-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        {!isLoading && loadError && (
          <p className="text-sm text-red-600">{loadError}</p>
        )}
        {!isLoading && !loadError && items.length === 0 && (
          <p className="text-sm text-gray-600">
            Chưa có trận đấu nào. Bấm Tạo Trận Đấu để bắt đầu.
          </p>
        )}
        {!isLoading && items.map((m) => (
          <Link href={`/organizer/matches/${m.id}`} key={m.id}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {new Date(m.dateTime).toLocaleString("vi-VN")}
                  <Badge
                    className="ml-2"
                    variant={m.type === "Internal" ? "default" : "secondary"}
                  >
                    {m.type === "Internal" ? "Nội Bộ" : "Đấu Đội Khác"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Trạng thái: {m.status === "Settled" && "Đã hoàn thành"}
                  {m.status === "Collecting" && "Đang điểm danh"}
                  {m.status === "Ready" && "Đã sẵn sàng"}
                  {m.status === "NotReady" && "Chưa sẵn sàng"}
                  {m.status === "Draft" && "Nháp"}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Phân trang danh sách trận đấu"
          className="flex items-center justify-between gap-3 pt-2"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft />
            Trước
          </Button>
          <div className="text-center">
            <p className="scoreboard text-lg text-gray-900">
              Trang {page} / {totalPages}
            </p>
            <p className="text-xs text-gray-500">{total} trận đấu</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Sau
            <ChevronRight />
          </Button>
        </nav>
      )}
    </main>
  );
}
