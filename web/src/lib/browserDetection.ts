/**
 * Browser detection utility to identify problematic browsers
 * that may cause issues with payment flows
 */

import { detectIncognito } from "detectincognitojs";

// Type definitions for webkit APIs (kept for potential future use)
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
 * Detects if the browser is in incognito/private mode using detectIncognito.js
 * This is much more reliable than our custom implementation
 */
async function detectIncognitoMode(): Promise<boolean> {
  try {
    const result = await detectIncognito();
    return result.isPrivate;
  } catch (error) {
    console.error("Error detecting incognito mode:", error);
    // If detection fails, assume not incognito to avoid false positives
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
