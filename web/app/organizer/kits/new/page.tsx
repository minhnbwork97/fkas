"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

const PIN_KEY = "fkas_admin_pin";

export default function CreateKitOrderPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [printOnlyPrice, setPrintOnlyPrice] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/kit-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPin: localStorage.getItem(PIN_KEY) || "",
          name,
          description,
          defaultPrice: parseInt(defaultPrice, 10),
          printOnlyPrice: printOnlyPrice ? parseInt(printOnlyPrice, 10) : null,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Lỗi ${res.status}`);
        return;
      }
      toast.success("Đã tạo đợt làm áo");
      router.push(`/organizer/kits/${data.id}`);
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="space-y-1">
        <Link
          href="/organizer/kits"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="size-4" /> Áo đội
        </Link>
        <h1 className="text-2xl font-semibold">Tạo đợt làm áo</h1>
      </div>
      <form
        onSubmit={create}
        className="rounded-xl border bg-white p-4 space-y-4"
      >
        <div className="space-y-1.5">
          <Label>Tên đợt</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD Áo đội 2027"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Giá áo</Label>
            <CurrencyInput
              value={defaultPrice}
              onValueChange={setDefaultPrice}
              placeholder="250.000"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Giá chỉ in</Label>
            <CurrencyInput
              value={printOnlyPrice}
              onValueChange={setPrintOnlyPrice}
              placeholder="Không nhận"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Hạn đăng ký</Label>
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mô tả</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mẫu áo, màu, nhà may... (không bắt buộc)"
          />
        </div>
        <Button type="submit" disabled={isSaving || !defaultPrice}>
          {isSaving ? "Đang tạo..." : "Tạo đợt"}
        </Button>
      </form>
    </main>
  );
}
