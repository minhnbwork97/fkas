"use client";

import { useEffect, useState } from "react";
import { detectBrowser, BrowserInfo } from "@/src/lib/browserDetection";
import BrowserWarning from "@/components/BrowserWarning";

interface BrowserBlockingLayoutProps {
  children: React.ReactNode;
}

export default function BrowserBlockingLayout({
  children,
}: BrowserBlockingLayoutProps) {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const checkBrowser = async () => {
      try {
        const info = await detectBrowser();
        setBrowserInfo(info);

        // Block the page if browser is problematic
        if (info.isProblematic) {
          setIsBlocked(true);
        }
      } catch (error) {
        console.error("Error detecting browser:", error);
        // If detection fails, allow access (fail open)
        setIsBlocked(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkBrowser();
  }, []);

  // Show loading state while detecting browser
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra trình duyệt...</p>
        </div>
      </div>
    );
  }

  // If browser is problematic, show only the warning (block page content)
  if (isBlocked && browserInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <BrowserWarning showDismissButton={false} />
        </div>
      </div>
    );
  }

  // If browser is not problematic, show the page content
  return <>{children}</>;
}
