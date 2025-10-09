"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type FundEntry = {
  id: string;
  direction: "Income" | "Expense";
  amount: number;
  note: string | null;
  createdAt: string;
};

type FundSummary = {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  entryCount: number;
};

export default function FundPage() {
  const router = useRouter();
  const { getPin } = useAuth();
  const [entries, setEntries] = useState<FundEntry[]>([]);
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [msg, setMsg] = useState("");

  // New entry form
  const [direction, setDirection] = useState<"Income" | "Expense">("Income");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    const pin = getPin();
    if (pin) {
      loadFundData();
    }
  }, [getPin]);

  async function loadFundData() {
    const pin = getPin();
    if (!pin) return;

    try {
      const res = await fetch(`/api/fund?adminPin=${encodeURIComponent(pin)}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error("Error loading fund data:", error);
    }
  }

  async function addEntry() {
    if (!amount || !direction) {
      setMsg("Vui lòng nhập đầy đủ thông tin");
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
                  {summary.entryCount}
                </p>
                <p className="text-sm text-gray-600">Giao Dịch</p>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loại Giao Dịch</Label>
              <Select
                value={direction}
                onValueChange={(v) => setDirection(v as "Income" | "Expense")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Thu (Income)</SelectItem>
                  <SelectItem value="Expense">Chi (Expense)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Số Tiền (VND)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
          <Button onClick={addEntry} disabled={!amount || !direction}>
            Thêm Giao Dịch
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch Sử Giao Dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Chưa có giao dịch nào
              </p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        entry.direction === "Income" ? "default" : "destructive"
                      }
                    >
                      {entry.direction === "Income" ? "Thu" : "Chi"}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {entry.amount.toLocaleString("vi-VN")} VND
                      </div>
                      {entry.note && (
                        <div className="text-sm text-gray-600">
                          {entry.note}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {new Date(entry.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </main>
  );
}
