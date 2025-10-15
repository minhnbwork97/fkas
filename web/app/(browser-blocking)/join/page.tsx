"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getOrCreateDeviceId, getDeviceId } from "@/src/lib/deviceFingerprint";

type RequestStatus = "not_found" | "Pending" | "Approved" | "Rejected";

type RequestInfo = {
  status: RequestStatus;
  name: string;
  phone?: string;
  createdAt: string;
  message: string;
};

export default function JoinPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check request status on component mount
  useEffect(() => {
    checkRequestStatus();
  }, []);

  async function checkRequestStatus() {
    const deviceId = getDeviceId();
    if (!deviceId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/roster/requests/status?deviceId=${encodeURIComponent(deviceId)}`
      );
      const data = await res.json();

      if (res.ok && data.status !== "not_found") {
        setRequestInfo(data);
      }
    } catch (error) {
      console.error("Error checking request status:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function submit() {
    if (!name.trim()) {
      setMsg("Vui lòng nhập tên");
      return;
    }
    if (!phone.trim()) {
      setMsg("Vui lòng nhập số điện thoại");
      return;
    }

    setMsg("Đang gửi yêu cầu...");

    try {
      const deviceId = getOrCreateDeviceId();

      const res = await fetch("/api/roster/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          deviceId: deviceId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error || `Lỗi ${res.status}`);
        return;
      }

      setMsg("Yêu cầu đã được gửi! Vui lòng chờ quản lý duyệt.");

      // Clear form
      setName("");
      setPhone("");

      // Refresh request status
      await checkRequestStatus();
    } catch (error) {
      setMsg("Lỗi kết nối. Vui lòng thử lại.");
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-md mx-auto p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">
            Tham Gia FC Không Giải Tán
          </h1>
          <p className="text-gray-600">Đang kiểm tra trạng thái...</p>
        </div>
      </main>
    );
  }

  // Show status if there's an existing request
  if (requestInfo) {
    return (
      <main className="max-w-md mx-auto p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">
            Tham Gia FC Không Giải Tán
          </h1>
          <p className="text-gray-600">Trạng thái yêu cầu của bạn</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Trạng thái yêu cầu</span>
              <Badge
                variant={
                  requestInfo.status === "Approved"
                    ? "default"
                    : requestInfo.status === "Rejected"
                    ? "destructive"
                    : "secondary"
                }
              >
                {requestInfo.status === "Pending"
                  ? "Chờ duyệt"
                  : requestInfo.status === "Approved"
                  ? "Đã duyệt"
                  : requestInfo.status === "Rejected"
                  ? "Bị từ chối"
                  : "Không xác định"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Tên:</strong> {requestInfo.name}
              </p>
              {requestInfo.phone && (
                <p className="text-sm text-gray-600">
                  <strong>Số điện thoại:</strong> {requestInfo.phone}
                </p>
              )}
              <p className="text-sm text-gray-600">
                <strong>Ngày gửi:</strong>{" "}
                {new Date(requestInfo.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>

            <div
              className={`p-3 rounded-md ${
                requestInfo.status === "Approved"
                  ? "bg-green-50 border border-green-200"
                  : requestInfo.status === "Rejected"
                  ? "bg-red-50 border border-red-200"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <p
                className={`text-sm ${
                  requestInfo.status === "Approved"
                    ? "text-green-800"
                    : requestInfo.status === "Rejected"
                    ? "text-red-800"
                    : "text-yellow-800"
                }`}
              >
                {requestInfo.message}
              </p>
            </div>

            {requestInfo.status === "Approved" && (
              <div className="bg-green-100 border-l-4 border-green-500 p-3 rounded-r-md">
                <p className="text-sm text-green-800">
                  🎉 Chúc mừng! Bạn đã trở thành thành viên của FC Không Giải
                  Tán. Quản lý sẽ gửi link điểm danh trước mỗi trận đấu.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Important Notice - Same as in form */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 font-bold text-lg">⚠️</div>
            <div className="space-y-3">
              <p className="font-semibold text-amber-800 text-base">
                Lưu ý quan trọng
              </p>

              <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🔑</span>
                  <div>
                    <p className="font-medium text-amber-800 text-sm mb-1">
                      Tài khoản được liên kết với thiết bị và trình duyệt
                    </p>
                    <p className="text-sm text-amber-700">
                      Hệ thống sẽ nhận diện bạn thông qua thông tin thiết bị và
                      trình duyệt này.{" "}
                      <strong className="text-amber-800">
                        Nếu bạn đổi thiết bị hoặc trình duyệt khác, bạn sẽ phải
                        gửi yêu cầu tham gia lại.
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">📱</span>
                  <div>
                    <p className="font-medium text-amber-800 text-sm mb-1">
                      Sử dụng cùng thiết bị và trình duyệt để điểm danh
                    </p>
                    <p className="text-sm text-amber-700">
                      Trước mỗi trận đấu, quản lý sẽ gửi link điểm danh.{" "}
                      <strong className="text-amber-800">
                        Vui lòng sử dụng thiết bị và trình duyệt này để điểm
                        danh
                      </strong>
                      , không nên dùng thiết bị hoặc trình duyệt khác.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🚫</span>
                  <div>
                    <p className="font-medium text-amber-800 text-sm mb-1">
                      Không nên sử dụng
                    </p>
                    <p className="text-sm text-amber-700">
                      • Trình duyệt ẩn danh (Incognito/Private mode)
                      <br />
                      • Chế độ riêng tư
                      <br />• Xóa dữ liệu trình duyệt sau khi đăng ký
                      <br />• Đổi trình duyệt khác (Chrome, Firefox, Safari,
                      Edge)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
                <p className="font-medium text-amber-800 text-sm text-center">
                  💡 Lưu ý: Nếu bạn không tuân thủ các quy định trên, bạn có thể
                  không thể tham gia điểm danh và phải đăng ký lại.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show form if no existing request
  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">
          Tham Gia FC Không Giải Tán
        </h1>
        <p className="text-gray-600">
          Điền thông tin để gửi yêu cầu tham gia đội bóng
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông Tin Cầu Thủ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên *</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên của bạn"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại của bạn"
              required
            />
          </div>

          {msg && (
            <p
              className={`text-sm ${
                msg.includes("Lỗi") ? "text-red-600" : "text-green-600"
              }`}
            >
              {msg}
            </p>
          )}

          <Button onClick={submit} className="w-full">
            Gửi Yêu Cầu Tham Gia
          </Button>
        </CardContent>
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <p className="text-sm font-medium text-amber-800">
            Sau khi gửi yêu cầu, quản lý sẽ duyệt và kết quả sẽ được cập nhật
            trên trang này.
          </p>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 font-bold text-lg">⚠️</div>
            <div className="space-y-3">
              <p className="font-semibold text-amber-800 text-base">
                Lưu ý quan trọng
              </p>

              <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🔑</span>
                  <div>
                    <p className="font-medium text-amber-800 text-sm mb-1">
                      Tài khoản được liên kết với thiết bị và trình duyệt
                    </p>
                    <p className="text-sm text-amber-700">
                      Hệ thống sẽ nhận diện bạn thông qua thông tin thiết bị và
                      trình duyệt này.{" "}
                      <strong className="text-amber-800">
                        Nếu bạn đổi thiết bị hoặc trình duyệt khác, bạn sẽ phải
                        gửi yêu cầu tham gia lại.
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">📱</span>
                  <div>
                    <p className="font-medium text-amber-800 text-sm mb-1">
                      Sử dụng cùng thiết bị và trình duyệt để điểm danh
                    </p>
                    <p className="text-sm text-amber-700">
                      Trước mỗi trận đấu, quản lý sẽ gửi link điểm danh.{" "}
                      <strong className="text-amber-800">
                        Vui lòng sử dụng thiết bị và trình duyệt này để điểm
                        danh
                      </strong>
                      , không nên dùng thiết bị hoặc trình duyệt khác.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🚫</span>
                  <div>
                    <p className="font-medium text-amber-800 text-sm mb-1">
                      Không nên sử dụng
                    </p>
                    <p className="text-sm text-amber-700">
                      • Trình duyệt ẩn danh (Incognito/Private mode)
                      <br />
                      • Chế độ riêng tư
                      <br />
                      • Đổi profile trình duyệt
                      <br />• Xóa dữ liệu trình duyệt sau khi đăng ký
                      <br />• Đổi trình duyệt khác (Chrome, Firefox, Safari,
                      Edge)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
                <p className="font-medium text-amber-800 text-sm text-center">
                  💡 Lưu ý: Nếu bạn không tuân thủ các quy định trên, bạn có thể
                  không thể tham gia điểm danh và phải đăng ký lại.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
