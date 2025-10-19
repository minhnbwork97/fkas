"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeviceId } from "@/src/lib/deviceFingerprint";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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
    qrCodeUrl?: string | null;
  } | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [playerBalance, setPlayerBalance] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hasTransactions, setHasTransactions] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>("");
  const [phoneChecked, setPhoneChecked] = useState<boolean>(false);
  const [isLookingUpPhone, setIsLookingUpPhone] = useState<boolean>(false);
  const [hasTriedResolve, setHasTriedResolve] = useState<boolean>(false);
  const [isLoadingPaymentInfo, setIsLoadingPaymentInfo] =
    useState<boolean>(false);
  const [identifiedViaPhone, setIdentifiedViaPhone] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        // Load match info
        const matchRes = await fetch(`/api/matches/${matchId}`);
        if (matchRes.ok) {
          const m = await matchRes.json();
          setMatchInfo({ dateTime: m.dateTime });
        }
        // Find player from device (best-effort)
        const deviceId = getDeviceId();
        let foundPlayerId: string | null = null;
        if (deviceId) {
          const playerRes = await fetch(`/api/device/${deviceId}/player`);
          if (playerRes.ok) {
            const playerData = await playerRes.json();
            foundPlayerId = playerData.playerId as string;
            setPlayerId(foundPlayerId);
            setIdentifiedViaPhone(false); // Mark that user was identified via device
          }
        }
        // Fetch player balance and transaction status (only if player known)
        if (foundPlayerId) {
          const playerDetailRes = await fetch(`/api/players/${foundPlayerId}`);
          if (playerDetailRes.ok) {
            const playerDetail = await playerDetailRes.json();
            console.log("Player detail:", playerDetail);
            setPlayerBalance(playerDetail.balance);
            setHasTransactions(playerDetail.hasTransactions || false);
          } else {
            console.error(
              "Failed to fetch player balance:",
              playerDetailRes.status
            );
          }
        }
        // Load my settlement using deviceId (no admin pin) if available
        if (deviceId) {
          const myRes = await fetch(
            `/api/matches/${matchId}/my-settlement?deviceId=${encodeURIComponent(
              deviceId
            )}`
          );
          if (myRes.ok) {
            const d = await myRes.json();
            console.log({ d });
            if (d.hasSettlement)
              setMySettlement({
                amount: d.amount,
                paid: d.paid,
                qrCodeUrl: d.qrCodeUrl,
              });
          }
        }
      } catch {
        setError("Lỗi tải dữ liệu.");
      } finally {
        setIsLoading(false);
      }
    };
    if (matchId) load();
  }, [matchId]);

  // Debounced phone lookup when device recognition didn't resolve player
  useEffect(() => {
    if (playerId) return; // already identified via device
    const trimmed = phone.trim();
    if (!trimmed) {
      setPhoneChecked(false);
      return;
    }

    const handler = setTimeout(async () => {
      if (trimmed.length < 8) {
        setPhoneChecked(false);
        return;
      }
      try {
        setIsLookingUpPhone(true);
        // Step 1: resolve player by phone
        const p = await fetch(
          `/api/players/by-phone?phone=${encodeURIComponent(trimmed)}`
        );
        setPhoneChecked(true);
        if (!p.ok) {
          setPlayerId(null);
          setPlayerBalance(null);
          setHasTransactions(false);
          setMySettlement(null);
          return;
        }
        const pd = await p.json();
        if (!pd?.player?.id) {
          setPlayerId(null);
          setPlayerBalance(null);
          setHasTransactions(false);
          setMySettlement(null);
          return;
        }
        const resolvedPlayerId = pd.player.id as string;
        setPlayerId(resolvedPlayerId);
        setIdentifiedViaPhone(true); // Mark that user was identified via phone

        // Step 2 & 3: fetch player balance and then settlement + QR with loading state
        setIsLoadingPaymentInfo(true);
        try {
          const detail = await fetch(`/api/players/${resolvedPlayerId}`);
          if (detail.ok) {
            const det = await detail.json();
            setPlayerBalance(det.balance);
            setHasTransactions(det.hasTransactions || false);
          }

          const r = await fetch(
            `/api/matches/${matchId}/my-settlement?phone=${encodeURIComponent(
              trimmed
            )}`
          );
          const d = await r.json();
          if (r.ok && d?.hasSettlement) {
            setMySettlement({
              amount: d.amount,
              paid: d.paid,
              qrCodeUrl: d.qrCodeUrl,
            });
          } else {
            setMySettlement(null);
          }
        } finally {
          setIsLoadingPaymentInfo(false);
        }
      } catch {
      } finally {
        setIsLookingUpPhone(false);
        setHasTriedResolve(true);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [phone, playerId, matchId]);

  const handleSelfReportPayment = async () => {
    if (!mySettlement || mySettlement.paid) return;

    setIsReporting(true);
    try {
      const deviceId = getDeviceId();
      const requestBody: { deviceId?: string; phone?: string } = {};

      // Try device ID first, fall back to phone if available
      if (deviceId) {
        requestBody.deviceId = deviceId;
      } else if (phone.trim()) {
        requestBody.phone = phone.trim();
      } else {
        const errorMessage = identifiedViaPhone
          ? "Vui lòng nhập lại số điện thoại để xác nhận thanh toán"
          : "Không xác định được thiết bị hoặc số điện thoại";
        toast.error(errorMessage);
        return;
      }

      const response = await fetch(
        `/api/matches/${matchId}/self-report-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Đã báo cáo thanh toán thành công!");
        // Update local state
        setMySettlement((prev) => (prev ? { ...prev, paid: true } : null));

        // Refresh player balance after payment
        if (playerId) {
          const playerDetailRes = await fetch(`/api/players/${playerId}`);
          if (playerDetailRes.ok) {
            const playerDetail = await playerDetailRes.json();
            console.log("Updated player balance:", playerDetail.balance);
            setPlayerBalance(playerDetail.balance);
            setHasTransactions(playerDetail.hasTransactions || false);
          } else {
            console.error(
              "Failed to refresh player balance:",
              playerDetailRes.status
            );
          }
        }
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

  if (isLoading) {
    return (
      <main className="max-w-xl mx-auto p-6 space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Match info skeleton */}
            <Skeleton className="h-4 w-64" />

            {/* Settlement info skeleton */}
            <div className="p-3 bg-gray-50 rounded border space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Player balance skeleton */}
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            {/* QR Code section skeleton */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="bg-white p-3 rounded-lg inline-block shadow-sm">
                  <Skeleton className="w-64 h-64" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-56 mx-auto" />
                  <Skeleton className="h-3 w-48 mx-auto" />
                </div>
              </div>
            </div>

            {/* Payment button skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  console.log(
    "Rendering payment page. Player balance:",
    playerBalance,
    "Type:",
    typeof playerBalance
  );

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
          {!playerId && (
            <div className="">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneChecked(false);
                }}
                placeholder="Nhập số điện thoại của bạn"
              />
              {isLookingUpPhone && (
                <p className="text-xs text-gray-600 mt-2">
                  Đang kiểm tra số điện thoại...
                </p>
              )}
              {phoneChecked && !mySettlement && (
                <p className="text-xs text-gray-600 mt-2">
                  Không tìm thấy thông tin thanh toán cho số điện thoại này.
                </p>
              )}
            </div>
          )}
          {isLoadingPaymentInfo ? (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded border">
                <div className="flex justify-between">
                  <span>Số tiền cần đóng</span>
                  <span className="font-semibold">...</span>
                </div>
                <div className="mt-1 text-gray-500 text-sm">Đang tải...</div>
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-900">
                    Số dư quỹ hiện tại
                  </span>
                  <span className="font-semibold text-blue-700">...</span>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <div className="text-center space-y-3">
                  <div className="bg-white p-3 rounded-lg inline-block shadow-sm">
                    <div className="w-64 h-64 mx-auto bg-gray-100 animate-pulse" />
                  </div>
                  <div className="text-sm text-blue-800">Đang tạo mã QR...</div>
                </div>
              </div>
            </div>
          ) : mySettlement ? (
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

              {/* Fund balance display */}
              {typeof playerBalance === "number" && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-900">
                      Số dư quỹ hiện tại
                    </span>
                    <span
                      className={`font-semibold ${
                        playerBalance >= 0 ? "text-blue-700" : "text-red-600"
                      }`}
                    >
                      {playerBalance.toLocaleString("vi-VN")} VND
                    </span>
                  </div>
                </div>
              )}

              {!mySettlement.paid && (
                <div className="space-y-4">
                  {/* QR Code Section */}
                  {mySettlement.qrCodeUrl && (
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-blue-900 font-semibold">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                            />
                          </svg>
                          <span>Quét mã QR để thanh toán</span>
                        </div>

                        <div className="bg-white p-3 rounded-lg inline-block shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mySettlement.qrCodeUrl}
                            alt="QR Code thanh toán"
                            className="w-64 h-64 mx-auto"
                          />
                        </div>

                        <div className="text-sm space-y-1">
                          <p className="text-blue-800">
                            💳 Mở app ngân hàng → Quét QR → Thanh toán
                          </p>
                          <p className="text-xs text-blue-600">
                            Sau khi thanh toán, nhấn nút xác nhận bên dưới
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Payment Confirmation */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {mySettlement.qrCodeUrl
                        ? "Sau khi thanh toán, bấm nút bên dưới:"
                        : "Đã thanh toán rồi? Bấm nút bên dưới để thông báo."}
                    </p>
                    <Button
                      onClick={handleSelfReportPayment}
                      disabled={isReporting}
                      className="w-full"
                    >
                      {isReporting ? "Đang báo cáo..." : "Tôi đã thanh toán"}
                    </Button>
                  </div>
                </div>
              )}

              {mySettlement.paid && (
                <div className="p-3 bg-green-50 border border-green-200 rounded space-y-2">
                  <p className="text-sm text-green-700 font-medium">
                    ✓ Cảm ơn bạn đã báo cáo thanh toán.
                  </p>
                  <p className="text-sm text-green-700">
                    Số tiền cần đóng:{" "}
                    <span className="font-semibold">
                      {mySettlement.amount.toLocaleString("vi-VN")} VND
                    </span>
                  </p>
                  {hasTransactions && (
                    <p className="text-sm text-green-700">
                      Số tiền này đã được trừ vào quỹ của bạn.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : hasTriedResolve && !phoneChecked ? (
            <p className="text-sm text-gray-600"></p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
