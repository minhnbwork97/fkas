"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/src/hooks/useAuth";
import { ChevronDownIcon } from "lucide-react";

type Player = {
  id: string;
  name: string;
  phone?: string | null;
  balance: number;
  createdAt: string;
};

type Transaction = {
  id: string;
  type: "TopUp" | "Charge" | "Refund";
  amount: number;
  note: string | null;
  matchDate?: string;
  createdAt: string;
};

type PendingRequest = {
  id: string;
  name: string;
  phone?: string | null;
  createdAt: string;
};

export default function PlayerListPage() {
  const router = useRouter();
  const { getPin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [playerTransactions, setPlayerTransactions] = useState<Record<string, Transaction[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const pin = getPin();
    if (pin) {
      loadData(pin);
    }
  }, [getPin]);

  async function loadData(pin: string) {
    setIsLoading(true);
    try {
      // Load registered players
      const playersRes = await fetch(
        `/api/players?adminPin=${encodeURIComponent(pin)}`
      );
      const playersData = await playersRes.json();
      setPlayers(playersData.players ?? []);

      // Load pending requests
      const requestsRes = await fetch(
        `/api/roster/requests?adminPin=${encodeURIComponent(pin)}`
      );
      const requestsData = await requestsRes.json();
      setPendingRequests(requestsData.items ?? []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function approve(id: string) {
    const pin = getPin() || "";
    setMsg("Đang duyệt...");
    const res = await fetch(`/api/roster/requests/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPin: pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || `Lỗi ${res.status}`);
      return;
    }
    setMsg(`Đã duyệt! ${data.name} đã được thêm vào danh sách cầu thủ.`);
    setPendingRequests((prev) => prev.filter((x) => x.id !== id));
    // Only reload the registered players list without affecting the current tab
    const playersRes = await fetch(
      `/api/players?adminPin=${encodeURIComponent(pin)}`
    );
    const playersData = await playersRes.json();
    setPlayers(playersData.players ?? []);
  }

  async function reject(id: string) {
    const pin = getPin() || "";
    setMsg("Đang từ chối...");
    const res = await fetch(`/api/roster/requests/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPin: pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || `Lỗi ${res.status}`);
      return;
    }
    setMsg("Đã từ chối yêu cầu");
    setPendingRequests((prev) => prev.filter((x) => x.id !== id));
  }

  async function togglePlayerTransactions(playerId: string) {
    if (expandedPlayerId === playerId) {
      setExpandedPlayerId(null);
      return;
    }

    setExpandedPlayerId(playerId);

    // If transactions already loaded, don't reload
    if (playerTransactions[playerId]) {
      return;
    }

    // Load transactions for this player
    const pin = getPin() || "";
    setLoadingTransactions((prev) => ({ ...prev, [playerId]: true }));

    try {
      const res = await fetch(
        `/api/players/${playerId}/transactions?adminPin=${encodeURIComponent(pin)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPlayerTransactions((prev) => ({
          ...prev,
          [playerId]: data.transactions || [],
        }));
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoadingTransactions((prev) => ({ ...prev, [playerId]: false }));
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Danh Sách Cầu Thủ</h1>
        <div className="text-center py-8">
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Danh Sách Cầu Thủ</h1>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}

      <Tabs defaultValue="registered" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registered">
            Cầu Thủ Đã Đăng Ký ({players.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Chờ Duyệt ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registered" className="space-y-4">
          <div className="grid gap-3">
            {players.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">Chưa có cầu thủ nào đăng ký</p>
                </CardContent>
              </Card>
            ) : (
              players.map((player) => (
                <Card key={player.id}>
                  <CardHeader>
                    <CardTitle>
                      {player.name} {player.phone ? `(${player.phone})` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-gray-600">
                        Số dư:{" "}
                        <span
                          className={
                            player.balance < 0
                              ? "text-red-600 font-semibold"
                              : "font-semibold"
                          }
                        >
                          {player.balance.toLocaleString("vi-VN")} VND
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Đăng ký:{" "}
                        {new Date(player.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePlayerTransactions(player.id)}
                      className="w-full flex items-center justify-between"
                    >
                      <span>
                        {expandedPlayerId === player.id
                          ? "Ẩn Lịch Sử Giao Dịch"
                          : "Xem Lịch Sử Giao Dịch"}
                      </span>
                      <ChevronDownIcon
                        className={`transition-transform ${
                          expandedPlayerId === player.id ? "rotate-180" : ""
                        }`}
                      />
                    </Button>

                    {expandedPlayerId === player.id && (
                      <div className="mt-4 space-y-2 border-t pt-4">
                        <h4 className="font-medium text-sm">
                          Lịch Sử Giao Dịch
                        </h4>
                        {loadingTransactions[player.id] ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            Đang tải...
                          </p>
                        ) : playerTransactions[player.id]?.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            Chưa có giao dịch nào
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {playerTransactions[player.id]?.map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border text-sm"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
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
                                    <span
                                      className={`font-medium ${
                                        tx.amount < 0
                                          ? "text-red-600"
                                          : "text-green-600"
                                      }`}
                                    >
                                      {tx.amount > 0 ? "+" : ""}
                                      {tx.amount.toLocaleString("vi-VN")} VND
                                    </span>
                                  </div>
                                  {tx.note && (
                                    <p className="text-gray-600 mb-1">
                                      {tx.note}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {new Date(tx.createdAt).toLocaleString(
                                      "vi-VN"
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-3">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-600">Không có yêu cầu chờ duyệt</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <CardTitle>
                      {request.name} {request.phone ? `(${request.phone})` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Yêu cầu lúc{" "}
                      {new Date(request.createdAt).toLocaleString("vi-VN")}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => reject(request.id)}
                      >
                        Từ Chối
                      </Button>
                      <Button onClick={() => approve(request.id)}>Duyệt</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
