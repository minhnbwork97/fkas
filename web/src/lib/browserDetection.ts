/**
 * Browser detection utility to identify problematic browsers
 * that may cause issues with payment flows
 */

// Type definitions for webkit APIs
interface WebkitFileSystem {
  name: string;
  root: unknown;
}

interface WebkitRequestFileSystem {
  (
    type: number,
    size: number,
    successCallback: (fs: WebkitFileSystem) => void,
    errorCallback: (error: unknown) => void
  ): void;
}

interface WebkitWindow extends Window {
  webkitRequestFileSystem?: WebkitRequestFileSystem;
  TEMPORARY?: number;
}

export interface BrowserInfo {
  isFacebookBrowser: boolean;
  isZaloBrowser: boolean;
  isIncognito: boolean;
  isProblematic: boolean;
  userAgent: string;
  browserName: string;
}

/**
 * Detects if the current browser is Facebook's in-app browser
 */
function detectFacebookBrowser(userAgent: string): boolean {
  const facebookPatterns = [
    /FBAN/i, // Facebook App
    /FBAV/i, // Facebook App
    /FB_IAB/i, // Facebook In-App Browser
    /FBIOS/i, // Facebook iOS
    /FBAN\/FBIOS/i, // Facebook App iOS
    /Instagram/i, // Instagram (owned by Facebook)
  ];

  return facebookPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Detects if the current browser is Zalo's in-app browser
 */
function detectZaloBrowser(userAgent: string): boolean {
  const zaloPatterns = [/Zalo/i, /ZaloApp/i, /ZaloBrowser/i];

  return zaloPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Detects if the browser is in incognito/private mode
 * This is a best-effort detection as browsers actively try to prevent this
 */
async function detectIncognitoMode(): Promise<boolean> {
  try {
    // Method 1: Check for storage quota
    if ("storage" in navigator && "estimate" in navigator.storage) {
      // In incognito mode, storage quota is typically much lower
      const estimate = await navigator.storage.estimate();
      return (estimate.quota || 0) < 120000000; // Less than 120MB suggests incognito
    }

    // Method 2: Check for indexedDB availability
    if (!window.indexedDB) {
      return true;
    }

    // Method 3: Check for webkitRequestFileSystem (deprecated but still works in some browsers)
    const webkitWindow = window as WebkitWindow;
    if (webkitWindow.webkitRequestFileSystem) {
      return new Promise<boolean>((resolve) => {
        webkitWindow.webkitRequestFileSystem!(
          webkitWindow.TEMPORARY || 0,
          1,
          () => resolve(false), // Success means not incognito
          () => resolve(true) // Error means likely incognito
        );
      });
    }

    // Method 4: Check for specific incognito indicators
    const userAgent = navigator.userAgent;
    const incognitoPatterns = [/Private/i, /Incognito/i, /InPrivate/i];

    if (incognitoPatterns.some((pattern) => pattern.test(userAgent))) {
      return true;
    }

    return false;
  } catch {
    // If we can't determine, assume not incognito to avoid false positives
    return false;
  }
}

/**
 * Gets the browser name from user agent
 */
function getBrowserName(userAgent: string): string {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Opera")) return "Opera";
  return "Unknown";
}

/**
 * Main function to detect browser information
 */
export async function detectBrowser(): Promise<BrowserInfo> {
  const userAgent = navigator.userAgent;
  const isFacebookBrowser = detectFacebookBrowser(userAgent);
  const isZaloBrowser = detectZaloBrowser(userAgent);
  const isIncognito = await detectIncognitoMode();
  const browserName = getBrowserName(userAgent);

  const isProblematic = isFacebookBrowser || isZaloBrowser || isIncognito;

  return {
    isFacebookBrowser,
    isZaloBrowser,
    isIncognito,
    isProblematic,
    userAgent,
    browserName,
  };
}

/**
 * Synchronous version for immediate detection (without incognito detection)
 */
export function detectBrowserSync(): Omit<BrowserInfo, "isIncognito"> {
  const userAgent = navigator.userAgent;
  const isFacebookBrowser = detectFacebookBrowser(userAgent);
  const isZaloBrowser = detectZaloBrowser(userAgent);
  const browserName = getBrowserName(userAgent);

  const isProblematic = isFacebookBrowser || isZaloBrowser;

  return {
    isFacebookBrowser,
    isZaloBrowser,
    isProblematic,
    userAgent,
    browserName,
  };
}
