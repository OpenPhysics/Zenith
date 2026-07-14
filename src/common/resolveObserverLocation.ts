/**
 * resolveObserverLocation.ts
 *
 * Best-effort "where am I" for the observer-location controls. Tries the browser
 * Geolocation API first (which itself uses GPS / Wi-Fi / cell network and asks the
 * user once); if that is unavailable or fails for a non-permission reason, it falls
 * back to a coarse IP-based lookup that needs no permission. An explicit permission
 * denial is respected — no silent IP fallback in that case.
 *
 * Approximate accuracy is intentional: we only need the observer's rough place on
 * Earth, so `enableHighAccuracy` stays off to keep the request fast and unintrusive.
 */

export type LocationSource = "device" | "network";

export type ResolvedLocation = {
  latitudeDeg: number;
  longitudeDeg: number;
  source: LocationSource;
};

/** Coarse, keyless, CORS-enabled IP-geolocation endpoints, tried in order. */
const IP_ENDPOINTS: ReadonlyArray<{ url: string; parse: (json: unknown) => ResolvedLocation | null }> = [
  {
    url: "https://get.geojs.io/v1/ip/geo.json",
    parse: (json) => coordsFrom(json, "latitude", "longitude"),
  },
  {
    url: "https://ipapi.co/json/",
    parse: (json) => coordsFrom(json, "latitude", "longitude"),
  },
];

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Pulls lat/lon out of a JSON object, accepting numbers or numeric strings. */
const coordsFrom = (json: unknown, latKey: string, lonKey: string): ResolvedLocation | null => {
  if (!json || typeof json !== "object") {
    return null;
  }
  const record = json as Record<string, unknown>;
  const lat = Number(record[latKey]);
  const lon = Number(record[lonKey]);
  if (!(isFiniteNumber(lat) && isFiniteNumber(lon))) {
    return null;
  }
  return { latitudeDeg: lat, longitudeDeg: lon, source: "network" };
};

/** Fetches JSON from `url`, aborting after `timeoutMs`. */
const fetchJson = async (url: string, timeoutMs: number): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

/** Tries each IP endpoint until one yields usable coordinates. */
const resolveViaIp = async (): Promise<ResolvedLocation> => {
  if (typeof fetch === "undefined") {
    throw new Error("fetch unavailable");
  }
  for (const endpoint of IP_ENDPOINTS) {
    try {
      const parsed = endpoint.parse(await fetchJson(endpoint.url, 6000));
      if (parsed) {
        return parsed;
      }
    } catch {
      // Try the next endpoint.
    }
  }
  throw new Error("IP geolocation failed");
};

/** Resolves the observer's approximate location, or rejects if every method fails. */
export const resolveObserverLocation = (): Promise<ResolvedLocation> =>
  new Promise<ResolvedLocation>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolveViaIp().then(resolve, reject);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitudeDeg: position.coords.latitude,
          longitudeDeg: position.coords.longitude,
          source: "device",
        }),
      (error) => {
        // Honor an explicit "no"; otherwise a coarse network lookup is fair game.
        if (error.code === error.PERMISSION_DENIED) {
          reject(error);
        } else {
          resolveViaIp().then(resolve, () => reject(error));
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    );
  });
