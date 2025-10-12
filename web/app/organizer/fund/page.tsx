"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useAuth } from "@/src/hooks/useAuth";
import { ChevronDownIcon, ExternalLink } from "lucide-react";

type FundSummary = {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
};

type Transaction = {
  id: string;
  type: "TopUp" | "Charge" | "Refund";
  amount: number;
  note: string | null;
  playerId: string;
  playerName: string;
  matchId: string | null;
  matchDate?: string;
  createdAt: string;
  balanceBefore: number;
  balanceAfter: number;
};

type Player = {
  id: string;
  name: string;
  phone?: string | null;
  balance?: number;
  createdAt?: string;
};

export default function FundPage() {
  const router = useRouter();
  const { getPin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [msg, setMsg] = useState("");

  // players for the 'performed by' select
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | "">("");

  // New entry form
  const [direction, setDirection] = useState<"Income" | "Expense">("Income");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // Filter controls
  const [filterPlayerId, setFilterPlayerId] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPlayerId, filterStartDate, filterEndDate]);

  // Transform players to autocomplete options
  const playerOptions = useMemo<AutocompleteOption[]>(() => {
    return players.map((p) => ({
      value: p.id,
      label: p.name,
      secondary: p.phone || undefined,
    }));
  }, [players]);

  const loadFundData = useCallback(async () => {
    const pin = getPin();
    if (!pin) return;

    try {
      // Build query parameters with filters and pagination
      const params = new URLSearchParams({ adminPin: pin });
      if (filterPlayerId) params.append("playerId", filterPlayerId);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);
      params.append("page", currentPage.toString());
      params.append("pageSize", "10");

      const res = await fetch(`/api/fund?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
        setPagination(data.pagination || null);
      }
      // also load players for the select (with more details)
      try {
        const playersRes = await fetch(
          `/api/players?adminPin=${encodeURIComponent(pin)}`
        );
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          setPlayers(playersData.players ?? []);
        }
      } catch (err) {
        console.error("Error loading players:", err);
      }
    } catch (error) {
      console.error("Error loading fund data:", error);
    }
  }, [getPin, filterPlayerId, filterStartDate, filterEndDate, currentPage]);

  useEffect(() => {
    const pin = getPin();
    if (pin) {
      loadFundData();
    }
  }, [getPin, loadFundData]);

  async function addEntry() {
    if (!amount || !direction || !selectedPlayerId) {
      setMsg("Vui lòng nhập đầy đủ thông tin và chọn cầu thủ");
      return;
    }

    const pin = getPin() || "";
    setMsg("Đang thêm...");

    const res = await fetch("/api/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminPin: pin,
        direction,
        amount: parseInt(amount),
        note: note || null,
        playerId: selectedPlayerId || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || `Lỗi ${res.status}`);
      return;
    }

    setMsg("Đã thêm thành công!");
    setAmount("");
    setNote("");
    setSelectedPlayerId("");
    loadFundData(); // Reload data
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản Lý Quỹ Đội</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/organizer")}>
            Quay Lại
          </Button>
        </div>
      </div>

      {/* Fund Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Tình Trạng Quỹ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {summary.currentBalance.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-sm text-gray-600">Số Dư Hiện Tại</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {summary.totalIncome.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-sm text-gray-600">Tổng Thu</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {summary.totalExpense.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-sm text-gray-600">Tổng Chi</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {summary.transactionCount}
                </p>
                <p className="text-sm text-gray-600">Giao Dịch</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Negative Balance Warning */}
      {players.filter((p) => p.balance && p.balance < 0).length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Cảnh Báo: Cầu Thủ Âm Quỹ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {players
                .filter((p) => p.balance && p.balance < 0)
                .sort((a, b) => (a.balance ?? 0) - (b.balance ?? 0))
                .map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-white border-2 border-red-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {player.name}
                      </div>
                      {player.phone && (
                        <div className="text-sm text-gray-600">
                          {player.phone}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-red-600">
                        {(player.balance ?? 0).toLocaleString("vi-VN")} VND
                      </div>
                      <div className="text-xs text-red-500 font-medium">
                        Cần nạp thêm{" "}
                        {Math.abs(player.balance ?? 0).toLocaleString("vi-VN")}{" "}
                        VND
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Thêm Giao Dịch Mới</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row flex-wrap gap-4">
            <div className="space-y-2 flex-1">
              <Label>Loại Giao Dịch</Label>
              <RadioGroup
                value={direction}
                onValueChange={(v) => setDirection(v as "Income" | "Expense")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Income" id="income" />
                  <Label
                    htmlFor="income"
                    className="cursor-pointer font-normal"
                  >
                    Thu
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Expense" id="expense" />
                  <Label
                    htmlFor="expense"
                    className="cursor-pointer font-normal"
                  >
                    Chi
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2 flex-2 flex flex-col">
              <Label>Người thực hiện giao dịch</Label>
              <Autocomplete
                options={playerOptions}
                value={selectedPlayerId}
                onValueChange={(v) => setSelectedPlayerId(v)}
                placeholder="Tìm kiếm người thực hiện..."
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Số Tiền</Label>
              <CurrencyInput
                value={amount}
                onValueChange={setAmount}
                placeholder="Nhập số tiền"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ghi Chú (Tùy Chọn)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mô tả giao dịch..."
              rows={3}
            />
          </div>
          <Button
            onClick={addEntry}
            disabled={!amount || !direction || !selectedPlayerId}
          >
            Thêm Giao Dịch
          </Button>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Lọc Giao Dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Người thực hiện</Label>
              <Autocomplete
                options={[{ value: "", label: "Tất cả" }, ...playerOptions]}
                value={filterPlayerId}
                onValueChange={setFilterPlayerId}
                placeholder="Chọn người thực hiện..."
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterPlayerId("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                }}
              >
                Xóa Lọc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch Sử Giao Dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Chưa có giao dịch nào
              </p>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-start justify-between p-4 border rounded-lg bg-white shadow-sm transition-all ${
                    tx.matchId
                      ? "cursor-pointer hover:shadow-md hover:border-blue-300 group"
                      : ""
                  }`}
                  onClick={() => {
                    if (tx.matchId) {
                      router.push(`/organizer/settlement/${tx.matchId}`);
                    }
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={
                          tx.type === "TopUp"
                            ? "default"
                            : tx.type === "Charge"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {tx.type === "TopUp"
                          ? "Nạp"
                          : tx.type === "Charge"
                          ? "Chi"
                          : "Hoàn"}
                      </Badge>
                      <span className="font-medium text-sm">
                        {tx.playerName}
                      </span>
                      <span
                        className={`font-semibold ${
                          tx.amount < 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount.toLocaleString("vi-VN")} VND
                      </span>
                      {tx.matchId && (
                        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors ml-auto" />
                      )}
                    </div>
                    {tx.note && (
                      <p className="text-sm text-gray-600 mb-2">{tx.note}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Số dư trước:</span>
                        <span
                          className={`font-semibold ${
                            tx.balanceBefore < 0
                              ? "text-red-600"
                              : "text-gray-700"
                          }`}
                        >
                          {tx.balanceBefore.toLocaleString("vi-VN")} VND
                        </span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Số dư sau:</span>
                        <span
                          className={`font-semibold ${
                            tx.balanceAfter < 0
                              ? "text-red-600"
                              : tx.balanceAfter > tx.balanceBefore
                              ? "text-green-600"
                              : "text-gray-700"
                          }`}
                        >
                          {tx.balanceAfter.toLocaleString("vi-VN")} VND
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                Trang {pagination.page} / {pagination.totalPages} (Tổng{" "}
                {pagination.totalCount} giao dịch)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(pagination.totalPages, p + 1)
                    )
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {msg && <p className="text-sm text-gray-600">{msg}</p>}

      {/* Players List (accordion) */}
      <details
        open
        className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"
      >
        <summary className="px-6 cursor-pointer list-none flex items-center justify-between">
          <div className="leading-none font-semibold">Số Dư Cầu Thủ</div>
          <div className="text-sm text-muted-foreground">
            <ChevronDownIcon />
          </div>
        </summary>
        <div className="px-6">
          {players.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có thành viên</p>
          ) : (
            <div className="space-y-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    {p.phone && (
                      <div className="text-sm text-gray-600">{p.phone}</div>
                    )}
                  </div>
                  <div className="text-right font-medium">
                    {(p.balance ?? 0).toLocaleString("vi-VN")} VND
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </main>
  );
}
