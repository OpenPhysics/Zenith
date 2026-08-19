/**
 * resolveObserverLocation.test.ts
 *
 * Cross-origin IP lookups must not be attempted under this sim's CSP, or
 * Chromium logs a connect-src violation that Playwright ?fuzz treats as failure.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { canConnectToUrl, resolveObserverLocation } from "../src/common/resolveObserverLocation.js";

describe("canConnectToUrl", () => {
  it("allows same-origin URLs", () => {
    expect(canConnectToUrl(`${location.origin}/anything`)).toBe(true);
  });

  it("rejects the public IP-geolocation hosts", () => {
    expect(canConnectToUrl("https://get.geojs.io/v1/ip/geo.json")).toBe(false);
    expect(canConnectToUrl("https://ipapi.co/json/")).toBe(false);
  });
});

describe("resolveObserverLocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not fetch cross-origin IP endpoints when geolocation is unavailable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { geolocation: undefined });

    await expect(resolveObserverLocation()).rejects.toThrow(/IP geolocation blocked by CSP/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
