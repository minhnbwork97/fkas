"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function OrganizerPage() {
  const router = useRouter();

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Bảng Điều Khiển Quản Lý</h1>
      <div className="grid gap-4">
        <Button onClick={() => router.push("/organizer/create")}>
          Tạo Trận Đấu
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/organizer/matches")}
        >
          Quản Lý Trận Đấu
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/organizer/players")}
        >
          Danh Sách Cầu Thủ
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/organizer/fund")}
        >
          Quản Lý Quỹ
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/organizer/receivables")}
        >
          Quản Lý Công Nợ
        </Button>
      </div>
    </main>
  );
}
