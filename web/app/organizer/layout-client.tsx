"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Home,
  LogOut,
  Users,
  DollarSign,
  FileText,
  Calendar,
} from "lucide-react";
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

  const navLinks = [
    { href: "/organizer", label: "Trang Chủ", icon: Home },
    { href: "/organizer/matches", label: "Trận Đấu", icon: Calendar },
    { href: "/organizer/players", label: "Cầu Thủ", icon: Users },
    { href: "/organizer/fund", label: "Quỹ Đội", icon: DollarSign },
    { href: "/organizer/receivables", label: "Công Nợ", icon: FileText },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/organizer") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top bar with home and logout */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <h1 className="text-lg font-semibold text-gray-900">
              Quản Lý FKGT
            </h1>
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

          {/* Navigation links */}
          <nav className="flex items-center gap-1 overflow-x-auto py-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActiveLink(link.href);
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={`flex items-center gap-2 whitespace-nowrap ${
                      active
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
