/**
 * Device fingerprinting utility for identifying unique devices
 * Uses browser characteristics to create a consistent device ID
 */

export function createDeviceFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Device fingerprint", 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.cookieEnabled ? "cookies" : "no-cookies",
    canvas.toDataURL(),
  ].join("|");

  // Create hash from fingerprint
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = "fkas_device_id";
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    const fingerprint = createDeviceFingerprint();
    deviceId = `device_${fingerprint}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

export function getDeviceId(): string | null {
  return localStorage.getItem("fkas_device_id");
}
