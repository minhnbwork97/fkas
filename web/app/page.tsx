import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Trang Chủ",
  description:
    "Hệ thống quản lý điểm danh và quỹ đội bóng FC Không Giải Tán. Quản lý trận đấu, điểm danh cầu thủ, và theo dõi quỹ đội một cách dễ dàng.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Hướng Dẫn Cho Cầu Thủ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ol className="list-decimal pl-6 space-y-3 text-gray-800">
              <li>
                Bấm vào link điểm danh do quản lý gửi (ví dụ: đường dẫn có dạng
                <span className="mx-1 font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                  /m/[matchId]
                </span>
                ).
              </li>
              <li>
                Nếu chưa có tài khoản: hệ thống sẽ chuyển sang trang đăng ký.
                Bấm nút <span className="font-medium">Tham Gia Đội Bóng</span>{" "}
                và gửi thông tin.
              </li>
              <li>
                Nếu đã có tài khoản: thực hiện điểm danh — chọn trạng thái
                <span className="mx-1">(Tham gia)</span> /
                <span className="mx-1">(Không tham gia)</span> /
                <span className="mx-1">(Chưa quyết định)</span>, thêm khách mời
                nếu có, và xác nhận.
              </li>
            </ol>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <Link href="/join">
                <Button className="w-full" variant="default">
                  Tham Gia Đội Bóng
                </Button>
              </Link>
              <Link href="/">
                <Button className="w-full" variant="outline">
                  Tôi đã có tài khoản
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
