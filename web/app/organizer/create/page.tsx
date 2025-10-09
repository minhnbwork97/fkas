"use client";
import { useState } from "react";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function nextSaturdayAt19LocalISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun ... 6=Sat
  const daysUntilSat = (6 - day + 7) % 7 || 7; // if today is Sat, pick next week
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilSat);
  target.setHours(19, 0, 0, 0);
  // Format to yyyy-MM-ddTHH:mm for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = target.getFullYear();
  const mm = pad(target.getMonth() + 1);
  const dd = pad(target.getDate());
  const HH = pad(target.getHours());
  const MM = pad(target.getMinutes());
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
}

export default function CreateMatchPage() {
  const [dateTime, setDateTime] = useState<string>(nextSaturdayAt19LocalISO());
  const [type, setType] = useState<"Internal" | "VsTeam">("Internal");
  const [fieldCost, setFieldCost] = useState<string>("600000");
  const router = useRouter();

  async function createMatch() {
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateTime: new Date(dateTime).toISOString(),
          type,
          fieldCost: parseInt(fieldCost, 10) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`Lỗi tạo trận đấu: ${data.error || res.status}`);
        return;
      }
      toast.success("Đã tạo trận đấu thành công!");
      router.push(`/organizer/matches/${data.id}`);
    } catch (error) {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Tạo Trận Đấu</h1>
      <Card>
        <CardHeader>
          <CardTitle>Chi Tiết Trận Đấu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ngày/Giờ</Label>
            <Input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Loại Trận</Label>
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
          </div>
          <div className="space-y-2">
            <Label>Chi Phí Sân (VND)</Label>
            <Input
              type="number"
              value={fieldCost}
              onChange={(e) => setFieldCost(e.target.value)}
            />
          </div>
          <Button onClick={createMatch}>Tạo Trận Đấu</Button>
        </CardContent>
      </Card>
    </main>
  );
}
