"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/src/hooks/useAuth";

type Player = {
  id: string;
  name: string;
  phone?: string | null;
  balance: number;
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
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Số dư: {player.balance.toLocaleString("vi-VN")} VND
                      </div>
                      <div className="text-sm text-gray-500">
                        Đăng ký:{" "}
                        {new Date(player.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
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
