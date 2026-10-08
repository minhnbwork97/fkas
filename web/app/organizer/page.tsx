"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  FileText,
  Plus,
  Users,
} from "lucide-react";

export default function OrganizerPage() {
  const router = useRouter();

  const tileClass =
    "group h-auto justify-start gap-4 px-4 py-4 text-left [&_svg:not([class*='size-'])]:size-5";
  const iconClass =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-700 group-hover:text-white";
  const labelClass = "flex-1 font-display text-lg uppercase tracking-wide";
  const chevronClass =
    "text-gray-400 transition-transform group-hover:translate-x-0.5";

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-semibold">Bảng Điều Khiển Quản Lý</h1>
      <div className="grid gap-3">
        <Button
          className={`${tileClass} bg-floodlight text-pitch-deep hover:bg-floodlight/90 shadow-[inset_0_-3px_0_rgb(0_0_0/0.12)]`}
          onClick={() => router.push("/organizer/create")}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-pitch-deep text-floodlight">
            <Plus />
          </span>
          <span className={labelClass}>Tạo Trận Đấu</span>
          <ChevronRight className="transition-transform group-hover:translate-x-0.5" />
        </Button>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className={tileClass}
            onClick={() => router.push("/organizer/matches")}
          >
            <span className={iconClass}>
              <Calendar />
            </span>
            <span className={labelClass}>Quản Lý Trận Đấu</span>
            <ChevronRight className={chevronClass} />
          </Button>
          <Button
            variant="outline"
            className={tileClass}
            onClick={() => router.push("/organizer/players")}
          >
            <span className={iconClass}>
              <Users />
            </span>
            <span className={labelClass}>Danh Sách Cầu Thủ</span>
            <ChevronRight className={chevronClass} />
          </Button>
          <Button
            variant="outline"
            className={tileClass}
            onClick={() => router.push("/organizer/fund")}
          >
            <span className={iconClass}>
              <DollarSign />
            </span>
            <span className={labelClass}>Quản Lý Quỹ</span>
            <ChevronRight className={chevronClass} />
          </Button>
          <Button
            variant="outline"
            className={tileClass}
            onClick={() => router.push("/organizer/receivables")}
          >
            <span className={iconClass}>
              <FileText />
            </span>
            <span className={labelClass}>Quản Lý Công Nợ</span>
            <ChevronRight className={chevronClass} />
          </Button>
        </div>
      </div>
    </main>
  );
}
