"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/src/hooks/useAuth";
import { CheckCircle2, ExternalLink } from "lucide-react";

type ReceivablesSummary = {
  totalUnpaid: number;
  settlementCount: number;
  uniquePlayersCount: number;
  uniqueMatchesCount: number;
};

type UnpaidSettlement = {
  id: string;
  amount: number;
  paid: boolean;
  createdAt: string;
  player: {
    id: string;
    name: string;
    phone: string | null;
    balance: number;
  } | null;
  match: {
    id: string;
    dateTime: string;
    type: "Internal" | "VsTeam";
    fieldCost: number;
  };
};

type Player = {
  id: string;
  name: string;
  phone?: string | null;
};

type Match = {
  id: string;
  dateTime: string;
  type: "Internal" | "VsTeam";
};

export default function ReceivablesPage() {
  const router = useRouter();
  const { getPin } = useAuth();
  const [settlements, setSettlements] = useState<UnpaidSettlement[]>([]);
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null);
  const [msg, setMsg] = useState("");

  // Filter controls
  const [filterPlayerId, setFilterPlayerId] = useState<string>("all");
  const [filterMatchId, setFilterMatchId] = useState<string>("all");

  // Lists for filters
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const loadReceivables = useCallback(async () => {
    const pin = getPin();
    if (!pin) return;

    try {
      // Build query parameters with filters
      const params = new URLSearchParams({ adminPin: pin });
      if (filterPlayerId && filterPlayerId !== "all")
        params.append("playerId", filterPlayerId);
      if (filterMatchId && filterMatchId !== "all")
        params.append("matchId", filterMatchId);

      const res = await fetch(`/api/receivables?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSettlements(data.settlements || []);
        setSummary(data.summary || null);
      } else {
        const errData = await res.json();
        setMsg(errData.error || "Lỗi khi tải dữ liệu");
      }
    } catch (error) {
      console.error("Error loading receivables:", error);
      setMsg("Lỗi khi tải dữ liệu");
    }
  }, [getPin, filterPlayerId, filterMatchId]);

  useEffect(() => {
    const pin = getPin();
    if (pin) {
      loadReceivables();
    }
  }, [getPin, loadReceivables]);

  useEffect(() => {
    const pin = getPin();
    if (!pin) return;

    // Load players for filter
    const loadPlayers = async () => {
      try {
        const res = await fetch(
          `/api/players?adminPin=${encodeURIComponent(pin)}`
        );
        if (res.ok) {
          const data = await res.json();
          setPlayers(data.players ?? []);
        }
      } catch (err) {
        console.error("Error loading players:", err);
      }
    };

    // Load matches for filter (recent matches only)
    const loadMatches = async () => {
      try {
        const res = await fetch(
          `/api/matches?adminPin=${encodeURIComponent(pin)}`
        );
        if (res.ok) {
          const data = await res.json();
          // Sort by date, most recent first, limit to last 20 matches
          const sortedMatches = (data.matches || [])
            .sort(
              (a: Match, b: Match) =>
                new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
            )
            .slice(0, 20);
          setMatches(sortedMatches);
        }
      } catch (err) {
        console.error("Error loading matches:", err);
      }
    };

    loadPlayers();
    loadMatches();
  }, [getPin]);

  const markAsPaid = async (settlementId: string) => {
    const pin = getPin();
    if (!pin) return;

    try {
      const settlement = settlements.find((s) => s.id === settlementId);
      if (!settlement) return;

      const res = await fetch(
        `/api/matches/${settlement.match.id}/settlement/payment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminPin: pin,
            playerId: settlement.player?.id,
            paid: true,
          }),
        }
      );

      if (res.ok) {
        setMsg("Đã đánh dấu thanh toán thành công");
        loadReceivables(); // Reload data
      } else {
        try {
          const errData = await res.json();
          setMsg(errData.error || "Lỗi khi cập nhật");
        } catch {
          setMsg(`Lỗi khi cập nhật (${res.status})`);
        }
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
      setMsg("Lỗi khi cập nhật");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getMatchTypeLabel = (type: "Internal" | "VsTeam") => {
    return type === "Internal" ? "Nội bộ" : "Giao hữu";
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quản Lý Công Nợ</h1>
        <Button variant="outline" onClick={() => router.push("/organizer")}>
          Quay Lại
        </Button>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Tổng Quan Công Nợ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {summary.totalUnpaid.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-sm text-gray-600">Tổng Công Nợ</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {summary.settlementCount}
                </p>
                <p className="text-sm text-gray-600">Khoản Chưa Thu</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {summary.uniquePlayersCount}
                </p>
                <p className="text-sm text-gray-600">Cầu Thủ</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {summary.uniqueMatchesCount}
                </p>
                <p className="text-sm text-gray-600">Trận Đấu</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Lọc Công Nợ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Cầu thủ</Label>
              <Select value={filterPlayerId} onValueChange={setFilterPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả cầu thủ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Trận đấu</Label>
              <Select value={filterMatchId} onValueChange={setFilterMatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trận đấu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {matches.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {getMatchTypeLabel(m.type)} - {formatDate(m.dateTime)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterPlayerId("all");
                  setFilterMatchId("all");
                }}
              >
                Xóa Lọc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Settlements List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Công Nợ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {settlements.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Không có công nợ nào
              </p>
            ) : (
              settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="flex items-start justify-between p-4 border rounded-lg bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                  onClick={() =>
                    router.push(`/organizer/settlement/${settlement.match.id}`)
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="destructive">Chưa Thanh Toán</Badge>
                      <span className="font-semibold text-lg">
                        {settlement.player?.name || "N/A"}
                      </span>
                      {settlement.player?.phone && (
                        <span className="text-sm text-gray-500">
                          {settlement.player.phone}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Trận đấu:</span>{" "}
                        {getMatchTypeLabel(settlement.match.type)} -{" "}
                        {formatDate(settlement.match.dateTime)}
                      </div>
                      <div>
                        <span className="font-medium">Số tiền:</span>{" "}
                        <span className="text-red-600 font-semibold text-lg">
                          {settlement.amount.toLocaleString("vi-VN")} VND
                        </span>
                      </div>
                      {settlement.player && (
                        <div>
                          <span className="font-medium">Số dư hiện tại:</span>{" "}
                          <span
                            className={`font-semibold ${
                              settlement.player.balance < 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {settlement.player.balance.toLocaleString("vi-VN")}{" "}
                            VND
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsPaid(settlement.id);
                      }}
                      variant="default"
                      size="sm"
                      className="gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Đánh Dấu Đã Thu
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {msg && (
        <div className="p-4 rounded-lg bg-blue-50 text-blue-800 text-sm">
          {msg}
        </div>
      )}
    </main>
  );
}
