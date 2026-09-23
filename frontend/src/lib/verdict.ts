import type { Tone } from "@/components/ui";
import type { Readiness, CoverageRow, GapRow, ConflictRow, VersionFinding } from "./morpheus";

export type VerdictKind = "READY" | "ATTENTION" | "BLOCKED";

export interface Verdict {
  kind: VerdictKind;
  tone: Tone;
  title: string;
  detail: string;
}

/** Synthesize a single tender-readiness verdict from the audit numbers. */
export function verdictFromReadiness(r?: Readiness): Verdict {
  if (!r) return { kind: "ATTENTION", tone: "neutral", title: "Analysing…", detail: "" };

  const blockers = r.conflicts + r.requirements_missing;
  const attention =
    r.requirements_partial + r.gaps + r.outdated_references + r.unresolved_references;

  if (blockers > 0) {
    return {
      kind: "BLOCKED",
      tone: "danger",
      title: "Action required before tendering",
      detail: `${r.requirements_missing} requirement(s) without a matching standard, ${r.conflicts} conflict(s) in the specification.`,
    };
  }
  if (attention > 0) {
    return {
      kind: "ATTENTION",
      tone: "warning",
      title: "Review recommended",
      detail: `${r.requirements_partial} partially covered, ${r.gaps} potential gap(s), ${r.outdated_references} outdated reference(s).`,
    };
  }
  return {
    kind: "READY",
    tone: "success",
    title: "Ready to tender",
    detail: `All ${r.requirements_total} requirement(s) covered by an applicable standard. No conflicts or gaps found.`,
  };
}

/** Compact chip tone for a saved analysis in a list (uses readiness when available). */
export function verdictChipTone(r?: Readiness): Tone {
  return verdictFromReadiness(r).tone;
}

export interface Action {
  tone: Tone;
  title: string;
  detail?: string;
}

/**
 * Build a plain-language, priority-ranked "Action Required" list.
 * Blockers (missing standards, conflicts) first, then warnings
 * (partial coverage, outdated references, gaps).
 */
export function buildActions(args: {
  coverage?: CoverageRow[];
  conflicts?: ConflictRow[];
  gaps?: GapRow[];
  versions?: VersionFinding[];
}): Action[] {
  const { coverage = [], conflicts = [], gaps = [], versions = [] } = args;
  const blockers: Action[] = [];
  const warnings: Action[] = [];

  for (const c of coverage) {
    if (c.coverage === "MISSING") {
      blockers.push({
        tone: "danger",
        title: `No standard for: ${c.requirement ?? c.requirement_code ?? "a requirement"}`,
        detail: "Add an applicable Indian Standard before this tender can proceed.",
      });
    } else if (c.coverage === "PARTIAL") {
      warnings.push({
        tone: "warning",
        title: `Only partially covered: ${c.requirement ?? c.requirement_code ?? "a requirement"}`,
        detail: c.explanation || "A stronger, directly-applicable standard is recommended.",
      });
    }
  }

  for (const cf of conflicts) {
    blockers.push({
      tone: "danger",
      title: `Conflict in specification: ${cf.parameter}`,
      detail:
        cf.explanation ||
        `${cf.value_a} ${cf.unit_a} (${cf.source_a}) vs ${cf.value_b} ${cf.unit_b} (${cf.source_b}).`,
    });
  }

  for (const v of versions) {
    if (v.discrepancy_type === "OUTDATED" || v.discrepancy_type === "SUPERSEDED") {
      warnings.push({
        tone: "warning",
        title: `Update ${v.is_number ?? "standard"} reference`,
        detail:
          v.note ||
          `Referenced ${v.referenced_version ?? "an older edition"}; current is ${v.current_version ?? "a newer edition"}.`,
      });
    }
  }

  for (const g of gaps) {
    (g.is_mandatory_claim ? blockers : warnings).push({
      tone: g.is_mandatory_claim ? "danger" : "warning",
      title: g.description,
      detail: g.related_standard ? `Related standard: ${g.related_standard}` : undefined,
    });
  }

  return [...blockers, ...warnings];
}
