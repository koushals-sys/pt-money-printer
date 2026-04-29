import type { Organization, OrgType } from "@/types";

// ─── NPI Registry API types ──────────────────────────────────────────────────

interface NpiAddress {
  address_1: string;
  address_2?: string;
  address_purpose: "LOCATION" | "MAILING" | string;
  address_type: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  telephone_number?: string;
  fax_number?: string;
}

interface NpiTaxonomy {
  code: string;
  desc: string;
  taxonomy_group: string;
  primary: boolean;
  state: string | null;
  license: string | null;
}

interface NpiResult {
  number: string;
  enumeration_type: string;
  basic: {
    organization_name: string;
    status: string;
  };
  addresses: NpiAddress[];
  taxonomies: NpiTaxonomy[];
}

interface NpiApiResponse {
  result_count?: number;
  results?: NpiResult[];
  Errors?: { description: string; field: string; number: number }[];
}

// ─── Search params ────────────────────────────────────────────────────────────

export interface NPISearchParams {
  city: string;
  state: string;
  specialty?: string;
  /** Max results per page. NPI max is 200; defaults to 20. */
  limit?: number;
  /** Zero-based offset for pagination. */
  skip?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalises raw NPI phone strings ("512-638-8544" or "5126388544")
 * into "(512) 638-8544".
 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (local.length !== 10) return raw;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

/** Trims 9-digit NPI zip codes ("787451120") to 5 digits ("78745"). */
function formatZip(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : raw;
}

/**
 * Derives our OrgType from the NPI taxonomy desc + group strings.
 * Falls back to "primary_care" which is the broadest catch-all.
 */
function inferOrgType(taxonomies: NpiTaxonomy[]): OrgType {
  const primary = taxonomies.find((t) => t.primary) ?? taxonomies[0];
  if (!primary) return "primary_care";

  const text = `${primary.desc} ${primary.taxonomy_group}`.toLowerCase();

  if (/orthoped|musculoskeletal|joint replacement|spine|physical therap/i.test(text))
    return "ortho";
  if (/sports med|athletic train/i.test(text)) return "sports";
  if (/hospital|acute care|critical care|medical center/i.test(text)) return "hospital";
  if (/school|student|educ|universit|college|academic/i.test(text)) return "school";
  return "primary_care";
}

/**
 * Maps a single NPI API result to our Organization type.
 * Returns null if the address is non-US or the result is inactive.
 */
function mapNpiResult(result: NpiResult): Organization | null {
  if (result.basic.status !== "A") return null;

  // Prefer the LOCATION address; fall back to the first address.
  const addr =
    result.addresses.find((a) => a.address_purpose === "LOCATION") ??
    result.addresses[0];

  if (!addr) return null;
  if (addr.country_code !== "US") return null;

  return {
    id: `npi-${result.number}`,
    name: toTitleCase(result.basic.organization_name),
    type: inferOrgType(result.taxonomies),
    address: toTitleCase(
      addr.address_2
        ? `${addr.address_1}, ${addr.address_2}`
        : addr.address_1
    ),
    city: toTitleCase(addr.city),
    state: addr.state.toUpperCase(),
    zip: formatZip(addr.postal_code),
    phone: addr.telephone_number ? formatPhone(addr.telephone_number) : "",
    fax: addr.fax_number ? formatPhone(addr.fax_number) : "",
    email: "",
    npi_number: result.number,
    is_on_spry: false,
    referral_status: "not_contacted",
  };
}

/** "AUSTIN ORTHOPEDIC GROUP" → "Austin Orthopedic Group" */
function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── SessionStorage cache ─────────────────────────────────────────────────────

function cacheKey(params: NPISearchParams): string {
  return `npi:${params.state}:${params.city}:${params.specialty ?? ""}:${params.limit ?? 20}:${params.skip ?? 0}`;
}

function readCache(key: string): Organization[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Organization[]) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: Organization[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded — skip silently.
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const NPI_ENDPOINT = "/api/npi-search";

/**
 * Searches the CMS NPI Registry for type-2 (organization) providers.
 *
 * Results are cached in sessionStorage for the lifetime of the tab so that
 * repeat searches with the same params don't hit the network.
 *
 * Always returns an array; never throws — API failures surface as empty results.
 */
export async function searchNPIRegistry(
  params: NPISearchParams
): Promise<Organization[]> {
  const key = cacheKey(params);
  const cached = readCache(key);
  if (cached) return cached;

  const query = new URLSearchParams({
    version: "2.1",
    enumeration_type: "NPI-2",
    city: params.city,
    state: params.state,
    limit: String(params.limit ?? 20),
    skip: String(params.skip ?? 0),
  });

  if (params.specialty) {
    query.set("taxonomy_description", params.specialty);
  }

  try {
    const res = await fetch(`${NPI_ENDPOINT}?${query.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];

    const data: NpiApiResponse = await res.json();

    if (!data.results || data.Errors?.length) return [];

    const orgs = data.results
      .map(mapNpiResult)
      .filter((o): o is Organization => o !== null);

    writeCache(key, orgs);
    return orgs;
  } catch {
    return [];
  }
}
