import type { ClinicProfile, Organization, OrgType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchTier = "strong" | "moderate" | "weak";

export interface MatchResult {
  score: number;       // 0–100
  tier: MatchTier;
  reasons: string[];   // 1–3 human-readable reasons, positive framing
  matchedInjuries: string[];  // which of the clinic's injury types this org covers
}

// ─── Affinity table ───────────────────────────────────────────────────────────
// Maps each injury type → how strongly each org type refers patients for it.
// 3 = primary referral source, 2 = secondary, 1 = occasional.
// Keys are lowercase-normalised for fuzzy matching.

type AffinityLevel = 1 | 2 | 3;

const INJURY_AFFINITY: Record<string, Partial<Record<OrgType, AffinityLevel>>> = {
  "acl tear":        { ortho: 3, sports: 2, hospital: 1, primary_care: 1 },
  "rotator cuff":    { ortho: 3, sports: 2, primary_care: 1 },
  "lower back pain": { primary_care: 3, ortho: 2, hospital: 1 },
  "hip replacement": { ortho: 3, hospital: 2, primary_care: 1 },
  "sports injuries": { sports: 3, ortho: 2, school: 2, primary_care: 1 },
  // Generic fallbacks so custom injury types still produce reasonable scores
  "knee":            { ortho: 3, sports: 2, hospital: 1, primary_care: 1 },
  "shoulder":        { ortho: 3, sports: 2, primary_care: 1 },
  "spine":           { ortho: 3, primary_care: 2, hospital: 1 },
  "neck":            { ortho: 2, primary_care: 3 },
  "ankle":           { ortho: 2, sports: 3, primary_care: 1 },
  "wrist":           { ortho: 3, sports: 1, primary_care: 1 },
};

// Max affinity sum across all 5 default injury types for any org type (ortho = 13).
// Used to normalise type score to 0–45 regardless of how many injury types the clinic has.
const MAX_AFFINITY_PER_INJURY = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lookupAffinity(injury: string, orgType: OrgType): AffinityLevel | 0 {
  const key = injury.toLowerCase();
  if (INJURY_AFFINITY[key]) return INJURY_AFFINITY[key][orgType] ?? 0;
  for (const [k, map] of Object.entries(INJURY_AFFINITY)) {
    if (key.includes(k) || k.includes(key)) {
      return (map as Partial<Record<OrgType, AffinityLevel>>)[orgType] ?? 0;
    }
  }
  return 0;
}

function distanceScore(miles?: number): { points: number; reason: string | null } {
  if (miles === undefined) return { points: 10, reason: null };
  if (miles < 5)   return { points: 30, reason: `${miles.toFixed(1)} mi away — easy commute for referred patients` };
  if (miles < 15)  return { points: 24, reason: `${miles.toFixed(0)} mi away — convenient for most patients` };
  if (miles < 50)  return { points: 16, reason: null };
  if (miles < 200) return { points: 8,  reason: null };
  return               { points: 3,  reason: null };
}

const ORG_TYPE_REASON: Record<OrgType, (injuries: string[]) => string> = {
  ortho:        (inj) => `Orthopedic surgeons are a primary referral source for ${fmt(inj)} post-op patients`,
  sports:       (inj) => `Sports medicine clinics refer athletes needing ${fmt(inj)} rehabilitation`,
  hospital:     (inj) => `Hospital discharge planners route ${fmt(inj)} patients to outpatient PT`,
  primary_care: (inj) => `Primary care physicians are the #1 referral source for musculoskeletal cases like ${fmt(inj)}`,
  school:       (inj) => `School athletic programs refer student injuries including ${fmt(inj)}`,
};

function fmt(arr: string[]): string {
  if (arr.length === 0) return "musculoskeletal";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, 2).join(", ")} and more`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Scores an organization as a potential referral partner for a PT clinic.
 *
 * Score components:
 *   • Specialty alignment  0–45 pts  (injury type affinity)
 *   • Distance             0–30 pts
 *   • Spry connection      0–10 pts
 *   • Outreach opportunity 0–15 pts  (how much headroom is left)
 *
 * Total max = 100.
 */
export function scoreOrg(org: Organization, clinic: ClinicProfile): MatchResult {
  const reasons: string[] = [];

  // ── 1. Specialty alignment ────────────────────────────────────────────────
  let affinitySum = 0;
  const matchedInjuries: string[] = [];
  const maxPossible = clinic.injury_types.length * MAX_AFFINITY_PER_INJURY;

  for (const injury of clinic.injury_types) {
    const level = lookupAffinity(injury, org.type);
    if (level > 0) {
      affinitySum += level;
      matchedInjuries.push(injury);
    }
  }

  const typePoints =
    maxPossible > 0
      ? Math.round((affinitySum / maxPossible) * 45)
      : 0;

  if (matchedInjuries.length > 0) {
    reasons.push(ORG_TYPE_REASON[org.type](matchedInjuries));
  }

  // ── 2. Distance ───────────────────────────────────────────────────────────
  const { points: distPoints, reason: distReason } = distanceScore(org.distance_miles);
  if (distReason) reasons.push(distReason);

  // ── 3. Spry connection ────────────────────────────────────────────────────
  const spryPoints = org.is_on_spry ? 10 : 0;
  if (org.is_on_spry) reasons.push("Already on Spry — referrals can be sent electronically");

  // ── 4. Outreach opportunity ───────────────────────────────────────────────
  const opportunityPoints: Record<string, number> = {
    not_contacted: 15,
    contacted: 10,
    follow_up: 8,
    established: 5,
  };
  const oppPoints = opportunityPoints[org.referral_status] ?? 10;

  // ── Total ─────────────────────────────────────────────────────────────────
  const score = Math.min(100, typePoints + distPoints + spryPoints + oppPoints);
  const tier: MatchTier = score >= 65 ? "strong" : score >= 40 ? "moderate" : "weak";

  return { score, tier, reasons, matchedInjuries };
}

// ─── Convenience: score + sort an array ──────────────────────────────────────

export type ScoredOrg = Organization & { match: MatchResult };

export function scoreAndSort(orgs: Organization[], clinic: ClinicProfile): ScoredOrg[] {
  return orgs
    .map((org) => ({ ...org, match: scoreOrg(org, clinic) }))
    .sort((a, b) => b.match.score - a.match.score);
}
