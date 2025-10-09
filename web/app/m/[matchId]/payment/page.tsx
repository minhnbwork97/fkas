"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDeviceId } from "@/src/lib/deviceFingerprint";
import { toast } from "sonner";

export default function MatchPaymentPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = useMemo(
    () => (Array.isArray(params.matchId) ? params.matchId[0] : params.matchId),
    [params.matchId]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [matchInfo, setMatchInfo] = useState<{ dateTime: string } | null>(null);
  const [mySettlement, setMySettlement] = useState<{
    amount: number;
    paid: boolean;
  } | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        // Load match info
        const matchRes = await fetch(`/api/matches/${matchId}`);
        if (matchRes.ok) {
          const m = await matchRes.json();
          setMatchInfo({ dateTime: m.dateTime });
        }
        // Find player from device
        const deviceId = getDeviceId();
        if (!deviceId) {
          setError("Không xác định được cầu thủ trên thiết bị này.");
          return;
        }
        const playerRes = await fetch(`/api/device/${deviceId}/player`);
        if (!playerRes.ok) {
          setError("Không tìm thấy cầu thủ.");
          return;
        }
        await playerRes.json();
        // Load my settlement using deviceId (no admin pin)
        const myRes = await fetch(
          `/api/matches/${matchId}/my-settlement?deviceId=${encodeURIComponent(
            deviceId
          )}`
        );
        if (myRes.ok) {
          const d = await myRes.json();
          console.log({ d });
          if (d.hasSettlement)
            setMySettlement({ amount: d.amount, paid: d.paid });
        }
      } catch {
        setError("Lỗi tải dữ liệu.");
      } finally {
        setIsLoading(false);
      }
    };
    if (matchId) load();
  }, [matchId]);

  const handleSelfReportPayment = async () => {
    if (!mySettlement || mySettlement.paid) return;

    setIsReporting(true);
    try {
      const deviceId = getDeviceId();
      if (!deviceId) {
        toast.error("Không xác định được thiết bị");
        return;
      }

      const response = await fetch(
        `/api/matches/${matchId}/self-report-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ deviceId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Đã báo cáo thanh toán thành công!");
        // Update local state
        setMySettlement((prev) => (prev ? { ...prev, paid: true } : null));
      } else {
        toast.error(data.error || "Có lỗi xảy ra khi báo cáo thanh toán");
      }
    } catch (error) {
      console.error("Error reporting payment:", error);
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) return null;

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Thanh Toán Sau Trận Đấu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {matchInfo && (
            <p className="text-sm text-gray-600">
              Trận: {new Date(matchInfo.dateTime).toLocaleString("vi-VN")}
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {mySettlement ? (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded border">
                <div className="flex justify-between">
                  <span>Số tiền cần đóng</span>
                  <span className="font-semibold">
                    {mySettlement.amount.toLocaleString("vi-VN")} VND
                  </span>
                </div>
                <div className="mt-1">
                  Trạng thái:{" "}
                  <span
                    className={
                      mySettlement.paid
                        ? "text-green-600 font-medium"
                        : "text-orange-600 font-medium"
                    }
                  >
                    {mySettlement.paid ? "Đã thanh toán" : "Chưa thanh toán"}
                  </span>
                </div>
              </div>

              {!mySettlement.paid && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Đã thanh toán rồi? Bấm nút bên dưới để thông báo.
                  </p>
                  <Button
                    onClick={handleSelfReportPayment}
                    disabled={isReporting}
                    className="w-full"
                  >
                    {isReporting ? "Đang báo cáo..." : "Tôi đã thanh toán"}
                  </Button>
                </div>
              )}

              {mySettlement.paid && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-700">
                    ✓ Cảm ơn bạn đã báo cáo thanh toán.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Không tìm thấy thông tin thanh toán cho bạn.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
