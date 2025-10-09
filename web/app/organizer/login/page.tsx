"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/src/hooks/useAuth";

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
    <main className="max-w-sm mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Đăng Nhập Quản Lý</CardTitle>
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
          <Button onClick={handleLogin} disabled={!pin.trim()}>
            Tiếp Tục
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
