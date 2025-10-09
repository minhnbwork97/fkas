"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MatchStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const PIN_KEY = "fkas_admin_pin";

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

  useEffect(() => {
    const pin = localStorage.getItem(PIN_KEY);
    if (!pin) {
      router.replace("/organizer/login");
      return;
    }
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setItems(d.matches ?? []))
      .catch(() => setItems([]));
  }, [router]);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Danh Sách Trận Đấu</h1>
      <div>
        <Button onClick={() => router.push("/organizer/create")}>
          Tạo Trận Đấu
        </Button>
      </div>
      <div className="grid gap-3">
        {items.map((m) => (
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
    </main>
  );
}
