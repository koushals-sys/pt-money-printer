import type { Organization } from "@/types";

// ─── Extended type ────────────────────────────────────────────────────────────

export interface EnrichedOrganization extends Organization {
  /** Canonical phone from Google Places (replaces NPI phone when present). */
  phone: string;
  website?: string;
  rating?: number;
  /** Weekday hours strings e.g. "Monday: 8:00 AM – 6:00 PM" */
  opening_hours?: string[];
}

// ─── Google Places API types ──────────────────────────────────────────────────

interface TextSearchResult {
  place_id: string;
  name: string;
}

interface TextSearchResponse {
  status: string;
  results: TextSearchResult[];
}

interface PlaceDetailsResult {
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  opening_hours?: {
    weekday_text?: string[];
  };
}

interface PlaceDetailsResponse {
  status: string;
  result?: PlaceDetailsResult;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalises Google's formatted_phone_number "(512) 638-8544" style into our
 * "(NXX) NXX-XXXX" canonical format. Passes through as-is if it doesn't parse.
 */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (local.length !== 10) return raw;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enriches an Organization with data from the Google Places API.
 *
 * Must be called **server-side** — relies on the `GOOGLE_PLACES_API_KEY`
 * environment variable which is intentionally not prefixed with NEXT_PUBLIC_.
 *
 * Never throws; on any failure the original org is returned unchanged.
 *
 * Flow:
 *  1. Text Search  → resolve place_id from org name + city + state
 *  2. Place Details → fetch phone, website, rating, opening_hours
 */
export async function enrichWithGooglePlaces(
  org: Organization
): Promise<EnrichedOrganization> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return org;

  try {
    // Step 1 — Text Search ────────────────────────────────────────────────────
    const query = encodeURIComponent(`${org.name} ${org.city} ${org.state} US`);
    const searchUrl = `${PLACES_BASE}/textsearch/json?query=${query}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      // Prevent Next.js from caching — each call reflects live Place data.
      cache: "no-store",
    });

    if (!searchRes.ok) return org;

    const searchData: TextSearchResponse = await searchRes.json();
    if (searchData.status !== "OK" || !searchData.results.length) return org;

    const placeId = searchData.results[0].place_id;

    // Step 2 — Place Details ──────────────────────────────────────────────────
    const fields = "formatted_phone_number,website,rating,opening_hours";
    const detailsUrl =
      `${PLACES_BASE}/details/json` +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=${fields}` +
      `&key=${apiKey}`;

    const detailsRes = await fetch(detailsUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!detailsRes.ok) return org;

    const detailsData: PlaceDetailsResponse = await detailsRes.json();
    if (detailsData.status !== "OK" || !detailsData.result) return org;

    const place = detailsData.result;

    return {
      ...org,
      // Override NPI phone with the canonical Places phone when available.
      phone: place.formatted_phone_number
        ? normalisePhone(place.formatted_phone_number)
        : org.phone,
      ...(place.website !== undefined && { website: place.website }),
      ...(place.rating !== undefined && { rating: place.rating }),
      ...(place.opening_hours?.weekday_text?.length && {
        opening_hours: place.opening_hours.weekday_text,
      }),
    };
  } catch {
    return org;
  }
}
