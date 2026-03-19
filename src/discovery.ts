import { getDeviceInformation } from "./phone.js";
import type { PhoneAuth } from "./http.js";

export interface PhoneCapabilities {
  model: string;
  firmware?: string;
  protocol: "http" | "https";
  supportsScreenshot: boolean;
  screenshotPaths: string[];
  supportsServiceability: boolean;
  maxStreams: number;
  discoveredAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const capabilityCache = new Map<string, PhoneCapabilities>();

function cacheKey(host: string): string {
  return host.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function looksLikeModel(model: string, prefix: string): boolean {
  return model.toLowerCase().startsWith(prefix.toLowerCase());
}

function determineProtocol(model: string): "http" | "https" {
  if (looksLikeModel(model, "Cisco 98") || looksLikeModel(model, "CP-98")) {
    return "https";
  }
  return "http";
}

function determineScreenshotPaths(model: string): string[] {
  if (looksLikeModel(model, "Cisco 98") || looksLikeModel(model, "CP-98")) {
    return ["/CGI/Screenshot"];
  }
  if (
    looksLikeModel(model, "Cisco 39") ||
    looksLikeModel(model, "CP-39") ||
    looksLikeModel(model, "Cisco 69") ||
    looksLikeModel(model, "CP-69")
  ) {
    return ["/CGI/lcd.bmp"];
  }
  return ["/CGI/Screenshot", "/CGI/ScreenShot", "/CGI/Screenshot.bmp", "/CGI/ScreenShot.bmp"];
}

function determineMaxStreams(model: string): number {
  // 79xx series typically supports 5 streams; most modern phones do as well
  if (looksLikeModel(model, "Cisco 39") || looksLikeModel(model, "CP-39")) {
    return 2;
  }
  return 5;
}

function supportsServiceability(model: string): boolean {
  // 39xx and 69xx lack the CGI/Java/Serviceability endpoint
  if (
    looksLikeModel(model, "Cisco 39") ||
    looksLikeModel(model, "CP-39") ||
    looksLikeModel(model, "Cisco 69") ||
    looksLikeModel(model, "CP-69")
  ) {
    return false;
  }
  return true;
}

export async function discoverPhone(host: string, auth?: PhoneAuth): Promise<PhoneCapabilities> {
  const key = cacheKey(host);

  const cached = capabilityCache.get(key);
  if (cached && Date.now() - cached.discoveredAt < CACHE_TTL_MS) {
    return cached;
  }

  const di = await getDeviceInformation(host, auth);
  const model = di.modelNumber || "Unknown";

  const caps: PhoneCapabilities = {
    model,
    firmware: di.appLoadId || undefined,
    protocol: determineProtocol(model),
    supportsScreenshot: true, // All known models support some form of screenshot
    screenshotPaths: determineScreenshotPaths(model),
    supportsServiceability: supportsServiceability(model),
    maxStreams: determineMaxStreams(model),
    discoveredAt: Date.now(),
  };

  capabilityCache.set(key, caps);
  return caps;
}

/**
 * Get cached capabilities without making a network call.
 * Returns undefined if the phone hasn't been discovered or the cache has expired.
 */
export function getCachedCapabilities(host: string): PhoneCapabilities | undefined {
  const key = cacheKey(host);
  const cached = capabilityCache.get(key);
  if (cached && Date.now() - cached.discoveredAt < CACHE_TTL_MS) {
    return cached;
  }
  if (cached) {
    capabilityCache.delete(key);
  }
  return undefined;
}

/**
 * Clear the discovery cache for a specific host, or all hosts if no host is given.
 */
export function clearDiscoveryCache(host?: string): void {
  if (host) {
    capabilityCache.delete(cacheKey(host));
  } else {
    capabilityCache.clear();
  }
}
