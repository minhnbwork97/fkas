"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrganizerLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // Don't show auth check for login page
  const isLoginPage = pathname === "/organizer/login";

  // Simple authentication check with loading state
  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false); // No loading for login page
      return;
    }

    const checkAuth = () => {
      try {
        const pin = localStorage.getItem("fkas_admin_pin");
        if (!pin) {
          // Use setTimeout to prevent flash
          setTimeout(() => {
            window.location.href = "/organizer/login";
          }, 100);
        } else {
          // Set loading to false only if authenticated
          setTimeout(() => {
            setIsLoading(false);
          }, 50);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setTimeout(() => {
          window.location.href = "/organizer/login";
        }, 100);
      }
    };

    // Add small delay to prevent flash
    setTimeout(checkAuth, 50);
  }, [isLoginPage]);

  const logout = () => {
    try {
      localStorage.removeItem("fkas_admin_pin");
      window.location.href = "/organizer/login";
    } catch (error) {
      console.error("Error removing PIN:", error);
    }
  };

  // Don't render layout for login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/organizer">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Về Trang Chủ
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Đăng Xuất
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
