"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import QRCode from "qrcode";
import Image from "next/image";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const PIN_KEY = "fkas_admin_pin";

export default function OrganizerEditMatchPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = useMemo(
    () => (Array.isArray(params.matchId) ? params.matchId[0] : params.matchId),
    [params.matchId]
  );
  const router = useRouter();

  const [type, setType] = useState<"Internal" | "VsTeam">("Internal");
  const [fieldCost, setFieldCost] = useState<string>("600000");
  const [dateTime, setDateTime] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [matchInfo, setMatchInfo] = useState<{
    id: string;
    dateTime: string;
    type: "Internal" | "VsTeam";
    fieldCost: number | null;
    link: string;
  } | null>(null);
  const [readiness, setReadiness] = useState<{
    confirmed: number;
    guests: number;
    totalConfirmed: number;
    minRequired: number;
    ready: boolean;
  } | null>(null);
  const [attendance, setAttendance] = useState<
    Array<{
      playerId: string;
      playerName: string;
      status: string;
      guestCount: number;
      isLate: boolean;
      isLateSubmission: boolean;
      note: string;
      updatedAt: string;
    }>
  >([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const loadMatchData = useCallback(async () => {
    if (!matchId) return;

    setIsLoading(true);

    try {
      // Load all data in parallel
      const [matchRes, readinessRes, attendanceRes] = await Promise.allSettled([
        fetch(`/api/matches/${matchId}`),
        fetch(`/api/matches/${matchId}/readiness`),
        (() => {
          const pin = localStorage.getItem(PIN_KEY);
          if (pin) {
            return fetch(
              `/api/matches/${matchId}/attendance-list?adminPin=${encodeURIComponent(
                pin
              )}`
            );
          }
          return Promise.resolve(null);
        })(),
      ]);

      // Process match info
      if (matchRes.status === "fulfilled" && matchRes.value.ok) {
        const data = await matchRes.value.json();
        setMatchInfo(data);
        setType(data.type);
        setFieldCost(data.fieldCost?.toString() || "600000");
        // Convert dateTime to local datetime format for input
        if (data.dateTime) {
          const date = new Date(data.dateTime);
          const localDateTime = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000
          );
          setDateTime(localDateTime.toISOString().slice(0, 16));
        }

        // Regenerate QR code with updated link
        try {
          const url = await QRCode.toDataURL(`${location.origin}${data.link}`);
          setQrDataUrl(url);
        } catch {}
      }

      // Process readiness
      if (readinessRes.status === "fulfilled" && readinessRes.value.ok) {
        const data = await readinessRes.value.json();
        console.log("Readiness data:", data);
        setReadiness(data);
      }

      // Process attendance
      if (attendanceRes.status === "fulfilled" && attendanceRes.value?.ok) {
        const data = await attendanceRes.value.json();
        setAttendance(data.attendance || []);
      }
    } catch (error) {
      console.error("Error loading match data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    const pin = localStorage.getItem(PIN_KEY);
    if (!pin) {
      router.replace("/organizer/login");
      return;
    }

    // Load all match data
    if (matchId) {
      loadMatchData();
    }
  }, [router, matchId, loadMatchData]);

  async function save() {
    const pin = localStorage.getItem(PIN_KEY) || "";
    setMsg("Đang lưu...");
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        fieldCost: parseInt(fieldCost, 10) || undefined,
        dateTime: dateTime ? new Date(dateTime).toISOString() : undefined,
        adminPin: pin,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error || `Lỗi ${res.status}`;
      setMsg(errorMsg);
      toast.error(errorMsg);
      return;
    }
    setMsg("Đã lưu.");
    toast.success("Đã lưu thay đổi thành công!");

    // Refresh match information after successful save
    setMsg("Đang tải lại thông tin...");
    await loadMatchData();
    setMsg("Thông tin đã được cập nhật.");

    // Exit edit mode and clear success message after 3 seconds
    setIsEditing(false);
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <main className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chi Tiết Trận Đấu</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/organizer/matches")}
          >
            Quay Lại
          </Button>
          <Button onClick={() => router.push(`/m/${matchId}`)}>
            Xem Trang Cầu Thủ
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/organizer/settlement/${matchId}`)}
          >
            Thanh Toán
          </Button>
        </div>
      </div>

      {/* Match Info */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Thông Tin Trận Đấu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
            <div className="flex justify-center pt-4">
              <div className="text-center">
                <Skeleton className="h-30 w-30 rounded" />
                <Skeleton className="h-4 w-24 mt-2 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : matchInfo ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Thông Tin Trận Đấu</CardTitle>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Chỉnh Sửa
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={save}>
                      Lưu
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Hủy
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ngày & Giờ</Label>
                {!isEditing ? (
                  <p className="text-base sm:text-lg">
                    {new Date(matchInfo.dateTime).toLocaleString("vi-VN")}
                  </p>
                ) : (
                  <Input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    placeholder="Chọn ngày và giờ thi đấu"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Loại Trận</Label>
                {!isEditing ? (
                  <Badge
                    variant={
                      matchInfo.type === "Internal" ? "default" : "secondary"
                    }
                  >
                    {matchInfo.type === "Internal" ? "Nội Bộ" : "Đấu Đội Khác"}
                  </Badge>
                ) : (
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as "Internal" | "VsTeam")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại trận" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Internal">Nội Bộ</SelectItem>
                      <SelectItem value="VsTeam">Đấu Đội Khác</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link Điểm Danh</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${location.origin}${matchInfo.link}`
                      );
                      toast.success("Đã sao chép!");
                    }}
                    className="text-xs sm:text-sm"
                  >
                    Sao Chép
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Chi Phí Sân</Label>
                {!isEditing ? (
                  <p className="text-base sm:text-lg font-semibold">
                    {matchInfo.fieldCost?.toLocaleString("vi-VN") || "600,000"}{" "}
                    VND
                  </p>
                ) : (
                  <CurrencyInput
                    value={fieldCost}
                    onValueChange={setFieldCost}
                    placeholder="Chi phí sân"
                  />
                )}
              </div>
            </div>

            {qrDataUrl && (
              <div className="flex justify-center pt-4">
                <div className="text-center">
                  <Image
                    alt="QR Trận Đấu"
                    src={qrDataUrl}
                    width={120}
                    height={120}
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    QR Code để chia sẻ
                  </p>
                </div>
              </div>
            )}
            {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
          </CardContent>
        </Card>
      ) : null}

      {/* Readiness Status */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Tình Trạng Sẵn Sàng
              <Skeleton className="h-6 w-20" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : readiness ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Tình Trạng Sẵn Sàng
              <Badge variant={readiness.ready ? "default" : "destructive"}>
                {readiness.ready ? "Sẵn Sàng" : "Chưa Sẵn Sàng"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main Status - Large and Clear */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      readiness.ready ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-lg font-semibold">
                    {readiness.ready ? "Sẵn Sàng Thi Đấu" : "Chưa Đủ Người"}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {readiness.totalConfirmed} / {readiness.minRequired}
                </p>
                <p className="text-sm text-gray-600">
                  {readiness.totalConfirmed >= readiness.minRequired
                    ? "Đủ điều kiện thi đấu"
                    : `Cần thêm ${
                        readiness.minRequired - readiness.totalConfirmed
                      } người`}
                </p>
              </div>

              {/* Detailed Stats - Mobile Friendly Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-600">
                    {readiness.confirmed}
                  </p>
                  <p className="text-xs text-blue-800">Cầu Thủ</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-600">
                    {readiness.guests}
                  </p>
                  <p className="text-xs text-green-800">Khách</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Attendance List */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : attendance.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Danh Sách Điểm Danh ({attendance.length} người)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendance.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    item.status === "Attending"
                      ? "bg-green-50 border-green-200"
                      : item.status === "NotGoing"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">
                          {item.playerName}
                        </span>
                        <div className="flex-shrink-0">
                          <Badge
                            variant={
                              item.status === "Attending"
                                ? "default"
                                : item.status === "NotGoing"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {item.status === "Attending"
                              ? "✓ Tham Gia"
                              : item.status === "NotGoing"
                              ? "✗ Không Tham Gia"
                              : "? Chưa Quyết Định"}
                          </Badge>
                        </div>
                      </div>

                      {/* Status Details */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.isLate && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-orange-100 text-orange-800 border-orange-300"
                          >
                            ⏰ Muộn
                          </Badge>
                        )}
                        {item.isLateSubmission && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-red-100 text-red-800 border-red-300"
                          >
                            ⚠️ Điểm Danh Muộn
                          </Badge>
                        )}
                        {item.guestCount > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-blue-100 text-blue-800"
                          >
                            👥 +{item.guestCount} khách
                          </Badge>
                        )}
                      </div>

                      {/* Note */}
                      {item.note && (
                        <p className="text-sm text-gray-700 mb-2 bg-white p-2 rounded border">
                          💬 {item.note}
                        </p>
                      )}

                      {/* Update Time */}
                      <p className="text-xs text-gray-500">
                        Cập nhật:{" "}
                        {new Date(item.updatedAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
