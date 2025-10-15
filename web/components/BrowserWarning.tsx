"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { detectBrowser, BrowserInfo } from "@/src/lib/browserDetection";

interface BrowserWarningProps {
  onDismiss?: () => void;
  showDismissButton?: boolean;
}

export default function BrowserWarning({
  onDismiss,
  showDismissButton = true,
}: BrowserWarningProps) {
  // Remove unused parameters to avoid linting warnings
  void onDismiss;
  void showDismissButton;
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkBrowser = async () => {
      try {
        const info = await detectBrowser();
        setBrowserInfo(info);
      } catch (error) {
        console.error("Error detecting browser:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkBrowser();
  }, []);

  if (isLoading || !browserInfo || !browserInfo.isProblematic) {
    return null;
  }

  const getWarningMessage = () => {
    if (browserInfo.isFacebookBrowser) {
      return {
        title: "⚠️ Trình duyệt Facebook",
        message:
          "Bạn đang sử dụng trình duyệt trong ứng dụng Facebook. Để hệ thống có thể lưu tài khoản của bạn, vui lòng mở liên kết này trong trình duyệt mặc định của điện thoại (Chrome, Safari).",
        action: "Mở trong trình duyệt mặc định",
      };
    }

    if (browserInfo.isZaloBrowser) {
      return {
        title: "⚠️ Trình duyệt Zalo",
        message:
          "Bạn đang sử dụng trình duyệt trong ứng dụng Zalo. Để hệ thống có thể lưu tài khoản của bạn, vui lòng mở liên kết này trong trình duyệt mặc định của điện thoại (Chrome, Safari).",
        action: "Mở trong trình duyệt mặc định",
      };
    }

    if (browserInfo.isIncognito) {
      return {
        title: "⚠️ Chế độ ẩn danh",
        message:
          "Bạn đang sử dụng chế độ ẩn danh/riêng tư. Hệ thống không thể lưu tài khoản của bạn trong chế độ này. Để có trải nghiệm tốt nhất, vui lòng sử dụng chế độ duyệt thông thường.",
        action: "Mở trong chế độ thông thường",
      };
    }

    return null;
  };

  const warning = getWarningMessage();
  if (!warning) return null;

  return (
    <Card className="border-orange-200 bg-orange-50 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-orange-600 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-orange-800 mb-2">
              {warning.title}
            </h3>

            <p className="text-sm text-orange-700 leading-relaxed">
              {warning.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
