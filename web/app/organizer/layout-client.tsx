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
import { PitchMarkings } from "@/components/PitchMarkings";
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-700 mx-auto mb-4"></div>
          <p className="kit-label text-gray-600">Đang kiểm tra xác thực...</p>
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
    <div className="min-h-screen">
      <header className="pitch-surface relative overflow-hidden sticky top-0 z-50 shadow-[0_4px_0_var(--floodlight)]">
        <PitchMarkings />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top bar with home and logout */}
          <div className="flex items-center justify-between py-3 border-b border-white/15">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-floodlight bg-pitch-deep font-display text-sm font-extrabold text-floodlight"
              >
                FK
              </span>
              <div className="leading-tight">
                <p className="kit-label text-floodlight/90 !text-[0.65rem]">
                  FC Không Giải Tán
                </p>
                <h1 className="text-xl !text-white">Quản Lý FKGT</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white hover:border-white/50"
            >
              <LogOut className="h-4 w-4" />
              Đăng Xuất
            </Button>
          </div>

          {/* Navigation links */}
          <nav className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActiveLink(link.href);
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={`flex items-center gap-2 whitespace-nowrap font-display text-[0.95rem] uppercase tracking-wide ${
                      active
                        ? "bg-floodlight text-pitch-deep shadow-none hover:bg-floodlight/90"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
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
