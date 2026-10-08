"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/src/hooks/useAuth";
import { PitchMarkings } from "@/components/PitchMarkings";

export default function OrganizerLoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/organizer");
    }
  }, [isAuthenticated, router]);

  function handleLogin() {
    if (!pin.trim()) {
      setError("Vui lòng nhập mã PIN");
      return;
    }

    const success = login(pin);
    if (success) {
      router.push("/organizer");
    } else {
      setError("Lỗi khi lưu mã PIN");
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6 pt-16 sm:pt-24">
      <Card className="overflow-hidden pt-0">
        <CardHeader className="pitch-surface relative overflow-hidden py-8 border-b-4 border-floodlight">
          <PitchMarkings />
          <p className="relative kit-label text-floodlight">FC Không Giải Tán</p>
          <CardTitle className="relative text-2xl uppercase text-white">
            Đăng Nhập Quản Lý
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="Mã PIN Quản Lý"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={!pin.trim()}
          >
            Tiếp Tục
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
