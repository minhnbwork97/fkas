"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  detectBrowser,
  detectBrowserSync,
  BrowserInfo,
} from "@/src/lib/browserDetection";
import BrowserWarning from "@/components/BrowserWarning";

export default function BrowserTestPage() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [syncInfo, setSyncInfo] = useState<Omit<
    BrowserInfo,
    "isIncognito"
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkBrowser = async () => {
      try {
        const asyncInfo = await detectBrowser();
        const syncInfo = detectBrowserSync();
        setBrowserInfo(asyncInfo);
        setSyncInfo(syncInfo);
      } catch (error) {
        console.error("Error detecting browser:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkBrowser();
  }, []);

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Browser Detection Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading browser information...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <BrowserWarning />

      <Card>
        <CardHeader>
          <CardTitle>Browser Detection Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">
                Async Detection (with incognito)
              </h3>
              {browserInfo && (
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Browser:</strong> {browserInfo.browserName}
                  </p>
                  <p>
                    <strong>Facebook Browser:</strong>{" "}
                    {browserInfo.isFacebookBrowser ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Zalo Browser:</strong>{" "}
                    {browserInfo.isZaloBrowser ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Incognito:</strong>{" "}
                    {browserInfo.isIncognito ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Problematic:</strong>{" "}
                    {browserInfo.isProblematic ? "Yes" : "No"}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Sync Detection (no incognito)</h3>
              {syncInfo && (
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Browser:</strong> {syncInfo.browserName}
                  </p>
                  <p>
                    <strong>Facebook Browser:</strong>{" "}
                    {syncInfo.isFacebookBrowser ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Zalo Browser:</strong>{" "}
                    {syncInfo.isZaloBrowser ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Problematic:</strong>{" "}
                    {syncInfo.isProblematic ? "Yes" : "No"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded">
            <h4 className="font-semibold mb-2">User Agent:</h4>
            <code className="text-xs break-all">
              {browserInfo?.userAgent || "Not available"}
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>To test Facebook browser detection:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Open this page in Facebook&apos;s in-app browser</li>
              <li>
                Or modify your user agent to include &quot;FBAN&quot; or
                &quot;FBAV&quot;
              </li>
            </ul>

            <p className="mt-4">
              <strong>To test Zalo browser detection:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Open this page in Zalo&apos;s in-app browser</li>
              <li>Or modify your user agent to include &quot;Zalo&quot;</li>
            </ul>

            <p className="mt-4">
              <strong>To test incognito detection:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Open this page in incognito/private mode</li>
              <li>Note: Incognito detection is not 100% reliable</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
